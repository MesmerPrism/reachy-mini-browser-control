import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommandFlight } from '../src/command-flight.mjs';
test('command flights serialize asynchronous mutations and retain pending requests across priority Stop', () => {
  const gate = createCommandFlight(), wake = gate.begin();
  assert.throws(() => gate.begin(), /progress/);
  const stop = gate.begin(true); stop.release();
  assert.equal(gate.busy, true); assert.throws(() => gate.begin(), /progress/);
  wake.release(); assert.equal(gate.busy, false);
  const sleep = gate.begin(), secondStop = gate.begin(true);
  sleep.release(); assert.equal(gate.busy, true);
  secondStop.release(); assert.equal(gate.busy, false);
});
test('reconnection fences old completions without unlocking the new connection', () => {
  const gate = createCommandFlight(), old = gate.begin(); gate.clear();
  const current = gate.begin(); old.release();
  assert.equal(old.current(), false); assert.equal(current.current(), true); assert.equal(gate.busy, true);
  current.release(); assert.equal(gate.busy, false);
});
