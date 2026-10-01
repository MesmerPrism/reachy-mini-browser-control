import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentCommand, runAgentCommand, agentStatus, registerAgentTools, createAgentSession } from '../src/agent-console.mjs';
test('bounded console parses partial axes and rejects shell syntax and unsafe values', () => {
  assert.deepEqual(parseAgentCommand('head yaw=2 pitch=-1.5').values, { yaw: 2, pitch: -1.5 });
  for (const text of ['head yaw=21', 'head x=11', 'head yaw=NaN', 'head yaw=Infinity', 'head yaw=2 yaw=3', 'head body=2', 'head', 'wake now', 'status; wake', 'eval alert(1)', 'antennas left=91', 'head yaw=1e1', 'status\nwake']) assert.throws(() => parseAgentCommand(text));
});
test('reads omit credentials and work disconnected; writes require explicit enable and gates', async () => {
  let sends = 0;
  const state = { connected: false, token: 'private', hardwareId: 'private', ready: true, awake: true, controlEpoch: 8 };
  const options = { snapshot: () => state, execute: async () => { sends++; } };
  assert.equal(JSON.stringify(agentStatus(state)).includes('private'), false);
  assert.equal((await runAgentCommand('status', options)).connected, false);
  await assert.rejects(runAgentCommand('wake', options), /disabled/);
  options.writesAllowed = true;
  await assert.rejects(runAgentCommand('stop', options), /Connect/);
  state.connected = true; state.ready = false;
  await assert.rejects(runAgentCommand('head yaw=1', options), /verified/);
  await runAgentCommand('stop', options);
  state.ready = true; state.awake = false;
  await assert.rejects(runAgentCommand('antennas left=1', options), /awake/);
  state.awake = true; state.measured = { running: true };
  await assert.rejects(runAgentCommand('head yaw=1', options), /running/);
  assert.equal(sends, 1);
});
test('console forwards adapter epoch and only the requested axes', async () => {
  let received;
  await runAgentCommand('head roll=2', { writesAllowed: true, snapshot: () => ({ connected: true, ready: true, awake: true, controlEpoch: 42 }), execute: (command, epoch) => { received = { command, epoch }; } });
  assert.deepEqual(received, { command: { name: 'head', values: { roll: 2 }, write: true }, epoch: 42 });
});
test('optional WebMCP registers only read-only tools and cleans up its own registrations', () => {
  const tools = [], removed = [];
  const cleanup = registerAgentTools({ registerTool: t => tools.push(t), unregisterTool: n => removed.push(n) }, async () => ({}));
  assert.deepEqual(tools.map(t => t.name), ['reachy_help', 'reachy_status', 'reachy_capabilities']);
  assert.ok(tools.every(t => t.annotations.readOnlyHint)); cleanup(); assert.deepEqual(removed, tools.map(t => t.name));
});
test('current document WebMCP registration uses AbortSignal without legacy unregisterTool', () => {
  const signals = [];
  const cleanup = registerAgentTools({ registerTool: (_, options) => { signals.push(options.signal); return Promise.resolve(); } }, async () => ({}));
  assert.equal(signals.length, 3); assert.ok(signals.every(signal => !signal.aborted));
  cleanup(); assert.ok(signals.every(signal => signal.aborted));
});

function agentFixture() {
  const state = { connected: true, ready: true, awake: false, controlEpoch: 2, measured: { running: false } };
  const context = { snapshot: () => state, key: 'robot-a', visible: true, disabled: false };
  const sent = [], changes = [];
  let discarded = 0;
  const session = createAgentSession({ context: () => context, execute: (command, epoch) => { sent.push({ command, epoch }); return { queued: true }; }, onChange: value => changes.push(value), onDisarm: () => discarded++ });
  return { state, context, session, sent, changes, discarded: () => discarded };
}

test('explicit Stop remains callable after stale state revokes motion authorization', async () => {
  const f = agentFixture();
  f.session.arm(); f.state.ready = false;
  await f.session.run('stop');
  assert.equal(f.sent[0].command.name, 'stop');
  assert.equal(f.session.isArmed(), false);
  await assert.rejects(f.session.run('wake'), /disabled/);
  assert.equal(f.sent.length, 1);
});

test('callable arm authorizes same-turn wake without moving or requiring an awake robot', async () => {
  const f = agentFixture();
  await assert.rejects(runAgentCommand('wake', { snapshot: () => f.state, execute: () => {} }), /disabled/);
  assert.deepEqual(f.session.arm(), { armed: true, moved: false, woke: false });
  assert.equal(f.sent.length, 0);
  await f.session.run('wake');
  assert.equal(f.sent[0].command.name, 'wake');
  assert.equal(f.sent[0].epoch, 2);
  assert.deepEqual(f.changes, [true]);
  f.session.disarm();
  assert.equal(f.discarded(), 1);
  await assert.rejects(f.session.run('sleep'), /disabled/);
});

test('arming rejects disconnected, stale, hidden, competing controllers and running motion', () => {
  for (const change of [f => f.state.connected = false, f => f.state.ready = false, f => f.context.visible = false, f => f.context.disabled = true, f => f.state.measured.running = true]) {
    const f = agentFixture(); change(f);
    assert.throws(() => f.session.arm(), /Arming needs/);
    assert.equal(f.session.isArmed(), false);
    assert.equal(f.sent.length, 0);
  }
});

test('context and visibility changes synchronously revoke saved authorization before another command', async () => {
  for (const change of [f => f.context.key = 'robot-b', f => f.state.controlEpoch++, f => f.context.visible = false, f => f.context.disabled = true]) {
    const f = agentFixture(); f.state.awake = true; f.session.arm(); change(f);
    await assert.rejects(f.session.run('head yaw=1'), /disabled/);
    assert.equal(f.discarded(), 1);
    assert.deepEqual(f.changes, [true, false]);
    assert.equal(f.sent.length, 0);
  }
});

test('armed API retains bounded grammar and disposal expires saved calls', async () => {
  const f = agentFixture(); f.state.awake = true; f.session.arm();
  await assert.rejects(f.session.run('head yaw=999'), /within/);
  await assert.rejects(f.session.run('eval arbitrary()'), /Unknown/);
  assert.equal(f.sent.length, 0);
  f.session.dispose();
  assert.throws(() => f.session.arm(), /expired/);
  assert.throws(() => f.session.run('status'), /expired/);
});

test('WebMCP exposes explicit consequential arm/disarm/command and stops saved tools after cleanup', async () => {
  const f = agentFixture(), registered = [];
  const cleanup = registerAgentTools({ registerTool: tool => { registered.push(tool); } }, text => f.session.run(text), f.session);
  assert.deepEqual(registered.map(tool => tool.name), ['reachy_help', 'reachy_status', 'reachy_capabilities', 'reachy_arm', 'reachy_disarm', 'reachy_command']);
  const writes = registered.slice(3);
  assert.ok(writes.every(tool => tool.annotations.consequentialHint && !tool.annotations.readOnlyHint));
  const command = registered.find(tool => tool.name === 'reachy_command');
  await assert.rejects(command.execute({ command: 'wake' }), /disabled/);
  await registered.find(tool => tool.name === 'reachy_arm').execute({});
  const canceled = new AbortController(); canceled.abort();
  await assert.rejects(command.execute({ command: 'wake' }, { signal: canceled.signal }), /aborted/);
  assert.equal(f.sent.length, 0);
  await command.execute({ command: 'wake' });
  assert.equal(f.sent.length, 1);
  await assert.rejects(command.execute({ command: 'wake', token: 'secret' }), /arguments/);
  cleanup();
  await assert.rejects(command.execute({ command: 'wake' }), /expired/);
  assert.equal(f.sent.length, 1);
});
