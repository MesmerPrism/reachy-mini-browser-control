import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAgentCommand, runAgentCommand, agentStatus, registerAgentTools } from '../src/agent-console.mjs';
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
