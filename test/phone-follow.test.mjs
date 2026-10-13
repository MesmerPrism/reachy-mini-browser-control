import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhoneFollowGuard, conservativeBaselineReceipt } from '../src/phone-follow.mjs';

const baseline = { yaw: 3, pitch: -2, roll: 1, x: 10, y: 20, z: 30 };
const gates = { held: true, allowed: true, visible: true, demo: true, epoch: 'demo-1' };
const sample = (at, angle = 0, axis = 1) => {
  const quaternion = [0, 0, 0, Math.cos(angle * Math.PI / 360)]; quaternion[axis] = Math.sin(angle * Math.PI / 360);
  return { quaternion, receivedAt: at, sampleAt: at, source: 'fixture' };
};
function armed() {
  const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
  assert.equal(guard.arm(token, sample(100), baseline, { ...gates, now: 100, baselineReceivedAt: 100 }), true);
  return { guard, token };
}

test('phone guard starts disarmed and requires explicit simulation, hold and fresh measured baseline', () => {
  const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
  assert.equal(guard.update(token, sample(100), 100, gates), null);
  for (const overrides of [{ demo: false }, { held: false }, { allowed: false }, { visible: false }, { epoch: 'old' }, { baselineReceivedAt: undefined }, { baselineReceivedAt: -1 }, { baselineReceivedAt: 101 }, { now: 400 }]) {
    assert.equal(guard.arm(token, sample(100), baseline, { ...gates, now: 100, baselineReceivedAt: 100, ...overrides }), false);
    assert.equal(guard.armed, false);
  }
  assert.equal(guard.arm(token, sample(100), { ...baseline, yaw: 21 }, { ...gates, now: 100, baselineReceivedAt: 100 }), false);
});

test('phone follow captures baseline each engagement, slews at 20 degrees/second and only returns rotation', () => {
  const { guard, token } = armed();
  const target = guard.update(token, sample(150, 30), 150, gates);
  assert.deepEqual(target, { yaw: 4, pitch: -2, roll: 1 });
  assert.deepEqual(baseline, { yaw: 3, pitch: -2, roll: 1, x: 10, y: 20, z: 30 });
  guard.disarm();
  assert.equal(guard.arm(token, sample(200, 30), { ...baseline, yaw: -5 }, { ...gates, now: 200, baselineReceivedAt: 200 }), true);
  const next = guard.update(token, sample(250, 30), 250, gates);
  assert.ok(Math.abs(next.yaw + 5) < 1e-8);
});

test('phone target limits hold for yaw pitch and roll with repeated fresh readings', () => {
  for (const [axis, name, sign, cap] of [[1, 'yaw', 1, 20], [0, 'pitch', -1, 15], [2, 'roll', -1, 15]]) {
    const { guard, token } = armed(); let target;
    for (let at = 200; at <= 3100; at += 100) target = guard.update(token, sample(at, sign * 60, axis), at, gates);
    assert.equal(target[name], cap);
  }
});

test('cached readings never emit or renew freshness and loss stays disarmed', () => {
  const { guard, token } = armed();
  assert.equal(guard.update(token, sample(100), 200, gates), null); assert.equal(guard.armed, true);
  assert.equal(guard.update(token, sample(100), 351, gates), null); assert.equal(guard.armed, false);
  assert.equal(guard.update(token, sample(400), 400, gates), null);
});

test('release, gating, context, malformed samples and clock anomalies revoke immediately', () => {
  for (const [reading, now, overrides] of [
    [sample(150), 150, { held: false }], [sample(150), 150, { allowed: false }],
    [sample(150), 150, { visible: false }], [sample(150), 150, { demo: false }],
    [sample(150), 150, { epoch: 'other' }], [null, 150, {}],
    [{ ...sample(150), quaternion: [0, NaN, 0, 1] }, 150, {}],
    [sample(99), 150, {}], [sample(151), 150, {}], [sample(150), NaN, {}],
    [{ ...sample(150), source: 'replacement' }, 150, {}],
    [{ ...sample(150), sampleAt: 99 }, 150, {}], [{ ...sample(150), sampleAt: 151 }, 150, {}],
    [{ ...sample(150), sampleAt: undefined }, 150, {}], [sample(351), 351, {}],
  ]) {
    const { guard, token } = armed();
    assert.equal(guard.update(token, reading, now, { ...gates, ...overrides }), null);
    assert.equal(guard.armed, false);
  }
  const { guard, token } = armed();
  guard.update(token, sample(100), 200, gates);
  assert.equal(guard.update(token, sample(150), 190, gates), null); assert.equal(guard.armed, false);
});

test('wrong or replaced sessions disarm and never replay targets', () => {
  const { guard, token } = armed();
  assert.equal(guard.update(token - 1, sample(150), 150, gates), null); assert.equal(guard.armed, false);
  const current = guard.beginSession('demo-2');
  assert.equal(guard.arm(token, sample(200), baseline, { ...gates, now: 200, baselineReceivedAt: 200 }), false);
  assert.equal(guard.arm(current, sample(200), baseline, { ...gates, epoch: 'demo-2', now: 200, baselineReceivedAt: 200 }), true);
  guard.endSession(); assert.equal(guard.armed, false);
  assert.equal(guard.update(current, sample(250), 250, { ...gates, epoch: 'demo-2' }), null);
});

const pairedSample = (receivedAt, sampleAgeMs, angle = 0) => ({
  quaternion: sample(receivedAt, angle).quaternion, receivedAt, sampleAgeMs, source: 'paired-phone',
});
function armedPair() {
  const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
  assert.equal(guard.arm(token, pairedSample(100, 30), baseline, { ...gates, now: 100, baselineReceivedAt: 100 }), true);
  return { guard, token };
}

test('paired age bounds may vary between fresh packets without becoming synthetic source timestamps', () => {
  const { guard, token } = armedPair();
  assert.deepEqual(guard.update(token, pairedSample(150, 120, 30), 150, gates), { yaw: 4, pitch: -2, roll: 1 });
  // receivedAt-age moved from 70 to 30, but neither is a source timestamp.
  assert.equal(guard.armed, true);
  assert.deepEqual(guard.update(token, pairedSample(200, 10, 30), 200, gates), { yaw: 5, pitch: -2, roll: 1 });
});

test('paired cached samples age from their original receipt and expire at the age deadline', () => {
  const { guard, token } = armedPair(), packet = pairedSample(150, 200, 30);
  assert.notEqual(guard.update(token, packet, 150, gates), null);
  assert.equal(guard.update(token, packet, 175, gates), null); assert.equal(guard.armed, true);
  assert.equal(guard.update(token, packet, 200, gates), null); assert.equal(guard.armed, true);
  assert.equal(guard.update(token, packet, 201, gates), null); assert.equal(guard.armed, false);
  assert.equal(packet.receivedAt, 150); assert.equal(packet.sampleAgeMs, 200);
});

test('paired age bounds reject invalid or missing age, stale transit and backward clocks', () => {
  for (const age of [-1, NaN, Infinity, null, '20', 251]) {
    const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
    assert.equal(guard.arm(token, pairedSample(100, age), baseline, { ...gates, now: 100, baselineReceivedAt: 100 }), false);
  }
  for (const [packet, now] of [
    [pairedSample(150, -1), 150], [pairedSample(150, NaN), 150], [pairedSample(150, undefined), 150],
    [pairedSample(150, 240), 161], [pairedSample(99, 20), 150], [pairedSample(151, 20), 150],
    [pairedSample(150, 20), NaN],
  ]) {
    const { guard, token } = armedPair();
    assert.equal(guard.update(token, packet, now, gates), null); assert.equal(guard.armed, false);
  }
  const { guard, token } = armedPair();
  guard.update(token, pairedSample(100, 30), 150, gates);
  assert.equal(guard.update(token, pairedSample(140, 20), 149, gates), null); assert.equal(guard.armed, false);
});

test('wall receipts convert conservatively without fractional future timestamps or clock rollback', () => {
  // Date.now and performance.now need not share the same fractional precision.
  const converted = conservativeBaselineReceipt(1700000000000, 1700000000000, 2500.2);
  assert.equal(converted, 2499.2);
  assert.ok(converted < 2500.2);
  assert.equal(conservativeBaselineReceipt(1700000000000, 1700000000010, 2500.2), 2489.2);
  for (const args of [
    [1001, 1000, 100], [1000.2, 1000, 100], [NaN, 1000, 100],
    [1000, Infinity, 100], [1000, 1000, NaN], [null, 1000, 100],
    [-1, 1000, 100], [1000, 1000, -1], [0, 1000, 10],
  ]) assert.equal(conservativeBaselineReceipt(...args), null);
});

test('baseline freshness has a separate 1500ms ceiling while sensors retain their 250ms limit', () => {
  const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
  assert.equal(guard.arm(token, sample(2000), baseline, { ...gates, now: 2000, baselineReceivedAt: 500 }), true);
  assert.equal(guard.arm(token, sample(2000), baseline, { ...gates, now: 2000, baselineReceivedAt: 499 }), false);
  assert.equal(guard.arm(token, sample(1749), baseline, { ...gates, now: 2000, baselineReceivedAt: 2000 }), false);
  const withinMargin = conservativeBaselineReceipt(8501, 10000, 2000);
  const outsideMargin = conservativeBaselineReceipt(8500, 10000, 2000);
  assert.equal(guard.arm(token, sample(2000), baseline, { ...gates, now: 2000, baselineReceivedAt: withinMargin }), true);
  assert.equal(guard.arm(token, sample(2000), baseline, { ...gates, now: 2000, baselineReceivedAt: outsideMargin }), false);
  const strict = createPhoneFollowGuard({ baselineMaxAgeMs: 250 }), strictToken = strict.beginSession('demo-1');
  assert.equal(strict.arm(strictToken, sample(2000), baseline, { ...gates, now: 2000, baselineReceivedAt: 1749 }), false);
  for (const baselineMaxAgeMs of [1501, Infinity, NaN, -1, '1500']) {
    assert.throws(() => createPhoneFollowGuard({ baselineMaxAgeMs }), RangeError);
  }
});

test('paired press calibration preserves rotation that happened before the first receiver sample', () => {
  const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
  const reference = [0, 0, 0, 1];
  assert.equal(guard.arm(token, pairedSample(100, 20, 10), baseline,
    { ...gates, now: 100, baselineReceivedAt: 100, reference }), true);
  reference[1] = 1; // The guard owns a normalized copy of press calibration.
  assert.deepEqual(guard.update(token, pairedSample(200, 20, 10), 200, gates), { yaw: 5, pitch: -2, roll: 1 });
  let target;
  for (let at = 300; at <= 700; at += 100) target = guard.update(token, pairedSample(at, 20, 10), at, gates);
  assert.ok(Math.abs(target.yaw - 13) < 1e-8);
});

test('press reference must be a finite unit quaternion and never admits stale actual input', () => {
  const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
  for (const reference of [null, [0, 0, 0, 0], [0, 0, 0, 2], [0, NaN, 0, 1], [0, 0, Infinity, 1], [0, 0, 1]]) {
    assert.equal(guard.arm(token, sample(100), baseline,
      { ...gates, now: 100, baselineReceivedAt: 100, reference }), false);
  }
  assert.equal(guard.arm(token, sample(100), baseline,
    { ...gates, now: 351, baselineReceivedAt: 351, reference: [0, 0, 0, 1] }), false);
  assert.equal(guard.arm(token, pairedSample(351, 251), baseline,
    { ...gates, now: 351, baselineReceivedAt: 351, reference: [0, 0, 0, 1] }), false);
  assert.equal(guard.armed, false);
});

test('a moved first paired packet emits once on the next tick without a second packet or renewed freshness', () => {
  const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1');
  const packet = pairedSample(100, 20, 10);
  assert.equal(guard.arm(token, packet, baseline,
    { ...gates, now: 100, baselineReceivedAt: 100, reference: [0, 0, 0, 1] }), true);
  assert.equal(guard.update(token, packet, 100, gates), null, 'zero elapsed time leaves the packet pending');
  assert.deepEqual(guard.update(token, packet, 125, gates), { yaw: 3.5, pitch: -2, roll: 1 });
  assert.equal(guard.update(token, packet, 150, gates), null);
  assert.equal(guard.update(token, packet, 330, gates), null); assert.equal(guard.armed, true);
  assert.equal(guard.update(token, packet, 331, gates), null); assert.equal(guard.armed, false);
  assert.equal(packet.receivedAt, 100); assert.equal(packet.sampleAgeMs, 20);
});

test('a pending first packet still fails closed when it becomes stale or a gate is revoked before consumption', () => {
  for (const [now, overrides] of [[331, {}], [125, { held: false }], [125, { demo: false }], [99, {}]]) {
    const guard = createPhoneFollowGuard(), token = guard.beginSession('demo-1'), packet = pairedSample(100, 20, 10);
    assert.equal(guard.arm(token, packet, baseline,
      { ...gates, now: 100, baselineReceivedAt: 100, reference: [0, 0, 0, 1] }), true);
    assert.equal(guard.update(token, packet, now, { ...gates, ...overrides }), null);
    assert.equal(guard.armed, false);
  }
});
