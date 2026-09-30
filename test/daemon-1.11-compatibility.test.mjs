import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ReachyMini } from '@pollen-robotics/reachy-mini-sdk';
import { WirelessControl } from '../src/wireless-control.mjs';
import { installWirelessTelemetryGuard } from '../src/wireless-telemetry.mjs';
import { stateFrame, SYNTHETIC_ID, identityReply, versionReply, motionReply, validateCommand } from './fixtures/daemon-1.11-wire.mjs';

// Replace network/session establishment only. The installed SDK's JSON writer,
// state decoder, command methods, reply handling and teardown remain real.
function harness({ version = '1.11.0', identity = SYNTHETIC_ID, failure = null, now = () => Date.now(), connectionTimeoutMs = 5000 } = {}) {
  const sent = []; let instance;
  class OfflineSdk extends ReachyMini {
    constructor(options) { super(options); instance = this; }
    async authenticate() { return true; }
    async connect() {
      if (failure === 'signaling') throw Error('Synthetic signaling failure');
      this._state = 'connected'; this._robots = [{ id: 'synthetic-robot' }];
    }
    async startSession() {
      if (failure === 'session') throw Error('Synthetic session rejection');
      this._state = 'streaming'; this._dc = { readyState: 'open', close() { this.readyState = 'closed'; }, send: text => {
        const command = JSON.parse(text); assert.equal(validateCommand(command), true, `Unexpected command ${command.type}`); sent.push(command);
        queueMicrotask(() => {
          if (failure === 'silent-identity' && ['get_hardware_id', 'get_version'].includes(command.type)) return;
          if (failure === 'identity-disconnect' && command.type === 'get_hardware_id') { this.disconnect(); return; }
          if (command.type === 'get_version') this._handleRobotMessage(versionReply(version));
          if (command.type === 'get_hardware_id') this._handleRobotMessage(identityReply(identity));
          if (command.type === 'set_volume') this._handleRobotMessage({ status: 'ok', command: 'set_volume', volume: command.volume });
          if (command.type === 'wake_up' || command.type === 'goto_sleep') this._handleRobotMessage(motionReply(command.type, true));
        });
      } };
    }
  }
  const control = new WirelessControl({ ReachyMini: OfflineSdk, expectedVersion: '1.11.0', now, connectionTimeoutMs });
  return { control, sent, Sdk: OfflineSdk, get sdk() { return instance; }, push: frame => instance._handleRobotMessage(JSON.parse(JSON.stringify(frame))) };
}
const degrees = value => value * 180 / Math.PI;
test('public default remains 1.10 and rejects 1.11 through real SDK identity/version replies', async () => {
  const h = harness(); const publicControl = new WirelessControl({ ReachyMini: h.Sdk });
  await assert.rejects(publicControl.connect(), /not supported/); assert.equal(publicControl.expectedVersion, '1.10.0');
  assert.equal(publicControl.sdk, null); assert.equal(h.sdk._dc, null); assert.equal(h.sdk.state, 'disconnected');
  assert.deepEqual(h.sent.map(c => c.type), ['get_hardware_id', 'get_version']);
});
test('candidate accepts exact 1.11 state with optional IMU/DoA absent, null or present', async () => {
  for (const optional of ['absent', 'null', 'present']) {
    const h = harness(); await h.control.connect(); h.push(stateFrame({ yaw: Math.PI / 18, x: 0.005, optional }));
    const result = h.control.snapshot(); assert.equal(result.ready, true); assert.equal(result.hardwareId, SYNTHETIC_ID); assert.equal(result.version, '1.11.0');
    assert.ok(Math.abs(result.measured.head.yaw - 10) < 1e-9); assert.equal(result.measured.head.x, 5);
    assert.ok(Math.abs(result.measured.antennas.right - degrees(0.1)) < 1e-9);
    assert.ok(Math.abs(result.measured.antennas.left - degrees(-0.2)) < 1e-9); await h.control.close();
  }
});
test('null optional pose on first snapshot cannot authorize candidate controls', async () => {
  const h = harness(); await h.control.connect(); const frame = stateFrame(); frame.state.head_pose = null; frame.state.antennas = null; h.push(frame);
  assert.equal(h.control.snapshot().ready, false);
  await assert.rejects(h.control.command({ action: 'wake' }), /Fresh/); await h.control.close();
});
test('actual SDK serialization matches 1.11 partial target, emote and Stop contracts', async () => {
  const h = harness(); await h.control.connect(); h.push(stateFrame());
  const epoch = h.control.snapshot().controlEpoch;
  const result = await h.control.command({ action: 'antennas', targets: { left: 5 }, epoch });
  assert.equal(result.confirmed, false); const target = h.sent.at(-1);
  assert.equal(target.type, 'set_full_target'); assert.equal('head' in target, false); assert.equal('body_yaw' in target, false);
  assert.equal(target.antennas.length, 2);
  const emote = await h.control.command({ action: 'emote', name: 'attentive2', epoch }); assert.equal(emote.confirmed, false);
  assert.deepEqual(h.sent.at(-1), { type: 'play_recorded_move', move_name: 'attentive2' });
  const stopped = await h.control.stop(); assert.equal(stopped.confirmed, false); assert.equal(stopped.holdQueued, true);
  assert.deepEqual(h.sent.slice(-2).map(c => c.type), ['stop_move', 'set_full_target']);
  const held = h.sent.at(-1); assert.deepEqual(held.head, JSON.parse(JSON.stringify(stateFrame().state.head_pose.flat()))); assert.deepEqual(held.antennas, [0.1, -0.2]);
  await assert.rejects(h.control.command({ action: 'antennas', targets: { left: 1 }, epoch }), /expired/); await h.control.close();
});
test('real SDK wake/sleep completion and volume replies resolve candidate acknowledged commands', async () => {
  const h = harness(); await h.control.connect(); h.push(stateFrame({ motorMode: 'disabled' }));
  const wake = await h.control.command({ action: 'wake' }); assert.equal(wake.confirmed, true);
  assert.deepEqual(h.sent.slice(-3).map(c => c.type), ['set_motor_mode', 'wake_up', 'get_state']);
  h.push(stateFrame()); assert.equal((await h.control.command({ action: 'volume', value: 25 })).confirmed, true);
  assert.equal((await h.control.command({ action: 'sleep' })).confirmed, true); await h.control.close();
});
test('version mismatch, absent identity and interrupted identity handshake close candidate', async () => {
  for (const options of [{ version: '1.10.0' }, { version: '1.11.1' }, { identity: null }, { failure: 'identity-disconnect' }]) {
    const h = harness(options); await assert.rejects(h.control.connect(), /not supported/);
    assert.equal(h.control.sdk, null); assert.equal(h.sdk.state, 'disconnected'); assert.equal(h.sdk._dc, null);
    assert.ok(h.sent.every(c => ['get_hardware_id', 'get_version'].includes(c.type)));
  }
});
test('failed synthetic signaling/session setup never sends robot writes or retains session', async () => {
  for (const failure of ['signaling', 'session']) {
    const h = harness({ failure }); await assert.rejects(h.control.connect(), /Synthetic/);
    assert.equal(h.control.sdk, null); assert.equal(h.sdk.state, 'disconnected'); assert.deepEqual(h.sent, []);
  }
});
test('busy activity and malformed rotation decoded by real SDK block candidate commands', async () => {
  const h = harness(); await h.control.connect(); h.push(stateFrame({ moving: true }));
  await assert.rejects(h.control.command({ action: 'head-manual', pose: { yaw: 1 }, epoch: h.control.snapshot().controlEpoch }), /running/);
  await h.control.close();
  const invalid = harness(); await invalid.control.connect(); const frame = stateFrame(); frame.state.head_pose[0][0] = 2; invalid.push(frame);
  assert.equal(invalid.control.snapshot().ready, false); await invalid.control.close();
});
test('guard clears retained SDK pose when later 1.11 nullable pose disappears', async () => {
  const h = harness(); await h.control.connect(); h.push(stateFrame({ x: 0.005 }));
  const frame = stateFrame(); frame.state.head_pose = null; frame.state.antennas = null; h.push(frame);
  assert.equal(h.control.snapshot().ready, false); assert.equal(h.control.snapshot().measured, null); assert.deepEqual(h.sdk.robotState, {});
  await h.control.close();
});
test('guard rejects stale seq on the unordered 1.11 pose stream before SDK merge', async () => {
  const h = harness(); await h.control.connect(); h.push(stateFrame({ yaw: 0.1, seq: 20 })); h.push(stateFrame({ yaw: -0.1, seq: 19 }));
  assert.ok(h.control.snapshot().measured.head.yaw > 0); assert.equal(h.control.snapshot().ready, true); await h.control.close();
});
test('guard audit is locked to the installed npm SDK 1.8.0 and refuses another declared hook version', async () => {
  const manifest = JSON.parse(await readFile(new URL('../node_modules/@pollen-robotics/reachy-mini-sdk/package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.version, '1.8.0');
  assert.throws(() => installWirelessTelemetryGuard({}, { sdkVersion: '1.11.0' }), /audited SDK/);
});
test('missing control fields after a valid state clear readiness and fence queued targets', async () => {
  for (const field of ['head_pose', 'antennas', 'body_yaw', 'motor_mode', 'is_move_running']) {
    const h = harness(); await h.control.connect(); h.push(stateFrame()); const epoch = h.control.snapshot().controlEpoch;
    const frame = stateFrame(); delete frame.state[field]; h.push(frame);
    assert.equal(h.control.snapshot().ready, false); assert.equal(h.control.snapshot().measured, null);
    assert.ok(h.control.snapshot().controlEpoch > epoch);
    await assert.rejects(h.control.command({ action: 'head-manual', pose: { yaw: 1 }, epoch }), /expired/);
    h.push(stateFrame()); assert.equal(h.control.snapshot().ready, true); await h.control.close();
  }
});
test('duplicate pose cannot refresh freshness; poll cannot rewind a current sequenced stream', async () => {
  let time = 0; const h = harness({ now: () => time }); await h.control.connect();
  h.push(stateFrame({ yaw: 0.1, seq: 8 })); time = 500; h.push(stateFrame({ yaw: -0.1 }));
  assert.ok(h.control.snapshot().measured.head.yaw > 0); assert.equal(h.control.snapshot().measured.receivedAt, 0);
  time = 1501; h.push(stateFrame({ yaw: -0.1, seq: 8 })); assert.equal(h.control.snapshot().ready, false);
  h.push(stateFrame({ yaw: -0.1 })); assert.equal(h.control.snapshot().ready, true); assert.ok(h.control.snapshot().measured.head.yaw < 0);
  await h.control.close();
});
test('guard preserves standalone partial pose messages and restores hook after close', async () => {
  const h = harness(); await h.control.connect(); h.push(stateFrame()); const epoch = h.control.snapshot().controlEpoch;
  const guarded = h.sdk._handleRobotMessage;
  h.push({ type: 'head_pose', head_pose: stateFrame({ yaw: -0.1 }).state.head_pose });
  assert.equal(h.control.snapshot().ready, true); assert.equal(h.control.snapshot().controlEpoch, epoch);
  // SDK1.8 itself ignores legacy standalone messages; guard does not invent
  // a partial snapshot or overwrite the last complete command baseline.
  assert.equal(h.control.snapshot().measured.head.yaw, 0);
  const sdk = h.sdk; await h.control.close(); assert.equal(sdk._handleRobotMessage, ReachyMini.prototype._handleRobotMessage);
  guarded.call(sdk, stateFrame()); assert.deepEqual(sdk.robotState, {});
});
test('SDK1.8 optional pose subscription sends no command; standalone messages cannot refresh state', async () => {
  let time = 0; const h = harness({ now: () => time }); await h.control.connect(); h.push(stateFrame());
  const count = h.sent.length; assert.equal(h.control.subscribePose(), false); assert.equal(h.control.unsubscribePose(), false); assert.equal(h.sent.length, count);
  time = 1501;
  h.push({ type: 'head_pose', head_pose: stateFrame().state.head_pose }); h.push({ type: 'head_pose', head_pose: null });
  assert.equal(h.control.snapshot().ready, false); assert.equal(h.control.snapshot().measured.receivedAt, 0);
  await h.control.close();
});
test('silent identity/version peer times out, tears down and cannot admit late replies', async () => {
  const h = harness({ failure: 'silent-identity', connectionTimeoutMs: 10 });
  await assert.rejects(h.control.connect(), /identity and version check timed out/);
  assert.equal(h.control.sdk, null); assert.equal(h.sdk.state, 'disconnected'); assert.equal(h.sdk._token, null); assert.equal(h.sdk._dc, null);
  h.push(identityReply(SYNTHETIC_ID)); h.push(versionReply('1.11.0')); h.push(stateFrame());
  assert.equal(h.control.snapshot().ready, false); assert.equal(h.control.snapshot().hardwareId, null); assert.equal(h.control.snapshot().measured, null);
});
