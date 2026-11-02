import test from 'node:test';
import assert from 'node:assert/strict';
import { ReachyMini } from '@pollen-robotics/reachy-mini-sdk';
import { createLocalWirelessSDK, localSignalingUrl } from '../src/local-wireless.mjs';

function harness({ welcome = true, timeoutMs = 100, sendFails = false, iceRecoveryMs = 30 } = {}) {
  const sent = []; let socket;
  class Socket {
    readyState = 0; bufferedAmount = 0;
    constructor(url) {
      this.url = url; socket = this;
      queueMicrotask(() => { this.readyState = 1; this.onopen?.(); if (welcome) this.message({ type: 'welcome', peerId: 'fixture-browser' }); });
    }
    message(value) { this.onmessage?.({ data: JSON.stringify(value) }); }
    send(text) { if(sendFails)throw Error('fixture closed socket'); const value = JSON.parse(text); sent.push(value); if (value.type === 'list') queueMicrotask(() => this.message({ type: 'list', producers: [{ id: 'fixture-robot', meta: { name: 'Fixture' } }] })); }
    close() { this.readyState = 3; this.onclose?.(); }
  }
  const SDK = createLocalWirelessSDK(ReachyMini, { host: 'robot.local', WebSocketImpl: Socket, timeoutMs, iceRecoveryMs });
  const sdk = new SDK({ appName: 'Local fixture' });
  return { sdk, sent, get socket() { return socket; } };
}

test('local signaling accepts only selected private IP or local hostname at the fixed port', () => {
  assert.equal(localSignalingUrl(' Robot.Local '), 'ws://robot.local:8443');
  const address = [192,168,1,2].join('.');
  assert.equal(localSignalingUrl(address), `ws://${address}:8443`);
  for (const host of ['example.com','127.0.0.1','https://robot.local','robot.local:8000','robot.local/path',[192,168,'001',2].join('.')]) assert.throws(() => localSignalingUrl(host), /private|local/i);
});

function peerFor(h) {
  const peer = new EventTarget();
  peer.iceConnectionState = 'connected'; peer.close = () => { peer.closed = true; };
  peer.setConfiguration = () => {};
  h.sdk._pc = peer; h.sdk._state = 'streaming';
  return peer;
}

test('temporary ICE loss keeps the same session but blocks transport until recovery', async () => {
  const h = harness(); await h.sdk.connect(); const peer = peerFor(h);
  // Emit the installed SDK's audited transient-ICE error on the same peer.
  const sentBefore = h.sent.length;
  peer.iceConnectionState = 'disconnected';
  h.sdk._emit('error', { source: 'webrtc', error: Error('ICE disconnected') });
  assert.equal(h.sdk.state, 'streaming'); assert.equal(h.sdk.transportReady, false);
  assert.equal(h.socket.readyState, 1);
  peer.iceConnectionState = 'connected'; peer.dispatchEvent(new Event('iceconnectionstatechange'));
  assert.equal(h.sdk.transportReady, true); assert.equal(h.sdk.connectionIssue, null);
  assert.equal(h.sdk._pc, peer);
  assert.equal(h.sent.length, sentBefore, 'recovery sends no new signaling or session');
  h.sdk.disconnect();
});

test('unrecovered ICE loss has one bounded deadline and retains the closing cause', async () => {
  const h = harness({iceRecoveryMs:15}); await h.sdk.connect(); const peer = peerFor(h);
  peer.iceConnectionState = 'disconnected';
  h.sdk._emit('error', { source: 'webrtc', error: Error('ICE disconnected') });
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.equal(h.sdk.state, 'disconnected'); assert.equal(h.socket.readyState, 3);
  assert.equal(h.sdk.connectionIssue.code, 'ice-timeout');
});

test('robot errors inhibit control without disguising the live session as disconnected', async () => {
  const h = harness(); await h.sdk.connect(); peerFor(h);
  h.sdk._handleRobotMessage({error:'fixture daemon rejection'});
  assert.equal(h.sdk.state, 'streaming'); assert.equal(h.sdk.transportReady, false);
  assert.equal(h.sdk.connectionIssue.code, 'robot-error');
  assert.match(h.sdk.connectionIssue.message,/fixture daemon rejection/);
  assert.equal(h.socket.readyState,1); h.sdk.disconnect();
});

test('repeated ICE warnings cannot extend recovery and late recovery cannot revive a closed session', async t => {
  const h=harness({iceRecoveryMs:20});await h.sdk.connect();const peer=peerFor(h);
  t.mock.timers.enable({apis:['setTimeout']});
  peer.iceConnectionState='disconnected';
  const warning=()=>h.sdk._emit('error',{source:'webrtc',error:Error('ICE disconnected')});
  warning();t.mock.timers.tick(15);warning();t.mock.timers.tick(5);
  assert.equal(h.sdk.state,'disconnected');assert.equal(h.sdk.connectionIssue.code,'ice-timeout');
  peer.iceConnectionState='connected';peer.dispatchEvent(new Event('iceconnectionstatechange'));
  assert.equal(h.sdk.state,'disconnected');assert.equal(h.sdk.transportReady,false);
  assert.deepEqual(h.sent.map(x=>x.type),['setPeerStatus','list']);
});

test('local discovery uses no HF token or HTTP, and never requests a session or motor command', async () => {
  const h = harness(); assert.equal(await h.sdk.authenticate(), true);
  await h.sdk.connect(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.socket.url, 'ws://robot.local:8443');
  assert.equal(h.sdk.state, 'connected'); assert.equal(h.sdk.robots[0].id, 'fixture-robot');
  assert.equal(h.sdk._token, null);
  assert.deepEqual(h.sent.map(x => x.type), ['setPeerStatus','list']);
  h.sdk.disconnect(); assert.equal(h.socket.readyState,3); assert.equal(h.sdk.state,'disconnected');
});

test('bounded welcome failure closes the socket instead of reconnecting', async () => {
  const h = harness({welcome:false,timeoutMs:15});
  await assert.rejects(h.sdk.connect(), /local|network/i);
  assert.equal(h.socket.readyState,3); assert.equal(h.sdk.state,'disconnected');
  assert.equal(h.sent.length,0);
});

test('failed initial signaling send rejects setup and closes the socket', async () => {
  const h=harness({sendFails:true});
  await assert.rejects(h.sdk.connect(),/local|network/i);
  assert.equal(h.sdk.state,'disconnected'); assert.equal(h.socket.readyState,3);
});

test('lost local socket clears session and robot list and ignores late frames', async () => {
  const h = harness(); await h.sdk.connect(); await new Promise(resolve => setImmediate(resolve));
  h.sdk._state='streaming'; let stopped=0; h.sdk.addEventListener('sessionStopped',()=>stopped++);
  h.socket.close(); await new Promise(resolve => setImmediate(resolve));
  h.socket.message({type:'list',producers:[{id:'late'}]});
  assert.equal(h.sdk.state,'disconnected'); assert.deepEqual(h.sdk.robots,[]); assert.equal(stopped,1);
});

test('local peer messages use the selected socket and reject auth credentials', async () => {
  const h=harness(); await h.sdk.connect();
  await h.sdk._sendToServer({type:'peer',sessionId:'fixture-session',ice:{candidate:'fixture'}});
  assert.equal(h.sent.at(-1).type,'peer');
  await assert.rejects(h.sdk.connect('hf_fixture'), /token|credential/i);
  h.sdk.disconnect();
});

test('malformed local signaling closes an existing connection without escaping its handler', async () => {
  const h=harness(); await h.sdk.connect();
  assert.doesNotThrow(()=>h.socket.message(null));
  assert.equal(h.socket.readyState,3); assert.equal(h.sdk.state,'disconnected');
});

test('a WebRTC peer failure closes an admitted local session and clears telemetry', async () => {
  const h=harness(); await h.sdk.connect();
  h.sdk._state='streaming';
  h.sdk._pc={setRemoteDescription:async()=>{throw Error('fixture SDP rejection');},close(){}};
  const old=globalThis.RTCSessionDescription; globalThis.RTCSessionDescription=class {constructor(value){Object.assign(this,value);}};
  try {
    await h.sdk._handlePeerMessage({sdp:{type:'answer',sdp:'fixture'}});
    assert.equal(h.sdk.state,'disconnected'); assert.equal(h.socket.readyState,3);
  } finally {globalThis.RTCSessionDescription=old;h.sdk.disconnect();}
});
