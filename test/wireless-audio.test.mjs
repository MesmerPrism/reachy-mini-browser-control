import test from 'node:test';
import assert from 'node:assert/strict';
import { createWirelessTalk } from '../src/wireless-audio.mjs';
test('wireless PTT stays muted until explicit hold, disables immediately on release', async () => {
  const track = { kind: 'audio', enabled: true, readyState: 'live', stop() { this.readyState = 'ended'; } };
  const sent = [], sender = { track: { kind: 'audio' }, async replaceTrack(value) { sent.push(value); } };
  const sdk = { state: 'streaming', micSupported: true, _pc: { getSenders: () => [sender] }, clearIncomingAudio() {} };
  const talk = createWirelessTalk({ sdk, allowed: () => true, capture: async () => ({ getAudioTracks: () => [track], getTracks: () => [track] }) });
  await talk.enable(); assert.equal(track.enabled, false);
  await talk.press(); assert.equal(track.enabled, true); assert.ok(sent.includes(track));
  talk.release(); assert.equal(track.enabled, false); talk.disable();
});
test('late permission after release cannot send audio into a new session', async () => {
  let finish; const sent = [];
  const track = { kind: 'audio', enabled: true, stop() { this.stopped = true; } };
  const sdk = { state: 'streaming', micSupported: true, _pc: { getSenders: () => [{ track: { kind: 'audio' }, replaceTrack: async value => sent.push(value) }] }, clearIncomingAudio() {} };
  const talk = createWirelessTalk({ sdk, allowed: () => true, capture: () => new Promise(resolve => { finish = resolve; }) });
  const pressing = talk.press(); await new Promise(resolve => setImmediate(resolve)); talk.release();
  finish({ getAudioTracks: () => [track], getTracks: () => [track] }); await pressing;
  assert.equal(track.enabled, false); assert.equal(track.stopped, true); assert.ok(!sent.includes(track));
});
