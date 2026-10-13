import test from 'node:test';
import assert from 'node:assert/strict';
import { stageTarget, assessStagedTarget, STAGED_TARGET_TIMEOUT_MS } from '../src/staged-target.mjs';

const headRequest = (pose = { yaw: 2 }, epoch = 1) => ({ action: 'head-manual', pose, epoch });
const antennaRequest = (targets = { left: 2 }, epoch = 1) => ({ action: 'antennas', targets, epoch });
const create = (request = headRequest(), now = 1000, previous = null, merge = true) => stageTarget(previous, request, { now, measuredAt: now, merge });
const assess = (target, now, actual = { yaw: 0 }, receivedAt = now, epoch = 1) => assessStagedTarget(target, {
  now, epoch, measured: { receivedAt, head: actual, antennas: actual },
});

test('an unreachable target expires at a fixed deadline despite fresh plateau receipts', () => {
  const target = create(), original = structuredClone(target);
  assert.equal(STAGED_TARGET_TIMEOUT_MS, 15000);
  for (let now = 1050; now < target.deadlineAt; now += 50) assert.equal(assess(target, now), 'send');
  assert.equal(assess(target, target.deadlineAt), 'expired');
  assert.equal(assess(target, target.deadlineAt + 1, { yaw: 2 }), 'expired');
  assert.deepEqual(target, original, 'timer assessment never renews or mutates the stage');
});

test('only deliberate target edits renew the deadline and merge explicit axes in the same epoch', () => {
  const first = create(headRequest({ yaw: 2, pitch: 1 }));
  const edited = create(headRequest({ yaw: 3 }), 14000, first);
  assert.deepEqual(edited.pose, { yaw: 3, pitch: 1 });
  assert.equal(edited.epoch, first.epoch);
  assert.equal(edited.deadlineAt, 29000);
  assert.equal(edited.baselineMeasuredAt, 14000);
  assert.equal(assess(edited, first.deadlineAt, { yaw: 0, pitch: 0 }), 'send');
  assert.equal(assess(edited, edited.deadlineAt), 'expired');
  assert.deepEqual(first.pose, { yaw: 2, pitch: 1 });
  assert.deepEqual(create(headRequest({ yaw: 3 }), 14000, first, false).pose, { yaw: 3 });
});

test('an edit never revives expired or different-context omitted axes', () => {
  const first = create(headRequest({ yaw: 2, pitch: 1 }));
  assert.deepEqual(create(headRequest({ yaw: 3 }), first.deadlineAt, first).pose, { yaw: 3 });
  assert.deepEqual(create(headRequest({ yaw: 3 }, 2), 1100, first).pose, { yaw: 3 });
  assert.deepEqual(create(antennaRequest(), 1100, first).targets, { left: 2 });
  assert.deepEqual(create(headRequest({ yaw: 3 }), 900, first).pose, { yaw: 3 });
  assert.deepEqual(create(antennaRequest({ right: 3 }), 1100, create(antennaRequest())).targets, { left: 2, right: 3 });
});

test('cached and same-millisecond receipts cannot complete a newly staged target', () => {
  const target = create();
  assert.equal(assess(target, 1000, { yaw: 2 }, 1000), 'send');
  assert.equal(assess(target, 1500, { yaw: 2 }, 1000), 'send');
  assert.equal(assess(target, 1500, { yaw: 2 }, 1001), 'converged');
  const edited = create(headRequest(), 1500, target);
  assert.equal(assess(edited, 1501, { yaw: 2 }, 1500), 'send');
  assert.equal(assess(edited, 1501, { yaw: 2 }, 1501), 'converged');
});

test('convergence retains strict 0.1 tolerance and checks every explicitly requested axis only', () => {
  const target = create(headRequest({ yaw: 0, pitch: 0 }));
  assert.equal(assess(target, 1100, { yaw: .099, pitch: -.099, roll: 20 }), 'converged');
  assert.equal(assess(target, 1100, { yaw: .1, pitch: 0 }), 'send');
  assert.equal(assess(target, 1100, { yaw: 0, pitch: -.1 }), 'send');
  const antenna = create(antennaRequest({ left: 0 }));
  assert.equal(assess(antenna, 1100, { left: .099, right: 90 }), 'converged');
  assert.equal(assess(antenna, 1100, { left: .1, right: 0 }), 'send');
});

test('stale telemetry, epoch changes and invalid measurements cannot continue sending', () => {
  const target = create();
  assert.equal(assess(target, 2500, { yaw: 0 }, 1000), 'send');
  assert.equal(assess(target, 2501, { yaw: 0 }, 1000), 'stale');
  assert.equal(assess(target, 1100, { yaw: 2 }, 1100, 2), 'epoch-changed');
  for (const receivedAt of [NaN, Infinity, -1, 1101]) assert.equal(assess(target, 1100, { yaw: 2 }, receivedAt), 'stale');
  for (const yaw of [undefined, NaN, Infinity, -Infinity, '2']) assert.equal(assess(target, 1100, { yaw }), 'invalid');
  assert.equal(assessStagedTarget(target, { now: 1100, epoch: 1 }), 'stale');
});

test('missing, backward and non-finite clocks or epochs fail closed', () => {
  const target = create();
  for (const now of [undefined, NaN, Infinity, -1, 999]) assert.equal(assess(target, now), 'invalid');
  for (const epoch of [NaN, Infinity, -1, 1.5, '1']) assert.equal(assess(target, 1100, { yaw: 0 }, 1100, epoch), 'invalid');
  assert.equal(assessStagedTarget(target), 'invalid');
  assert.throws(() => stageTarget(null, headRequest()), /clock/);
  for (const now of [NaN, Infinity, -1, Number.MAX_VALUE]) assert.throws(() => stageTarget(null, headRequest(), { now, measuredAt: 1000 }), /clock/);
  for (const measuredAt of [undefined, NaN, Infinity, -1, 1001]) assert.throws(() => stageTarget(null, headRequest(), { now: 1000, measuredAt }), /clock/);
  assert.throws(() => stageTarget(null, headRequest(), { now: 2501, measuredAt: 1000 }), /fresh/);
});

test('empty, unknown and non-finite targets are rejected without changing previous intent', () => {
  const target = create(), original = structuredClone(target);
  for (const request of [null, {}, { action: 'wake', epoch: 1 }, headRequest({}), headRequest([]), headRequest({ body_yaw: 1 }),
    headRequest({ yaw: NaN }), headRequest({ yaw: Infinity }), headRequest({ yaw: '2' }), { action: 'head-manual', pose: { yaw: 2 } },
    { action: 'toString', epoch: 1, toString: { yaw: 1 } },
    antennaRequest({ yaw: 1 }), antennaRequest({ left: undefined })]) {
    assert.throws(() => stageTarget(target, request, { now: 1100, measuredAt: 1100 }), /finite/);
  }
  for (const malformed of [null, { ...target, deadlineAt: Infinity }, { ...target, deadlineAt: target.deadlineAt + 1 },
    { ...target, pose: {} }, { ...target, baselineMeasuredAt: 1001 }]) assert.equal(assess(malformed, 1100), 'invalid');
  assert.deepEqual(target, original);
});
