import test from 'node:test';
import assert from 'node:assert/strict';
import { WirelessControl } from '../src/wireless-control.mjs';
import { absoluteHeadPose, headAngles } from '../server/head-pose.mjs';

class FakeSdk extends EventTarget {
  static instances = [];
  constructor(options) { super(); this.options = options; this.state = 'disconnected'; this.robots = [{ id: 'robot-1' }]; this.sent = []; this.version = '1.10.0'; this.hardware = 'HW-1'; this._token = 'sdk-memory'; FakeSdk.instances.push(this); }
  async authenticate() { this.authCalls = (this.authCalls ?? 0) + 1; return true; } async connect(token) { this.tokenSeen = token; this.state = 'connected'; } async startSession() { this.state = 'streaming'; }
  async getHardwareId() { return this.hardware; } async getVersion() { return this.version; } requestState() { return true; }
  setTarget(target) { this.sent.push(['target', target]); return true; } sendRaw(command) { this.sent.push([command.type, command]); return true; }
  async wakeUp() { this.sent.push(['wake']); } async gotoSleep() { this.sent.push(['sleep']); }
  async setVolume(value) { return value; } attachVideo() { return () => {}; } subscribePose() { return true; } unsubscribePose() { return true; }
  async stopSession() { this.state = 'connected'; } disconnect() { this.state = 'disconnected'; }
  push(state) { this.robotState = state; this.dispatchEvent(new CustomEvent('state', { detail: state })); }
}
const matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function ready(control) { control.sdk.push({ head: matrix, antennas: [0,0], body_yaw: 0, motor_mode: 'enabled', is_move_running: false }); }
const target = (control, body) => ({ ...body, epoch: control.snapshot().controlEpoch });

test('connect pins the session daemon identity and never retains token state', async () => {
  let time = 0; const control = new WirelessControl({ ReachyMini: FakeSdk, now: () => time });
  const result = await control.connect({ token: 'ephemeral-token' }); ready(control);
  assert.equal(result.hardwareId, 'HW-1'); assert.equal(control.sdk.tokenSeen, 'ephemeral-token'); assert.equal(control.sdk.authCalls, undefined); assert.equal(control.sdk.options.autoStartFromUrl, false); assert.equal('token' in control, false);
  assert.equal(control.snapshot().ready, true); const sdk = control.sdk; await control.close(); assert.equal(sdk._token, null);
});

test('connect attaches video before startSession can emit the initial track and detaches on close', async () => {
  class VideoSdk extends FakeSdk {
    static expectedVideo;
    attachVideo(video) { this.video = video; this.order = [...(this.order ?? []), 'attach']; return () => { this.detached = true; }; }
    async startSession() { this.order = [...(this.order ?? []), 'start']; this.initialTrackDelivered = this.video === VideoSdk.expectedVideo; await super.startSession(); }
  }
  const video = {}; VideoSdk.expectedVideo = video; const control = new WirelessControl({ ReachyMini: VideoSdk });
  await control.connect({ video }); const sdk = control.sdk;
  assert.deepEqual(sdk.order, ['attach', 'start']); assert.equal(sdk.initialTrackDelivered, true);
  await control.close(); assert.equal(sdk.detached, true);
});

test('manual six-axis target is bounded, smoothed, and explicitly queued-only', async () => {
  let time = 10; const control = new WirelessControl({ ReachyMini: FakeSdk, now: () => time }); await control.connect(); ready(control);
  time = 110; const result = await control.command(target(control, { action: 'head-manual', speed: 5, pose: { yaw: 20, pitch: 15, roll: 15, x: 10, y: -10, z: 10 } }));
  assert.deepEqual({ queued: result.queued, confirmed: result.confirmed }, { queued: true, confirmed: false });
  time=160; await control.command(target(control, {action:'head-manual',speed:5,pose:{yaw:20,pitch:15,roll:15,x:10,y:-10,z:10}}));
  const head = control.sdk.sent.at(-1)[1].head; assert.ok(head[3] > 0 && head[3] < .01); assert.ok(head[11] > 0 && head[11] < .01);
  await assert.rejects(control.command(target(control, { action: 'head-manual', pose: { yaw: 21 } })), /exceeds/);
  await assert.rejects(control.command(target(control, { action: 'head-manual', speed: 31, pose: { yaw: 1 } })), /5 to 30/);
});

test('partial head targets preserve boundary-roundoff measurements while explicit limits stay strict', async () => {
  const limits = { yaw: 20, pitch: 15, roll: 15, x: 10, y: 10, z: 10 };
  for (const [axis, limit] of Object.entries(limits)) for (const sign of [-1, 1]) {
    const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect();
    const held = sign * (limit + 4 * Number.EPSILON * limit);
    const input = { yaw: 0, pitch: 0, roll: 0, x: 0, y: 0, z: 0, [axis]: held };
    const pose = absoluteHeadPose(matrix, input.yaw, input.pitch, input.roll, input);
    control.sdk.push({ head: pose, antennas: [0, 0], body_yaw: .23, motor_mode: 'enabled', is_move_running: false });
    const before = control.snapshot().measured.head;
    assert.ok(Math.abs(before[axis]) > limit, `${axis}: fixture crosses the boundary through roundoff`);
    const result = await control.command(target(control, { action: 'head-manual', pose: axis === 'yaw' ? { pitch: 1 } : { yaw: 1 } }));
    assert.equal(result.queued, true);
    assert.deepEqual(control.snapshot().measured.head, before, 'the measured snapshot is never clamped');
    const sent = control.sdk.sent.at(-1)[1];
    const decoded = { ...headAngles(sent.head), x: sent.head[3] * 1000, y: sent.head[7] * 1000, z: sent.head[11] * 1000 };
    assert.ok(Math.abs(decoded[axis] - held) < 1e-11, `${axis}: omitted measured axis is preserved`);
    assert.equal(sent.body_yaw, .23);
    const count = control.sdk.sent.length;
    await assert.rejects(control.command(target(control, { action: 'head-manual', pose: { [axis]: held } })), /exceeds/);
    assert.equal(control.sdk.sent.length, count, 'explicit overshoot cannot queue a frame');
    await control.close();
  }
});

test('materially out-of-range measured head axes still block partial targets without a write', async () => {
  for (const [axis, limit] of Object.entries({ yaw: 20, pitch: 15, roll: 15, x: 10, y: 10, z: 10 })) for (const sign of [-1, 1]) {
    const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect();
    const held = { yaw: 0, pitch: 0, roll: 0, x: 0, y: 0, z: 0, [axis]: sign * (limit + 1e-8) };
    control.sdk.push({ head: absoluteHeadPose(matrix, held.yaw, held.pitch, held.roll, held), antennas: [0, 0], body_yaw: 0, motor_mode: 'enabled', is_move_running: false });
    await assert.rejects(control.command(target(control, { action: 'head-manual', pose: axis === 'yaw' ? { pitch: 1 } : { yaw: 1 } })), /exceeds/);
    assert.equal(control.sdk.sent.length, 0);
    await control.close();
  }
});

test('antenna boundary roundoff preserves the omitted side but never admits explicit or material overshoot', async () => {
  for (const side of ['left', 'right']) for (const sign of [-1, 1]) {
    const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect();
    const held = sign * (90 + 4 * Number.EPSILON * 90);
    const antennas = side === 'right' ? [held * Math.PI / 180, 0] : [0, held * Math.PI / 180];
    const push = () => control.sdk.push({ head: matrix, antennas, body_yaw: 0, motor_mode: 'enabled', is_move_running: false });
    push(); const before = control.snapshot().measured.antennas;
    assert.ok(Math.abs(before[side]) > 90);
    await control.command(target(control, { action: 'antennas', targets: { [side === 'left' ? 'right' : 'left']: 1 } }));
    assert.deepEqual(control.snapshot().measured.antennas, before);
    assert.ok(Math.abs(control.sdk.sent.at(-1)[1].antennas[side === 'right' ? 0 : 1] - antennas[side === 'right' ? 0 : 1]) < 1e-14);
    const count = control.sdk.sent.length;
    await assert.rejects(control.command(target(control, { action: 'antennas', targets: { [side]: held } })), /exceeds/);
    assert.equal(control.sdk.sent.length, count, 'explicit overshoot cannot queue a frame');
    // Once Stop discards the queued reference, the new measured baseline must
    // pass the original material-overshoot check again.
    control.stop(); const afterStop = control.sdk.sent.length;
    antennas[side === 'right' ? 0 : 1] = sign * (90 + 1e-8) * Math.PI / 180; push();
    await assert.rejects(control.command(target(control, { action: 'antennas', targets: { [side === 'left' ? 'right' : 'left']: 1 } })), /exceeds/);
    assert.equal(control.sdk.sent.length, afterStop);
    await control.close();
  }
});

test('requires a fresh awake state and does not issue targets while a move is reported', async () => {
  let time = 0; const control = new WirelessControl({ ReachyMini: FakeSdk, now: () => time }); await control.connect(); ready(control); time = 1501;
  await assert.rejects(control.command(target(control, { action: 'antennas', targets: { left: 1 } })), /Fresh/); ready(control);
  control.sdk.push({ head: matrix, antennas: [0,0], body_yaw: 0, motor_mode: 'enabled', is_move_running: true });
  await assert.rejects(control.command(target(control, { action: 'antennas', targets: { left: 1 } })), /running/);
});

test('Stop fences later targets and queues unconfirmed stop plus measured hold', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control);
  const stopped = await control.command({ action: 'stop' });
  assert.equal(stopped.confirmed, false); assert.equal(stopped.holdQueued, true); assert.deepEqual(control.sdk.sent.map(x => x[0]), ['stop_move', 'target']);
  assert.equal(control.snapshot().controlEpoch, stopped.controlEpoch); await control.close();
});

test('invalid SO3 telemetry never becomes a command baseline, and every write gate is fresh state', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect();
  const invalid = [...matrix]; invalid[0] = 2; control.sdk.push({ head: invalid, antennas: [0,0], body_yaw: 0, motor_mode: 'enabled', is_move_running: false });
  assert.equal(control.snapshot().ready, false);
  for (const input of [{ action: 'wake' }, { action: 'sleep' }, { action: 'volume', value: 5 }, target(control, { action: 'head-manual', pose: { yaw: 1 } }), target(control, { action: 'antennas', targets: { left: 1 } })]) await assert.rejects(control.command(input), /Fresh/);
});

test('failed queue sends never advance smoothing state and asleep Stop does not queue a hold', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control); control.sdk.setTarget = target => { control.sdk.sent.push(['target', target]); return false; };
  const result = await control.command(target(control, { action: 'head-manual', pose: { yaw: 2 } })); assert.equal(result.queued, false); assert.equal(control.lastSent, null);
  control.sdk.push({ head: matrix, antennas: [0,0], body_yaw: 0, motor_mode: 'disabled', is_move_running: false });
  const stopped = await control.command({ action: 'stop' }); assert.equal(stopped.holdQueued, false);
});

test('bounded official emotion names use the daemon 1.10 queued wire command', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control);
  const result = await control.command(target(control, { action: 'emote', name: 'attentive2' }));
  assert.equal(result.queued, true); assert.deepEqual(control.sdk.sent.at(-1), ['play_recorded_move', { type: 'play_recorded_move', move_name: 'attentive2' }]);
  await assert.rejects(control.command(target(control, { action: 'emote', name: 'not-a-library-name' })), /available/);
});

test('Stop invalidates stale target epochs before they can queue a later frame', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control);
  const stale = control.snapshot().controlEpoch; await control.command({ action: 'stop' }); const sent = control.sdk.sent.length;
  await assert.rejects(control.command({ action: 'head-manual', epoch: stale, pose: { yaw: 1 } }), /expired control epoch/);
  assert.equal(control.sdk.sent.length, sent);
});

test('failed acknowledged mutations latch uncertainty until disconnect and never retry', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control); control.sdk.setVolume = async () => null;
  await assert.rejects(control.command({ action: 'volume', value: 10 }), /No valid volume response/);
  assert.match(control.snapshot().uncertain, /volume outcome is unknown/); assert.equal(control.snapshot().ready, false);
  await assert.rejects(control.command(target(control, { action: 'antennas', targets: { left: 1 } })), /Fresh/);
  await control.close(); assert.equal(control.snapshot().uncertain, null);
});

test('version mismatch rejects and closes the session', async () => {
  class BadSdk extends FakeSdk { constructor() { super(); this.version = '1.9.0'; } }
  const control = new WirelessControl({ ReachyMini: BadSdk }); await assert.rejects(control.connect({ token: 'temp' }), /not supported/); assert.equal(control.sdk, null); assert.equal(FakeSdk.instances.at(-1)._token, null);
});

test('rapid target callers cannot accelerate the ramp and delayed ticks cannot catch up', async()=>{
  let time=0;const control=new WirelessControl({ReachyMini:FakeSdk,now:()=>time});await control.connect();ready(control);
  const request=()=>control.command(target(control,{action:'head-manual',pose:{yaw:20},speed:20}));
  await request();time=1;await request();
  let pose=control.sdk.sent.at(-1)[1].head;assert.ok(Math.atan2(pose[4],pose[0])*180/Math.PI<=.020001);
  time=501;ready(control);await request();pose=control.sdk.sent.at(-1)[1].head;
  assert.ok(Math.atan2(pose[4],pose[0])*180/Math.PI<=1.020001);
  await control.close();
});
test('incomplete activity telemetry and backwards clock do not authorize a write',async()=>{
  let time=10;const control=new WirelessControl({ReachyMini:FakeSdk,now:()=>time});await control.connect();
  control.sdk.push({head:matrix,antennas:[0,0],body_yaw:0,motor_mode:'enabled'});assert.equal(control.snapshot().ready,false);
  ready(control);time=9;assert.equal(control.snapshot().ready,false);await assert.rejects(control.command({action:'wake'}),/Fresh/);
  await control.close();
});

test('repeated partial head edits never integrate following error into omitted axes or body yaw', async () => {
  let time = 0;
  const control = new WirelessControl({ ReachyMini: FakeSdk, now: () => time });
  await control.connect(); ready(control);
  for (let i = 0; i < 80; i++) {
    await control.command(target(control, { action: 'head-manual', pose: { yaw: 10 } }));
    const sent = control.sdk.sent.at(-1)[1];
    assert.equal(sent.head[7], 0, 'unrequested translation keeps its queued reference');
    assert.equal(sent.body_yaw, 0, 'unrequested body yaw keeps its queued reference');
    // Feed back a persistent 0.2 mm following error relative to each command.
    // Copying each measurement into the next target accumulates to the limit.
    const measured = [...sent.head]; measured[7] += .0002;
    time += 50;
    control.sdk.push({ head: measured, antennas: [0,0], body_yaw: .001, motor_mode: 'enabled', is_move_running: false });
  }
  assert.equal(control.snapshot().measured.head.y, .2, 'actual feedback remains distinct');
  await control.close();
});

test('partial antenna edits keep the omitted queued target despite following error', async () => {
  let time = 0; const control = new WirelessControl({ ReachyMini: FakeSdk, now: () => time });
  await control.connect(); ready(control);
  await control.command(target(control, { action: 'antennas', targets: { left: 30 } }));
  time += 50;
  control.sdk.push({ head: matrix, antennas: [.01,0], body_yaw: 0, motor_mode: 'enabled', is_move_running: false });
  await control.command(target(control, { action: 'antennas', targets: { left: 30 } }));
  assert.equal(control.sdk.sent.at(-1)[1].antennas[0], 0);
  await control.close();
});

test('tab suspension retains the session, stops active targets once, and requires new foreground telemetry and intent', async () => {
  let time = 0; const control = new WirelessControl({ ReachyMini: FakeSdk, now: () => time });
  await control.connect(); ready(control);
  const sdk = control.sdk;
  await control.command(target(control, { action: 'head-manual', pose: { yaw: 10 } }));
  const epoch = control.snapshot().controlEpoch;
  control.suspend(); const sent = sdk.sent.length;
  assert.equal(control.sdk, sdk); assert.equal(control.snapshot().connected, true);
  assert.equal(control.snapshot().ready, false); assert.equal(control.snapshot().suspended, true);
  assert.equal(sdk.sent.at(-2)[0], 'stop_move');
  control.suspend(); assert.equal(sdk.sent.length, sent, 'blur followed by hidden cannot repeat Stop');
  ready(control); assert.equal(control.snapshot().ready, false, 'background packets cannot enable controls');
  control.resume(); assert.equal(control.snapshot().ready, false, 'background telemetry is discarded');
  await assert.rejects(control.command({ action: 'head-manual', pose: { yaw: 10 }, epoch }), /expired/);
  await assert.rejects(control.command(target(control, { action: 'head-manual', pose: { yaw: 10 } })), /Fresh/);
  assert.equal(sdk.sent.length, sent, 'resume issues no motor writes or replay');
  time += 50; ready(control); assert.equal(control.snapshot().ready, true);
  await control.command(target(control, { action: 'head-manual', pose: { yaw: -5 } }));
  assert.equal(control.sdk.sent.at(-1)[1].head[4], 0, 'fresh input starts a new ramp');
  await control.close();
});

test('idle tab suspension sends no motor writes and preserves uncertain outcome locks', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control);
  control.sdk.setVolume = async () => null;
  await assert.rejects(control.command({ action: 'volume', value: 10 }));
  const before = control.sdk.sent.length;
  control.suspend(); control.resume(); ready(control);
  assert.equal(control.sdk.sent.length, before);
  assert.match(control.snapshot().uncertain, /volume outcome is unknown/);
  assert.equal(control.snapshot().ready, false);
  await control.close();
});

test('an explicit full center request can recover an out-of-range measured baseline at the existing slew limit', async () => {
  let time = 0; const control = new WirelessControl({ ReachyMini: FakeSdk, now: () => time });
  await control.connect();
  const outside = absoluteHeadPose(matrix, 0, 0, 0, { x: 0, y: 12.5, z: -11.2 });
  control.sdk.push({ head: outside, antennas: [0,0], body_yaw: .1, motor_mode: 'enabled', is_move_running: false });
  await assert.rejects(control.command(target(control, { action: 'head-manual', pose: { yaw: 1 } })), /\(y, z\)/);
  assert.equal(control.sdk.sent.length, 0);
  const center = () => control.command(target(control, { action: 'head-manual', pose: { yaw: 0, pitch: 0, roll: 0, x: 0, y: 0, z: 0 } }));
  await center(); assert.deepEqual(control.sdk.sent.at(-1)[1].head, outside, 'first frame cannot jump');
  time = 50; await center();
  const next = control.sdk.sent.at(-1)[1].head;
  assert.ok(next[7] < outside[7] && next[11] > outside[11]);
  assert.ok(Math.hypot(next[7] - outside[7], next[11] - outside[11]) <= .00050000001);
  assert.equal(control.sdk.sent.at(-1)[1].body_yaw, .1);
  await control.close();
});

test('tab-away cannot interrupt an in-flight Sleep with an old manual hold', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control);
  await control.command(target(control, { action: 'head-manual', pose: { yaw: 5 } }));
  let finishSleep; control.sdk.gotoSleep = () => new Promise(resolve => { finishSleep = resolve; });
  const sleeping = control.command({ action: 'sleep' }); const count = control.sdk.sent.length;
  control.suspend({ stopMotion: true });
  assert.equal(control.sdk.sent.length, count, 'power transition is not cancelled or given a measured hold');
  finishSleep(); await sleeping;
  assert.equal(control.snapshot().ready, false);
  await control.close();
});

test('tab-away does not interrupt an emote or another reported move through stale manual references', async () => {
  const control = new WirelessControl({ ReachyMini: FakeSdk }); await control.connect(); ready(control);
  await control.command(target(control, { action: 'head-manual', pose: { yaw: 5 } }));
  await control.command(target(control, { action: 'emote', name: 'attentive1' }));
  const afterEmote = control.sdk.sent.length;
  control.suspend(); assert.equal(control.sdk.sent.length, afterEmote);
  control.resume(); ready(control);
  control.sdk.push({ head: matrix, antennas: [0,0], body_yaw: 0, motor_mode: 'enabled', is_move_running: true });
  const count = control.sdk.sent.length;
  control.suspend(); assert.equal(control.sdk.sent.length, count);
  await control.close();
});
