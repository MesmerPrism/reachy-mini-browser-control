import test from 'node:test';
import assert from 'node:assert/strict';
import { RobotControl, DemoAdapter, ReachyAdapter } from '../server/control.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function fixture() {
  const adapter = new DemoAdapter(); adapter.awake = true;
  const writes = []; const original = adapter.setAntennas.bind(adapter);
  adapter.setAntennas = async pair => { writes.push(pair); await original(pair); };
  return { adapter, control: new RobotControl(adapter), writes };
}
test('manual controls require finite bounded pairs, awake state and current epoch', async () => {
  const { control, adapter, writes } = fixture();
  for (const value of [NaN, Infinity, '1', null, 91, -91]) {
    await assert.rejects(control.command({ action: 'antennas', left: value, right: 0, epoch: 0 }));
  }
  adapter.awake = false;
  await assert.rejects(control.command({ action: 'antennas', left: 1, right: 0, epoch: 0 }), /Wake/);
  assert.equal(writes.length, 0);
  await control.stop();
  await assert.rejects(control.command({ action: 'wake', epoch: 0 }), /Controls changed/);
});
test('left/right is mapped to daemon right/left, and targets coalesce without head/body fields', async () => {
  const { control, writes } = fixture();
  await control.command({ action: 'antennas', left: 12, right: -6, epoch: 0 });
  await control.command({ action: 'antennas', left: 18, right: -12, epoch: 0 });
  await control.worker;
  const last = writes.at(-1);
  assert.ok(Math.abs(last[0] + Math.PI / 15) < 1e-8);
  assert.ok(Math.abs(last[1] - Math.PI / 10) < 1e-8);
  assert.ok(writes.length < 25);
  assert.ok(writes.every(pair => pair.length === 2));
});
test('moving one antenna preserves the other actual angle even outside the UI target range', async () => {
  const { control, adapter, writes } = fixture(); adapter.pair = [2, 0];
  await control.command({ action: 'antennas', left: 6, epoch: 0 }); await control.worker;
  assert.equal(writes.at(-1)[0], 2); assert.ok(Math.abs(writes.at(-1)[1] - Math.PI / 30) < 1e-8);
});
test('Stop drains an in-flight antenna write and discards queued old-generation targets', async () => {
  const { control, adapter, writes } = fixture();
  let release;
  const gate = new Promise(r => { release = r; });
  adapter.setAntennas = async pair => { writes.push(pair); await gate; };
  await control.command({ action: 'antennas', left: 80, right: 80, epoch: 0 });
  await sleep(20);
  const stop = control.stop(); release(); await stop;
  const count = writes.length; await sleep(220);
  assert.equal(writes.length, count); assert.equal(control.pending, null);
  await assert.rejects(control.command({ action: 'antennas', left: 0, right: 0, epoch: 0 }));
});
test('Stop owns and cancels a UUID returned after the Stop click, including sound', async () => {
  const { control, adapter } = fixture(); await control.emotes();
  let release; const gate = new Promise(r => { release = r; }); let playing = false; let cancelled = false; let silenced = false;
  adapter.play = async () => { playing = true; await gate; adapter.moves = [{ uuid: 'late-id' }]; return { uuid: 'late-id' }; };
  adapter.cancel = async uuid => { assert.equal(uuid, 'late-id'); cancelled = true; adapter.moves = []; };
  adapter.silence = async () => { silenced = true; };
  const start = control.command({ action: 'emote', id: control.catalog[0].id, epoch: 0 });
  while (!playing) await sleep(5);
  await control.stop(); release(); await start;
  assert.equal(cancelled, true); assert.equal(silenced, true); assert.equal(control.owned.size, 0);
});
test('another robot actor blocks effects, and arbitrary emote paths are rejected', async () => {
  const { control, adapter, writes } = fixture();
  adapter.moves = [{ uuid: 'foreign' }];
  await assert.rejects(control.command({ action: 'antennas', left: 5, right: 5, epoch: 0 }), /Another motion/);
  assert.equal(writes.length, 0);
  adapter.moves = []; await control.emotes();
  await assert.rejects(control.command({ action: 'emote', id: '../../bad', epoch: 0 }), /available library/);
});
test('lost connection invalidates queued controls once and does not replay them on recovery', async () => {
  const { control, adapter } = fixture(); await control.status();
  const snapshot = adapter.snapshot.bind(adapter);
  adapter.snapshot = async () => { throw Error('offline'); };
  await control.status(); await control.status(); assert.equal(control.epoch, 1);
  adapter.snapshot = snapshot; await control.status();
  await assert.rejects(control.command({ action: 'antennas', left: 5, right: 5, epoch: 0 }), /Controls changed/);
});
test('adapter emits antenna-only FullBodyTarget and treats ignored motion as an error', async () => {
  const adapter = new ReachyAdapter({ robotUrl: 'http://robot.invalid:8000', expectedHardwareId: 'test', expectedVersion: '1.10.0' });
  adapter.request = async (route, method, body) => { assert.equal(route, '/api/move/set_target'); assert.equal(method, 'POST'); assert.deepEqual(body, { target_antennas: [0.1, -0.2] }); return { status: 'ok' }; };
  await adapter.setAntennas([0.1, -0.2]);
  adapter.request = async () => ({ status: 'ignored', reason: 'move_running' });
  await assert.rejects(adapter.setAntennas([0, 0]), /ignored/);
});
test('failed cancellation keeps motion ownership and blocks later controls', async () => {
  const { control, adapter } = fixture(); control.owned.add('unresolved'); adapter.moves = [{ uuid: 'unresolved' }];
  adapter.cancel = async () => { throw Error('cancel offline'); }; adapter.running = async () => { throw Error('read offline'); };
  await assert.rejects(control.stop(), /offline/);
  const state = await control.status(); assert.equal(state.ready, false);
  await assert.rejects(control.command({ action: 'antennas', left: 0, right: 0, epoch: control.epoch }), /confirmed Stop/);
  await control.emotes();
  for (const action of ['emote', 'wake', 'sleep']) {
    await assert.rejects(control.command({ action, id: control.catalog[0].id, epoch: control.epoch }), /confirmed Stop/);
  }
  adapter.cancel = async () => { adapter.moves = []; }; adapter.running = async () => [];
  await control.stop(); assert.equal((await control.status()).ready, true);
});
test('unknown target outcome never yields a confirmed software Stop', async () => {
  const { control, adapter } = fixture(); adapter.uncertain = 'unknown';
  await assert.rejects(control.stop(), /unconfirmed/);
});
test('large antenna travel is smooth even while status snapshots take 120ms', async () => {
  const { control, adapter, writes } = fixture(); const times = [];
  const snapshot = adapter.snapshot.bind(adapter), write = adapter.setAntennas.bind(adapter);
  adapter.snapshot = async () => { await sleep(120); return snapshot(); };
  adapter.setAntennas = async pair => { times.push(performance.now()); await write(pair); };
  await control.command({ action: 'antennas', left: 90, speedLimit: 60, epoch: 0 }); await control.worker;
  assert.ok(writes.length >= 70, '90 degrees should have many small updates, not about nine jumps');
  const positions = [0, ...writes.map(p => p[1] * 180 / Math.PI)];
  assert.ok(positions.slice(1).every((v, i) => v - positions[i] <= 1.21));
  assert.ok(Math.abs(positions.at(-1) - 90) < 0.01);
  assert.ok(Math.max(...times.slice(1).map((t, i) => t - times[i])) < 100, 'slow snapshots must not pause movement frames');
});
test('stalled status monitoring stops a smooth trajectory instead of continuing from stale state', async () => {
  const { control, adapter, writes } = fixture();
  await control.guard(true);
  adapter.snapshot = () => new Promise(() => {});
  control.pending = { left: 90, right: 0, speedLimit: 60, epoch: 0, at: Date.now() };
  await assert.rejects(control.pump(), /stale/);
  assert.ok(writes.length > 0 && writes.length < 50);
});
test('direct mode sends one final destination and monitors measured arrival without resending it', async () => {
  const { control, writes } = fixture();
  await control.command({ action: 'antennas', left: 90, epoch: 0 });
  await control.worker;
  assert.equal(writes.length, 1);
  assert.ok(Math.abs(writes[0][1] - Math.PI / 2) < 1e-8);
  assert.equal(control.holdNeeded, false);
  assert.equal(control.manualGoal, null);
});
test('optional speed limits validate finite degrees/second and scale incremental travel', async () => {
  const { control, writes } = fixture();
  for (const speedLimit of [0, 4, 121, NaN, Infinity, '60', false]) {
    await assert.rejects(control.command({ action: 'antennas', left: 5, speedLimit, epoch: 0 }), /Speed limit/);
  }
  assert.equal(writes.length, 0);
  await control.command({ action: 'antennas', left: 5, speedLimit: 10, epoch: 0 });
  await control.worker;
  const angles = [0, ...writes.map(x => x[1] * 180 / Math.PI)];
  assert.ok(angles.slice(1).every((x, i) => x - angles[i] <= 0.201));
  assert.ok(writes.length >= 25);
});
test('Stop drains a direct destination and holds fresh measured angles instead of the final goal', async () => {
  const { control, adapter, writes } = fixture(); let release;
  const gate = new Promise(r => { release = r; });
  adapter.setAntennas = async pair => { writes.push(pair); if (writes.length === 1) await gate; else adapter.pair = pair; };
  await control.command({ action: 'antennas', left: 90, epoch: 0 });
  adapter.pair = [0.2, 0.3];
  const stopping = control.stop();
  await assert.rejects(control.command({ action: 'antennas', left: 0, epoch: control.epoch }), /confirmed Stop/);
  release(); const result = await stopping;
  assert.ok(Math.abs(writes[1][0] - 0.2) < 1e-8 && Math.abs(writes[1][1] - 0.3) < 1e-8);
  assert.ok(Math.abs(result.antennas.left - 0.3 * 180 / Math.PI) < 1e-8);
  assert.equal(writes.length, 2); assert.equal(control.holdNeeded, false);
  await sleep(100); assert.equal(writes.length, 2);
});
test('failed measured hold locks later commands until a confirmed Stop retry', async () => {
  const { control, adapter } = fixture(); control.holdNeeded = true;
  adapter.setAntennas = async () => { throw Error('hold failed'); };
  await assert.rejects(control.stop(), /hold failed/);
  assert.equal((await control.status()).ready, false);
  await assert.rejects(control.command({ action: 'wake', epoch: control.epoch }), /confirmed Stop/);
  adapter.setAntennas = async pair => { adapter.pair = pair; };
  await control.stop(); assert.equal((await control.status()).ready, true);
});
test('Stop never sends a measured hold that could interfere with a foreign actor', async () => {
  const { control, adapter, writes } = fixture(); control.holdNeeded = true;
  adapter.moves = [{ uuid: 'foreign' }];
  await assert.rejects(control.stop(), /another motion/);
  assert.equal(writes.length, 0); assert.equal(adapter.moves.length, 1);
});
test('an untouched moving antenna keeps its accepted destination when the other side changes', async () => {
  const { control, adapter, writes } = fixture();
  adapter.setAntennas = async pair => { writes.push(pair); };
  await control.command({ action: 'antennas', left: 90, epoch: 0 });
  adapter.pair = [0, 0.2];
  await control.command({ action: 'antennas', right: 20, epoch: 0 });
  await sleep(80);
  assert.ok(Math.abs(writes.at(-1)[1] - Math.PI / 2) < 1e-8);
  await control.stop();
});
test('changing policy during a direct POST starts the new ramp at a fresh measured position', async () => {
  const { control, adapter, writes } = fixture(); let release;
  const gate = new Promise(r => { release = r; });
  adapter.setAntennas = async pair => { writes.push(pair); if (writes.length === 1) await gate; else adapter.pair = pair; };
  await control.command({ action: 'antennas', left: 90, epoch: 0 });
  adapter.pair = [0, Math.PI / 18];
  await control.command({ action: 'antennas', left: 20, speedLimit: 10, epoch: 0 });
  release(); await control.worker;
  const firstLimited = writes[1][1] * 180 / Math.PI;
  assert.ok(firstLimited >= 10 && firstLimited <= 10.201, `new ramp started at ${firstLimited}`);
});
