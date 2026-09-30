import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaGuard } from '../server/media-guard.mjs';

const fixture = () => {
  const info = { connected: true, ready: true, awake: true, moves: [], blockedReason: null };
  const state = { info, startedAt: Date.now() };
  const control = { adapter: {}, owned: new Set(['owned']), closed: false, stopPending: true, readSnapshot: async () => state };
  return { info, state, control, guard: createMediaGuard(control) };
};
test('audio can accompany owned motion and motion recovery, but rejects foreign motion', async () => {
  const f = fixture(); f.info.moves = [{ uuid: 'owned' }];
  assert.equal((await f.guard('talk-start')).ok, true);
  f.info.moves.push({ uuid: 'foreign' });
  await assert.rejects(f.guard('audio-clear'), /Another motion/);
});
test('only speech cleanup can bypass a sole unknown motion outcome', async () => {
  const f = fixture(); f.control.adapter.uncertain = 'Unknown outcome'; f.info.ready = false; f.info.blockedReason = 'Unknown outcome';
  assert.equal((await f.guard('audio-stop')).ok, true);
  await assert.rejects(f.guard('talk-start'), /Unknown outcome/);
  f.info.blockedReason = 'Unknown outcome; Robot identity differs';
  await assert.rejects(f.guard('audio-clear'), /identity differs/);
});
test('stale, disconnected, asleep talk and closed controls remain guarded', async () => {
  const f = fixture(); f.state.startedAt -= 501;
  await assert.rejects(f.guard('audio-stop'), /fresh robot/);
  f.state.startedAt = Date.now(); f.info.connected = false;
  await assert.rejects(f.guard('audio-stop'), /fresh robot/);
  f.info.connected = true; f.info.awake = false;
  await assert.rejects(f.guard('talk-start'), /Wake Reachy/);
  assert.equal((await f.guard('audio-clear')).ok, true);
  f.control.closed = true;
  await assert.rejects(f.guard('audio-stop'), /closed/);
});
