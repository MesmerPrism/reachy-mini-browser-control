import test from 'node:test';
import assert from 'node:assert/strict';
import { boundTarget, padTarget, dialTarget } from '../src/spatial-control.mjs';
const rect = { left: 20, top: 30, width: 200, height: 100 };
const limits = { yaw: 20, pitch: 15 };
test('gaze pad maps Reachy left, right, up and down in robot coordinates', () => {
  assert.deepEqual(padTarget(120, 80, rect, limits), { yaw: 0, pitch: 0 });
  assert.deepEqual(padTarget(20, 30, rect, limits), { yaw: 20, pitch: -15 });
  assert.deepEqual(padTarget(220, 130, rect, limits), { yaw: -20, pitch: 15 });
  assert.deepEqual(padTarget(-500, 900, rect, limits), { yaw: 20, pitch: 15 });
});
test('pointer capture beyond the dial never wraps or exceeds target bounds', () => {
  assert.equal(dialTarget(120, 30, rect, 15), 0);
  assert.equal(dialTarget(-500, 900, rect, 15), -15);
  assert.equal(dialTarget(900, 900, rect, 15), 15);
  assert.equal(boundTarget(999, 20), 20);
  assert.equal(boundTarget(-999, 20), -20);
  // A physical ten-degree drag stays ten degrees even with a small limit.
  const x = 90 + 66 * Math.tan(10 * Math.PI / 180);
  assert.equal(dialTarget(rect.left + x / 180 * rect.width, rect.top + 20 / 110 * rect.height, rect, 15), 10);
});
test('invalid layouts and nonfinite inputs produce no gesture target', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(padTarget(value, 80, rect, limits), null);
    assert.equal(dialTarget(120, value, rect, 15), null);
    assert.equal(boundTarget(value, 15), null);
  }
  assert.equal(padTarget(120, 80, { ...rect, width: 0 }, limits), null);
  assert.equal(dialTarget(120, 80, { ...rect, height: -1 }, 15), null);
  assert.equal(boundTarget(12, -15), null);
  assert.deepEqual(padTarget(120, 80, rect, { yaw: 0, pitch: 0 }), { yaw: 0, pitch: 0 });
});
