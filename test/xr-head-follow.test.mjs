import test from 'node:test';
import assert from 'node:assert/strict';
import { mapXRHeadPose, createXRHeadFollowGuard, XR_HEAD_LIMITS, xrStopAllowed } from '../src/xr-head-follow.mjs';
const neutral = [0, 0, 0, 1], baseline = { yaw: 3, pitch: -2, roll: 1 };
const rotation = (axis, degrees) => { const q = [0, 0, 0, Math.cos(degrees * Math.PI / 360)]; q[axis] = Math.sin(degrees * Math.PI / 360); return q; };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);
test('XR disarm can stop only its admitted robot context, once engaged, and never a replacement or demo', () => {
  assert.equal(xrStopAllowed(true, true, 'old', 'old', false), true);
  assert.equal(xrStopAllowed(true, true, 'old', 'new', false), false);
  assert.equal(xrStopAllowed(true, false, 'old', 'old', false), false);
  assert.equal(xrStopAllowed(false, true, 'old', 'old', false), false);
  assert.equal(xrStopAllowed(true, true, 'old', 'old', true), false);
});
test('XR head relative pose preserves baseline and maps robot axis signs', () => {
  assert.deepEqual(mapXRHeadPose(neutral, neutral, baseline), baseline);
  close(mapXRHeadPose(rotation(1, 10), neutral, baseline).yaw, 13);
  close(mapXRHeadPose(rotation(0, 10), neutral, baseline).pitch, -12);
  close(mapXRHeadPose(rotation(2, 10), neutral, baseline).roll, -9);
  const q = rotation(1, 33);
  assert.deepEqual(mapXRHeadPose(q, q, baseline), baseline);
});
test('XR head mapper bounds targets and rejects malformed orientation or baseline', () => {
  assert.equal(mapXRHeadPose(rotation(1, 80), neutral, baseline).yaw, 20);
  assert.equal(mapXRHeadPose([NaN, 0, 0, 1], neutral, baseline), null);
  assert.equal(mapXRHeadPose([0, 0, 0, 0], neutral, baseline), null);
  assert.equal(mapXRHeadPose([1e308, 1e308, 1e308, 1e308], neutral, baseline), null);
  assert.equal(mapXRHeadPose(neutral, neutral, { yaw: 0 }), null);
  assert.equal(mapXRHeadPose(neutral, neutral, baseline, { yaw: 20, pitch: -1, roll: 15 }), null);
});
test('XR following requires explicit arm and slews from measured baseline', () => {
  const guard = createXRHeadFollowGuard(), token = guard.beginSession();
  assert.equal(guard.update(token, neutral, 0, { allowed: true, visible: true }), null);
  assert.equal(guard.arm(token, neutral, baseline, XR_HEAD_LIMITS, 0), true);
  const target = guard.update(token, rotation(1, 30), 100, { allowed: true, visible: true });
  close(target.yaw, 5);
  assert.equal('x' in target, false);
});
test('XR gate loss, hidden session, missing pose or frame gaps require rearming', () => {
  for (const scenario of [{ allowed: false, visible: true }, { allowed: true, visible: false }, { allowed: true, visible: true, gap: 251 }, { allowed: true, visible: true, badPose: true }]) {
    const guard = createXRHeadFollowGuard(), token = guard.beginSession();
    guard.arm(token, neutral, baseline, XR_HEAD_LIMITS, 0);
    assert.equal(guard.update(token, scenario.badPose ? null : neutral, scenario.gap ?? 100, scenario), null);
    assert.equal(guard.armed, false);
    assert.equal(guard.update(token, neutral, 150, { allowed: true, visible: true }), null);
  }
});
test('XR session replacement rejects stale tokens and outside-range baselines', () => {
  const guard = createXRHeadFollowGuard(), old = guard.beginSession();
  guard.arm(old, neutral, baseline, XR_HEAD_LIMITS, 0); guard.endSession();
  const current = guard.beginSession();
  assert.equal(guard.arm(old, neutral, baseline, XR_HEAD_LIMITS, 0), false);
  assert.equal(guard.arm(current, neutral, { ...baseline, yaw: 21 }, XR_HEAD_LIMITS, 0), false);
  assert.equal(guard.update(old, neutral, 100, { allowed: true, visible: true }), null);
});
