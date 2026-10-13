import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhoneOrientationSource, deviceOrientationToXR, phoneQuaternionToXR } from '../src/phone-orientation.mjs';
import { mapXRHeadPose } from '../src/xr-head-follow.mjs';

const zero = { yaw: 0, pitch: 0, roll: 0 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const rotation = (axis, degrees) => { const q = [0, 0, 0, Math.cos(degrees * Math.PI / 360)]; q[axis] = Math.sin(degrees * Math.PI / 360); return q; };
class Events {
  listeners = new Map();
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type, value = {}) { for (const listener of this.listeners.get(type) ?? []) listener(value); }
  get count() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0); }
}
function fixture({ native = false, permission } = {}) {
  const win = new Events(), doc = new Events(), screen = new Events();
  let time = 100, instance, constructions = 0, starts = 0, stops = 0, permissions = 0;
  doc.visibilityState = 'visible'; screen.angle = 0;
  win.isSecureContext = true; win.screen = { orientation: screen };
  win.DeviceOrientationEvent = class {};
  if (permission) win.DeviceOrientationEvent.requestPermission = () => { permissions++; return permission(); };
  if (native) win.RelativeOrientationSensor = class {
    constructor(options) { constructions++; this.options = options; instance = this; }
    start() { starts++; }
    stop() { stops++; }
  };
  const samples = [], resets = [], statuses = [];
  const source = createPhoneOrientationSource({ window: win, document: doc, now: () => time,
    onSample: sample => samples.push(sample), onReset: reset => resets.push(reset), onStatus: status => statuses.push(status) });
  return { win, doc, screen, samples, resets, statuses, source, setTime: value => { time = value; },
    get sensor() { return instance; }, get counts() { return { constructions, starts, stops, permissions }; },
    event: (overrides = {}) => win.emit('deviceorientation', { alpha: 0, beta: 90, gamma: 0, timeStamp: time, ...overrides }) };
}

test('phone ZXY mapping handles upright portrait, relative heading wrap and axis signs', () => {
  const neutral = deviceOrientationToXR({ alpha: 0, beta: 90, gamma: 0 });
  neutral.forEach((n, i) => close(n, i === 3 ? 1 : 0));
  close(mapXRHeadPose(deviceOrientationToXR({ alpha: 12, beta: 90, gamma: 0 }), neutral, zero).yaw, 12);
  close(mapXRHeadPose(deviceOrientationToXR({ alpha: 0, beta: 80, gamma: 0 }), neutral, zero).pitch, 10);
  close(mapXRHeadPose(deviceOrientationToXR({ alpha: 0, beta: 90, gamma: 8 }), neutral, zero).yaw, 8);
  const wrapped = mapXRHeadPose(deviceOrientationToXR({ alpha: 1, beta: 90, gamma: 0 }), deviceOrientationToXR({ alpha: 359, beta: 90, gamma: 0 }), zero);
  close(wrapped.yaw, 2); close(wrapped.pitch, 0); close(wrapped.roll, 0);
});

test('screen transform gives the same upright neutral and yaw in landscape and portrait', () => {
  const neutral = deviceOrientationToXR({ alpha: 90, beta: 0, gamma: -90 }, 90);
  neutral.forEach((n, i) => close(n, i === 3 ? 1 : 0));
  const moved = deviceOrientationToXR({ alpha: 102, beta: 0, gamma: -90 }, 90);
  close(mapXRHeadPose(moved, neutral, zero).yaw, 12);
  const native = phoneQuaternionToXR(rotation(0, 90));
  const fallback = deviceOrientationToXR({ alpha: 0, beta: 90, gamma: 0 });
  native.forEach((n, i) => close(n, fallback[i]));
  const opposite = deviceOrientationToXR({ alpha: -90, beta: 0, gamma: 90 }, -90);
  opposite.forEach((n, i) => close(n, i === 3 ? 1 : 0));
  // An independently constructed device quaternion Qx(90)Qz(8) is a
  // clockwise screen roll when held upright, not the Euler gamma yaw axis.
  const halfRoll = 8 * Math.PI / 360, h = Math.SQRT1_2;
  const rolled = phoneQuaternionToXR([h * Math.cos(halfRoll), -h * Math.sin(halfRoll), h * Math.sin(halfRoll), h * Math.cos(halfRoll)]);
  close(mapXRHeadPose(rolled, fallback, zero).roll, -8);
});

test('orientation conversion rejects null, missing and nonfinite angles or quaternion', () => {
  for (const alpha of [null, undefined, NaN, Infinity, '0']) assert.equal(deviceOrientationToXR({ alpha, beta: 90, gamma: 0 }), null);
  assert.equal(phoneQuaternionToXR([0, 0, 0, 0]), null);
  assert.equal(phoneQuaternionToXR([0, 0, 0, 1], NaN), null);
});

test('sensor construction is inert; explicit native start emits finite normalized real readings', async () => {
  const f = fixture({ native: true });
  assert.deepEqual(f.counts, { constructions: 0, starts: 0, stops: 0, permissions: 0 });
  assert.equal(f.win.count + f.doc.count + f.screen.count, 0);
  assert.equal(await f.source.startSensors(), true);
  assert.deepEqual(f.sensor.options, { frequency: 30, referenceFrame: 'device' });
  f.sensor.quaternion = rotation(0, 90).map(n => n * 2); f.sensor.timestamp = 100; f.sensor.onreading();
  assert.equal(f.samples.length, 1); close(Math.hypot(...f.samples[0].quaternion), 1);
  assert.equal(f.samples[0].source, 'relative-orientation'); assert.equal(f.samples[0].sampleAt, 100);
  f.setTime(150); f.sensor.onreading();
  assert.equal(f.samples.length, 1, 'cached native timestamp is never restamped');
  const queued = f.sensor.onreading;
  f.source.stopSensors(); queued();
  assert.equal(f.samples.length, 1); assert.equal(f.counts.stops, 1);
  assert.equal(f.win.count + f.doc.count + f.screen.count, 0);
});

test('permission feature probe grants fallback or reports bounded denial without exposing exception data', async () => {
  const granted = fixture({ permission: async () => 'granted' });
  assert.equal(granted.counts.permissions, 0); assert.equal(await granted.source.startSensors(), true);
  granted.event(); assert.equal(granted.samples.length, 1); assert.equal(granted.counts.permissions, 1);
  for (const permission of [async () => 'denied', async () => { throw new Error('private raw text'); }]) {
    const f = fixture({ native: true, permission });
    assert.equal(await f.source.startSensors(), false); assert.equal(f.counts.starts, 0);
    assert.equal(f.statuses.at(-1).state, 'denied'); assert.equal(JSON.stringify(f.statuses).includes('private raw text'), false);
  }
});

test('stop while permission is pending prevents activation and listener installation', async () => {
  let resolve; const f = fixture({ permission: () => new Promise(r => { resolve = r; }) });
  const pending = f.source.startSensors(); f.source.stopSensors(); resolve('granted');
  assert.equal(await pending, false); assert.equal(f.source.active, false); assert.equal(f.win.count + f.doc.count, 0);
});

test('old fallback callbacks and native errors cannot enter a replacement source; blur revokes access', async () => {
  const f = fixture(); await f.source.startSensors();
  const queued = [...f.win.listeners.get('deviceorientation')][0];
  f.source.stopSensors(); await f.source.startSensors();
  queued({ alpha: 0, beta: 90, gamma: 0, timeStamp: 100 });
  assert.equal(f.samples.length, 0);
  f.event(); assert.equal(f.samples.length, 1);
  f.win.emit('blur'); assert.equal(f.source.active, false); assert.equal(f.win.count, 0);
  const native = fixture({ native: true }); await native.source.startSensors();
  const error = native.sensor.onerror; error({ error: { name: 'NotReadableError' } });
  const listenerCount = native.win.count;
  error({ error: { name: 'NotReadableError' } });
  assert.equal(native.win.count, listenerCount);
});

test('native constructor and start errors can fall back without leaving a sensor running', async () => {
  for (const failsAt of ['constructor', 'start']) {
    const f = fixture(); let stopped = 0;
    f.win.RelativeOrientationSensor = class {
      constructor() { if (failsAt === 'constructor') throw new Error('unavailable'); }
      start() { throw new Error('unavailable'); }
      stop() { stopped++; }
    };
    assert.equal(await f.source.startSensors(), true); assert.equal(f.source.source, 'device-orientation');
    assert.equal(stopped, failsAt === 'start' ? 1 : 0); f.event(); assert.equal(f.samples.length, 1);
  }
});

test('native availability failure falls back; permission failure fails closed', async () => {
  const f = fixture({ native: true }); await f.source.startSensors();
  f.sensor.onerror({ error: { name: 'NotReadableError', message: 'private' } });
  assert.equal(f.counts.stops, 1); assert.equal(f.source.source, 'device-orientation');
  f.event(); assert.equal(f.samples.length, 1); assert.ok(f.resets.includes('source'));
  const denied = fixture({ native: true }); await denied.source.startSensors();
  denied.sensor.onerror({ error: { name: 'NotAllowedError' } });
  assert.equal(denied.source.active, false); assert.equal(denied.statuses.at(-1).state, 'denied');
});

test('screen changes invalidate calibration without fabricating a sample; hidden tab stops completely', async () => {
  const f = fixture(); await f.source.startSensors(); f.event();
  f.screen.angle = 90; f.screen.emit('change');
  assert.equal(f.resets.at(-1), 'screen'); assert.equal(f.samples.length, 1);
  f.event(); assert.equal(f.samples.length, 1);
  f.setTime(130); f.event({ alpha: 90, beta: 0, gamma: -90 }); assert.equal(f.samples.length, 2);
  f.doc.visibilityState = 'hidden'; f.doc.emit('visibilitychange');
  assert.equal(f.source.active, false); assert.equal(f.resets.at(-1), 'hidden');
  f.doc.visibilityState = 'visible'; f.doc.emit('visibilitychange'); f.setTime(150); f.event();
  assert.equal(f.samples.length, 2, 'visibility restoration never restarts input');
});

test('invalid, future, stale and backwards readings stop input; unsupported and insecure states are bounded', async () => {
  for (const overrides of [{ alpha: null }, { timeStamp: NaN }, { timeStamp: 101 }, { timeStamp: -1 }]) {
    const f = fixture(); await f.source.startSensors(); f.event(overrides);
    assert.equal(f.source.active, false); assert.equal(f.samples.length, 0);
  }
  const f = fixture(); await f.source.startSensors(); f.event(); f.setTime(99); f.event(); assert.equal(f.source.active, false);
  const stale = fixture(); await stale.source.startSensors(); stale.setTime(400); stale.event({ timeStamp: 100 }); assert.equal(stale.source.active, false);
  const insecure = fixture(); insecure.win.isSecureContext = false; assert.equal(await insecure.source.startSensors(), false);
  const unsupported = fixture(); delete unsupported.win.DeviceOrientationEvent; assert.equal(await unsupported.source.startSensors(), false);
  assert.equal(unsupported.statuses.at(-1).state, 'unsupported'); assert.equal(unsupported.win.count, 0);
});
