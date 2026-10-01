export const AGENT_HELP = Object.freeze({
  commands: ['help', 'status', 'capabilities', 'head yaw=2 pitch=-2 roll=0', 'antennas left=10 right=-10', 'stop', 'wake', 'sleep'],
  units: 'Head angles and antennas: degrees. Head x, y, z: millimetres.',
  writes: 'Enable agent commands in this tab first. Commands use the same connection, freshness and motion gates as the controls. No shell execution.',
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
  if (!writesAllowed) throw Error('Agent writes are disabled. Enable them explicitly in this tab.');
  if (!state.connected) throw Error('Connect first.');
  if (command.name !== 'stop' && !state.ready) throw Error('Fresh verified state is required.');
  if (['head', 'antennas'].includes(command.name) && (!state.awake || state.measured?.running)) throw Error('Motion needs an awake robot with no reported running move.');
  return execute(command, state.controlEpoch);
}

export function registerAgentTools(modelContext, run) {
  if (!modelContext?.registerTool) return () => {};
  const controller = new AbortController();
  const registered = [];
  try {
    for (const name of ['help', 'status', 'capabilities']) {
      const toolName = `reachy_${name}`;
      const registration = modelContext.registerTool({ name: toolName, description: `Read Reachy controller ${name}. No robot writes or credentials.`,
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true },
        execute: async () => ({ content: [{ type: 'text', text: JSON.stringify(await run(name)) }] }) }, { signal: controller.signal });
      registration?.catch?.(() => {});
      registered.push(toolName);
    }
  } catch { /* Experimental browser API is optional; the console remains usable. */ }
  return () => { controller.abort(); for (const name of registered) { try { modelContext.unregisterTool?.(name); } catch {} } };
}
