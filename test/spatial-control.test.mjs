import test from 'node:test';
import assert from 'node:assert/strict';
import { boundTarget, createSurfaceGesture, padTarget, dialTarget } from '../src/spatial-control.mjs';
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
test('translation pad follows native left/up signs, clamps bounds and rejects invalid geometry', async () => {
  const { positionPadTarget } = await import('../src/spatial-control.mjs');
  const rect={left:0,top:0,width:100,height:100},limits={y:10,z:8};
  assert.deepEqual(positionPadTarget(0,0,rect,limits),{y:10,z:8});
  assert.deepEqual(positionPadTarget(100,100,rect,limits),{y:-10,z:-8});
  assert.deepEqual(positionPadTarget(50,50,rect,limits),{y:0,z:0});
  assert.deepEqual(positionPadTarget(-100,200,rect,limits),{y:10,z:-8});
  assert.equal(positionPadTarget(0,0,{...rect,width:0},limits),null);
  assert.equal(positionPadTarget(NaN,0,rect,limits),null);
});

function gestureFixture(overrides = {}) {
  const context = { disabled: false, hidden: false, contextKey: 'simulation:1' };
  const targets = [], captured = new Set();
  const element = {
    setPointerCapture: id => captured.add(id),
    hasPointerCapture: id => captured.has(id),
    releasePointerCapture: id => captured.delete(id),
  };
  const event = (extra = {}) => ({ pointerId: 1, button: 0, currentTarget: element, target: { closest: () => null }, preventDefault() {}, value: 2, ...extra });
  const gesture = createSurfaceGesture({ getContext: () => context, mapTarget: event => event.value, onChange: target => { targets.push(target); }, ...overrides });
  return { context, targets, captured, event, gesture };
}

test('a held gesture expires across Stop/epoch, connection, disabled or hidden context changes', () => {
  for (const change of [{ contextKey: 'simulation:2' }, { contextKey: 'replacement:1' }, { disabled: true }, { hidden: true }]) {
    const { context, targets, captured, event, gesture } = gestureFixture();
    gesture.onPointerDown(event());
    Object.assign(context, change);
    gesture.onPointerMove(event({ value: 7 }));
    assert.deepEqual(targets, [2]);
    assert.equal(captured.size, 0);
    Object.assign(context, { contextKey: 'simulation:1', disabled: false, hidden: false });
    gesture.onPointerMove(event({ value: 8 }));
    assert.deepEqual(targets, [2], 'restored eligibility never resumes the old press');
    gesture.onPointerDown(event({ value: 3 }));
    assert.deepEqual(targets, [2, 3], 'a fresh explicit press works');
  }
});

test('release, cancellation, lost capture and lifecycle cancellation require a new press', () => {
  for (const finish of ['onPointerUp', 'onPointerCancel', 'onLostPointerCapture', 'cancel']) {
    const { targets, captured, event, gesture } = gestureFixture();
    gesture.onPointerDown(event());
    gesture[finish](event());
    gesture.onPointerMove(event({ value: 9 }));
    assert.deepEqual(targets, [2]);
    assert.equal(captured.size, 0);
    gesture.onPointerDown(event({ value: 0 }));
    assert.deepEqual(targets, [2, 0], 'zero-angle targets remain valid');
  }
});

test('a second pointer cannot take over or cancel the first gesture or replace its relative origin', () => {
  const { targets, event, gesture } = gestureFixture({
    onStart: event => event.value,
    mapTarget: (event, start) => event.value - start,
  });
  gesture.onPointerDown(event({ value: 10 }));
  gesture.onPointerDown(event({ pointerId: 2, value: 90 }));
  gesture.onPointerMove(event({ pointerId: 2, value: 100 }));
  for (const finish of ['onPointerUp', 'onPointerCancel', 'onLostPointerCapture']) gesture[finish](event({ pointerId: 2 }));
  gesture.onPointerMove(event({ value: 12 }));
  assert.deepEqual(targets, [0, 2]);
  gesture.onPointerUp(event());
  gesture.onPointerDown(event({ value: 20 }));
  gesture.onPointerMove(event({ value: 19 }));
  assert.deepEqual(targets, [0, 2, 0, -1], 'new glyph drags use a fresh origin');
});

test('rejected or throwing submissions discard the gesture until a new press', () => {
  for (const reject of [() => false, () => { throw Error('Motion owner changed'); }]) {
    let calls = 0;
    const { captured, event, gesture } = gestureFixture({ onChange: () => { calls++; return reject(); } });
    gesture.onPointerDown(event());
    assert.equal(calls, 1);
    assert.equal(captured.size, 0);
    gesture.onPointerMove(event({ value: 3 }));
    assert.equal(calls, 1);
    gesture.onPointerDown(event());
    assert.equal(calls, 2);
  }
});

test('ineligible presses and embedded controls never capture or submit motion', () => {
  for (const guard of ['disabled', 'hidden', 'secondary-button', 'embedded-control']) {
    const { context, targets, captured, event, gesture } = gestureFixture();
    if (guard === 'disabled' || guard === 'hidden') context[guard] = true;
    const press = event(guard === 'secondary-button' ? { button: 2 } : guard === 'embedded-control' ? { target: { closest: () => ({}) } } : {});
    gesture.onPointerDown(press);
    Object.assign(context, { disabled: false, hidden: false });
    gesture.onPointerMove(event());
    assert.deepEqual(targets, []);
    assert.equal(captured.size, 0);
  }
});

test('invalid mapped targets send nothing and mapping or capture failures cancel safely', () => {
  for (const value of [null, undefined]) {
    const { targets, event, gesture } = gestureFixture();
    gesture.onPointerDown(event({ value }));
    assert.deepEqual(targets, []);
    gesture.cancel();
  }
  for (const failure of ['map', 'capture']) {
    let broken = true;
    const { targets, captured, event, gesture } = gestureFixture({ mapTarget: event => {
      if (broken && failure === 'map') throw Error('No layout');
      return event.value;
    } });
    const press = event();
    if (failure === 'capture') press.currentTarget.setPointerCapture = () => { throw Error('Pointer ended'); };
    gesture.onPointerDown(press);
    broken = false;
    gesture.onPointerMove(event());
    assert.deepEqual(targets, []);
    assert.equal(captured.size, 0);
  }
});
