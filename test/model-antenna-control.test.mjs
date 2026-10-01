import test from 'node:test';
import assert from 'node:assert/strict';
import { antennaDragTarget, sameAntennaContext } from '../src/model-antenna-control.mjs';
test('model antenna drag is relative, signed and bounded without click jumps', () => {
  assert.equal(antennaDragTarget(14, 0), 14);
  assert.equal(antennaDragTarget(14, Math.PI / 6), 44);
  assert.equal(antennaDragTarget(14, Math.PI / 6, -1), -16);
  assert.equal(antennaDragTarget(89, Math.PI), 90);
  assert.equal(antennaDragTarget(89, 2 * Math.PI), 90, 'continuing past a full turn never wraps to the opposite end');
  assert.equal(antennaDragTarget(-89, -Math.PI), -90);
  assert.equal(antennaDragTarget(NaN, 0), null);
  assert.equal(antennaDragTarget(0, Infinity), null);
  assert.equal(antennaDragTarget(0, 0, 0), null);
});
test('session, epoch and admission changes invalidate an antenna drag', () => {
  const start = { sessionKey: 'simulation', controlEpoch: 4 };
  assert.equal(sameAntennaContext(start, { ...start, disabled: false }), true);
  assert.equal(sameAntennaContext(start, { ...start, disabled: true }), false);
  assert.equal(sameAntennaContext(start, { ...start, sessionKey: 'another-session' }), false);
  assert.equal(sameAntennaContext(start, { ...start, controlEpoch: 5 }), false);
  assert.equal(sameAntennaContext({ sessionKey: 'simulation' }, { sessionKey: 'simulation' }), false);
  assert.equal(sameAntennaContext({ controlEpoch: 4 }, { controlEpoch: 4 }), false);
});
