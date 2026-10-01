export const AGENT_HELP = Object.freeze({
  commands: ['help', 'status', 'capabilities', 'head yaw=2 pitch=-2 roll=0', 'antennas left=10 right=-10', 'stop', 'wake', 'sleep'],
  units: 'Head angles and antennas: degrees. Head x, y, z: millimetres.',
  writes: 'Call window.reachyAgent.arm() explicitly before motion or power commands. Explicit Stop on the active connection needs no arm. Arming does not connect, wake or move. Disarm revokes agent writes and discards unsent targets; it is not Stop. Commands use the same connection, freshness and motion gates as the controls. No shell execution.',
});
const reads = new Set(['help', 'status', 'capabilities']);
const limits = { head: { yaw: 20, pitch: 15, roll: 15, x: 10, y: 10, z: 10 }, antennas: { left: 90, right: 90 } };
export function parseAgentCommand(text) {
  if (typeof text !== 'string' || text.length > 512) throw Error('Enter one command, up to 512 characters.');
  const [name, ...args] = text.trim().split(/\s+/);
  if (reads.has(name) || ['stop', 'wake', 'sleep'].includes(name)) {
    if (args.length) throw Error(`${name} takes no arguments.`);
    return { name, write: !reads.has(name) };
  }
  if (!limits[name]) throw Error('Unknown command. Run help for available commands.');
  if (!args.length) throw Error(`${name} needs at least one axis=value.`);
  const values = {};
  for (const arg of args) {
    const match = /^([a-z]+)=(-?(?:\d+(?:\.\d*)?|\.\d+))$/.exec(arg);
    if (!match || !Object.hasOwn(limits[name], match[1]) || Object.hasOwn(values, match[1])) throw Error('Use distinct supported axis=value arguments.');
    const [, axis, number] = match, value = Number(number);
    if (!Number.isFinite(value) || Math.abs(value) > limits[name][axis]) throw Error(`${axis} must be within ±${limits[name][axis]}.`);
    values[axis] = value;
  }
  return { name, values, write: true };
}
// Status omits tokens, account data and hardware/network identifiers. It is a
// read of the current adapter snapshot, never a new daemon request.
export function agentStatus(snapshot = {}) {
  const measured = snapshot.measured;
  return { connected: snapshot.connected === true, ready: snapshot.ready === true, awake: snapshot.awake === true,
    version: snapshot.version ?? null, controlEpoch: snapshot.controlEpoch ?? null,
    measured: measured ? { head: { ...measured.head }, antennas: { ...measured.antennas }, bodyYaw: measured.bodyYaw,
      running: measured.running, receivedAt: measured.receivedAt } : null };
}
export async function runAgentCommand(text, { snapshot, writesAllowed = false, execute }) {
  const command = parseAgentCommand(text);
  const state = snapshot();
  if (command.name === 'help') return AGENT_HELP;
  if (command.name === 'status') return agentStatus(state);
  if (command.name === 'capabilities') return { ...AGENT_HELP, autoWake: false, autoReconnect: false,
    writesEnabled: writesAllowed, targetAcknowledgement: state.targetAcknowledgement ?? 'adapter-dependent',
    webxr: 'Use the WebXR section; requires a supported browser and explicit session start.' };
  // Explicit Stop remains available when telemetry loss revokes motion writes.
  if (!writesAllowed && command.name !== 'stop') throw Error('Agent writes are disabled. Arm them explicitly for this connection.');
  if (!state.connected) throw Error('Connect first.');
  if (command.name !== 'stop' && !state.ready) throw Error('Fresh verified state is required.');
  if (['head', 'antennas'].includes(command.name) && (!state.awake || state.measured?.running)) throw Error('Motion needs an awake robot with no reported running move.');
  return execute(command, state.controlEpoch);
}

export function createAgentSession({ context, execute, onChange = () => {}, onDisarm = () => {} }) {
  let armed = null, active = true;
  function disarm() {
    const hadWrites = armed !== null;
    armed = null;
    if (hadWrites) { onDisarm(); onChange(false); }
    return { armed: false, stopped: false };
  }
  function checked() {
    if (!active) throw Error('Agent controller context expired.');
    const c = context(), state = c.snapshot();
    const eligible = !c.disabled && c.visible !== false && state.connected === true && state.ready === true && !state.measured?.running;
    if (armed && (!eligible || armed.key !== c.key || armed.epoch !== state.controlEpoch)) disarm();
    return { c, state, eligible };
  }
  function arm() {
    const { c, state, eligible } = checked();
    if (!eligible) throw Error('Arming needs a visible tab and a fresh admitted connection, with no busy operation, tracking, XR or running move.');
    // Set authorization before notifying React: arm(); run() in one turn must
    // not depend on a render completing between those calls.
    armed = { key: c.key, epoch: state.controlEpoch };
    onChange(true);
    return { armed: true, moved: false, woke: false };
  }
  return Object.freeze({
    arm, disarm,
    isArmed: () => { checked(); return armed !== null; },
    run: text => {
      const { c } = checked();
      return runAgentCommand(text, { snapshot: c.snapshot, execute, writesAllowed: armed !== null });
    },
    dispose: () => { disarm(); active = false; },
  });
}

export function registerAgentTools(modelContext, run, { arm, disarm } = {}) {
  if (!modelContext?.registerTool) return () => {};
  const controller = new AbortController();
  const registered = [];
  try {
    const names = ['help', 'status', 'capabilities', ...(arm && disarm ? ['arm', 'disarm', 'command'] : [])];
    for (const name of names) {
      const toolName = `reachy_${name}`;
      const readOnly = reads.has(name);
      const description = readOnly ? `Read Reachy controller ${name}. No robot writes or credentials.`
        : name === 'arm' ? 'Explicitly authorize bounded agent commands for this current connection. Later commands can cause physical movement. Arming itself does not connect, wake or move.'
        : name === 'disarm' ? 'Revoke agent write authorization and discard unsent targets. This does not Stop physical movement or cancel an in-flight robot command.'
        : 'Run one bounded Reachy command. Motion and power commands can wake, sleep or physically move the robot and require explicit arm first. Stop remains available on the active connection without arming. No shell, authentication or connection commands. Angles: degrees; head x/y/z: millimetres.';
      const registration = modelContext.registerTool({ name: toolName, description,
        inputSchema: { type: 'object', properties: name === 'command' ? { command: { type: 'string', maxLength: 512, description: 'One existing console command; use reachy_help for grammar.' } } : {}, ...(name === 'command' ? { required: ['command'] } : {}), additionalProperties: false },
        annotations: { readOnlyHint: readOnly, ...(!readOnly ? { consequentialHint: true } : {}) },
        execute: async (input = {}, execution = {}) => {
          if (controller.signal.aborted || execution?.signal?.aborted) throw Error('Agent tool context expired or execution was aborted.');
          if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => name !== 'command' || key !== 'command')) throw Error('Unsupported tool arguments.');
          const result = name === 'arm' ? arm() : name === 'disarm' ? disarm() : await run(name === 'command' ? input.command : name);
          if (controller.signal.aborted) throw Error('Agent tool context expired.');
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } }, { signal: controller.signal });
      registration?.catch?.(() => {});
      registered.push(toolName);
    }
  } catch { /* Experimental browser API is optional; the console remains usable. */ }
  return () => { controller.abort(); for (const name of registered) { try { modelContext.unregisterTool?.(name); } catch {} } };
}
