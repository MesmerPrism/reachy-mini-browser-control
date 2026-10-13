import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhonePeer, PHONE_PAIR_CODE_LIMIT, PHONE_CHALLENGE_INTERVAL_MS } from '../src/phone-peer.mjs';

const SDP = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=candidate:1 1 udp 1 127.0.0.1 10000 typ host\r\n';
const decode = code => JSON.parse(Buffer.from(code, 'base64url').toString());
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const pose = () => ({ quaternion: [0, 0, 0, 1], sampleAgeMs: 0, held: true });
let randomCounter = 0;
function fixture(options = {}) {
  let time = 0, timerId = 0;
  const jobs = new Map(), pcs = [], samples = [], releases = [], states = [], events = [];
  const timers = {
    setTimeout(fn, ms) { const id = ++timerId; jobs.set(id, { at: time + ms, fn }); return id; },
    clearTimeout(id) { jobs.delete(id); },
  };
  function advance(ms) {
    const end = time + ms;
    for (;;) {
      const next = [...jobs].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at; jobs.delete(next[0]); next[1].fn();
    }
    time = end;
  }
  function channel(label, opts) {
    return { label, ...opts, maxPacketLifeTime: null, readyState: 'connecting', bufferedAmount: 0, sent: [],
      send(value) { this.sent.push(value); this.other?.onmessage?.({ data: value }); },
      close() { this.readyState = 'closed'; },
      open() { this.readyState = 'open'; this.onopen?.(); },
    };
  }
  function factory(config) {
    const pc = { config, connectionState: 'new', iceGatheringState: options.gathering ? 'gathering' : 'complete', remote: [],
      createDataChannel(label, opts) { this.channel = channel(label, opts); return this.channel; },
      async createOffer() { return { type: 'offer', sdp: SDP }; },
      async createAnswer() { return { type: 'answer', sdp: SDP }; },
      async setLocalDescription(value) { this.localDescription = value; },
      async setRemoteDescription(value) { this.remote.push(value); },
      close() { this.connectionState = 'closed'; },
    };
    pcs.push(pc); return pc;
  }
  function make(role, extra = {}) {
    return createPhonePeer({ role, createPeerConnection: factory, now: () => time, wallNow: () => 1_000_000 + time,
      timers, randomBytes: size => { const bytes = new Uint8Array(size); new DataView(bytes.buffer).setUint32(0, ++randomCounter); return bytes; },
      onSample: value => { samples.push(value); events.push('sample'); },
      onRelease: reason => { releases.push(reason); events.push('release'); }, onState: value => states.push(value), ...extra });
  }
  async function pair() {
    const host = make('host'), phone = make('phone');
    const offer = await host.createOffer(), answer = await phone.acceptOffer(offer);
    await host.acceptAnswer(answer);
    const hostChannel = pcs[0].channel;
    const phoneChannel = channel(hostChannel.label, { protocol: hostChannel.protocol, ordered: false, maxRetransmits: 0 });
    pcs[1].ondatachannel({ channel: phoneChannel });
    hostChannel.other = phoneChannel; phoneChannel.other = hostChannel;
    hostChannel.open(); phoneChannel.open();
    return { host, phone, hostChannel, phoneChannel, offer, answer };
  }
  return { make, pair, pcs, samples, releases, states, events, advance, jobs, setTime: value => { time = value; } };
}

test('manual two-code demo pairing uses only a local unordered channel and explicit gates', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel, offer } = await f.pair();
  assert.deepEqual(f.pcs[0].config, { iceServers: [], iceTransportPolicy: 'all' });
  assert.equal(decode(offer).mode, 'demo-only'); assert.equal(decode(offer).secret.length, 43);
  assert.equal(host.getState().approved, false); assert.equal(phone.getState().active, false);
  assert.equal(phone.sendPose(pose()), false);
  host.setApproved(true); assert.equal(phone.sendPose(pose()), false);
  phone.setActive(true); assert.equal(phone.sendPose(pose()), true); assert.equal(f.samples.length, 1);
  assert.equal(hostChannel.ordered, false); assert.equal(phoneChannel.maxRetransmits, 0);
  host.close(); phone.close(); assert.equal(f.jobs.size, 0);
});

test('malformed, wrong mode/type, extra-field, expired, nonlocal and oversized offers never create RTC', async () => {
  const f = fixture(), host = f.make('host'); const valid = decode(await host.createOffer());
  const cases = ['?', 'x'.repeat(PHONE_PAIR_CODE_LIMIT + 1), encode({ ...valid, extra: true }),
    encode({ ...valid, mode: 'robot' }), encode({ ...valid, kind: 'answer' }),
    encode({ ...valid, expiresAt: 970_000 }), encode({ ...valid, expiresAt: 2_000_000 }),
    encode({ ...valid, sdp: SDP.replaceAll('127.0.0.1', '127.evil.example') }),
    encode({ ...valid, sdp: SDP.replaceAll('127.0.0.1', 'public.invalid') }),
    encode({ ...valid, sdp: SDP.replace('typ host', 'typ relay') }),
    encode({ ...valid, sdp: SDP + 'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n' })];
  for (const value of cases) await assert.rejects(f.make('phone').acceptOffer(value));
  assert.equal(f.pcs.length, 1); host.close();
});

test('answers bind the session, secret and deadline; valid answers and offers cannot be reused', async () => {
  const f = fixture(), host = f.make('host'), phone = f.make('phone');
  const offer = await host.createOffer(), answer = await phone.acceptOffer(offer), value = decode(answer);
  await assert.rejects(f.make('phone').acceptOffer(offer), /already used/);
  for (const bad of [{ secret: 'A'.repeat(43) }, { session: 'B'.repeat(43) }, { expiresAt: value.expiresAt - 1 }, { kind: 'offer' }]) {
    await assert.rejects(host.acceptAnswer(encode({ ...value, ...bad })));
  }
  assert.equal(f.pcs[0].remote.length, 0);
  await host.acceptAnswer(answer); await assert.rejects(host.acceptAnswer(answer));
  host.close(); phone.close();
});

test('only normalized finite bounded poses enter the receiver and duplicate/out-of-order/session packets are ignored', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); phone.sendPose(pose());
  const frame = JSON.parse(phoneChannel.sent.at(-1));
  for (const bad of [frame, { ...frame, seq: 0 }, { ...frame, seq: 9, session: 'wrong' },
    { ...frame, seq: 9, command: 'wake' }, { ...frame, seq: 9, quaternion: [0, 0, 0, 2] },
    { ...frame, seq: 9, sampleAgeMs: -1 }, { ...frame, seq: 9, held: false },
    { ...frame, seq: 9, generation: 0 }]) hostChannel.onmessage({ data: JSON.stringify(bad) });
  hostChannel.onmessage({ data: 'x'.repeat(1025) }); hostChannel.onmessage({ data: new ArrayBuffer(8) });
  assert.equal(f.samples.length, 1);
  assert.equal(phone.sendPose({ ...pose(), quaternion: [NaN, 0, 0, 1] }), false);
  assert.equal(phone.sendPose({ ...pose(), profile: {} }), false);
  assert.equal(phone.sendPose({ ...pose(), quaternion: [0, 0, 0, 1.01] }), true);
  assert.deepEqual(f.samples.at(-1).quaternion, [0, 0, 0, 1]); host.close(); phone.close();
});

test('continuous samples survive challenge rotation; stale input revokes approval and cannot automatically resume', async () => {
  const f = fixture(); const { host, phone } = await f.pair(); host.setApproved(true); phone.setActive(true);
  for (let i = 0; i < 20; i += 1) { phone.sendPose(pose()); f.advance(50); }
  assert.equal(f.samples.length, 20); assert.deepEqual(f.releases, []);
  f.advance(400); assert.equal(host.getState().approved, false); assert.deepEqual(f.releases, ['stale']);
  const count = f.samples.length; phone.sendPose(pose()); assert.equal(f.samples.length, count);
  host.setApproved(true); assert.equal(phone.sendPose(pose()), false);
  phone.setActive(true); phone.sendPose(pose()); assert.equal(f.samples.length, count + 1); host.close(); phone.close();
});

test('receiver deadlines reject delayed frames despite unsynchronized sender clocks and newer arrival times', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true);
  phoneChannel.other = null; phone.sendPose(pose()); const delayed = phoneChannel.sent.at(-1);
  f.advance(400); hostChannel.onmessage({ data: delayed }); assert.equal(f.samples.length, 0);
  f.advance(1);
  phoneChannel.other = hostChannel; phone.sendPose({ ...pose(), sampleAgeMs: 349 });
  assert.equal(f.samples.length, 0); host.close(); phone.close();
});

test('release revokes the old challenge and requires another deliberate phone activation', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); phone.sendPose(pose());
  const old = JSON.parse(phoneChannel.sent.at(-1)); phone.setActive(false);
  assert.deepEqual(f.releases, ['released']); assert.equal(phone.sendPose(pose()), false);
  hostChannel.onmessage({ data: JSON.stringify({ ...old, seq: old.seq + 100 }) }); assert.equal(f.samples.length, 1);
  phone.setActive(true); phone.sendPose(pose()); assert.equal(f.samples.length, 2); host.close(); phone.close();
});

test('backpressure drops samples without any queued replay on drain', async () => {
  const f = fixture(); const { host, phone, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); phoneChannel.bufferedAmount = 1;
  for (let i = 0; i < 100; i += 1) assert.equal(phone.sendPose(pose()), false);
  assert.equal(phoneChannel.sent.length, 0); phoneChannel.bufferedAmount = 0; f.advance(100);
  assert.equal(f.samples.length, 0); phone.sendPose(pose()); assert.equal(f.samples.length, 1); host.close(); phone.close();
});

test('closed peers ignore retained late callbacks and never reopen or replay', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); phone.sendPose(pose());
  const receive = hostChannel.onmessage, open = hostChannel.onopen, datachannel = f.pcs[1].ondatachannel;
  host.close(); phone.close(); receive({ data: phoneChannel.sent.at(-1) }); open();
  let rejected = false; datachannel({ channel: { close() { rejected = true; } } });
  assert.equal(rejected, true); assert.equal(f.samples.length, 1); assert.equal(f.jobs.size, 0);
  assert.equal(host.getState().status, 'closed'); assert.equal(host.setApproved(true), false);
  assert.equal(phone.setActive(true), false); await assert.rejects(host.createOffer());
});

test('setup expiration and bounded ICE gathering close unfinished attempts', async () => {
  const f = fixture(), host = f.make('host'); await host.createOffer(); f.advance(120_000);
  assert.equal(host.getState().status, 'closed'); assert.equal(f.pcs[0].connectionState, 'closed');
  const g = fixture({ gathering: true }), waiting = g.make('host'); const pending = waiting.createOffer();
  await Promise.resolve(); await Promise.resolve(); g.advance(8000);
  await assert.rejects(pending, /timed out/); assert.equal(waiting.getState().status, 'closed'); assert.equal(g.jobs.size, 0);
});

test('nonfinite or backwards receiver clocks close the session before accepting samples', async () => {
  for (const timestamp of [NaN, Infinity, -1]) {
    const f = fixture(); const { host, phone } = await f.pair(); host.setApproved(true); phone.setActive(true);
    f.setTime(timestamp); phone.sendPose(pose()); assert.equal(phone.getState().status, 'closed'); assert.equal(f.samples.length, 0); host.close();
  }
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); f.advance(100); phone.sendPose(pose());
  const frame = JSON.parse(phoneChannel.sent.at(-1)); f.setTime(90);
  hostChannel.onmessage({ data: JSON.stringify({ ...frame, seq: frame.seq + 1, sampleAgeMs: 100 }) });
  assert.equal(host.getState().status, 'closed'); assert.equal(f.samples.length, 1); phone.close();
});

test('phone tolerates bounded wall-clock skew but the host setup deadline never extends', async () => {
  for (const offset of [-10_000, 10_000]) {
    const f = fixture(), host = f.make('host'), phone = f.make('phone', { wallNow: () => 1_000_000 + offset });
    const offer = await host.createOffer(), answer = await phone.acceptOffer(offer);
    await host.acceptAnswer(answer); host.close(); phone.close();
  }
  const f = fixture(), host = f.make('host'), phone = f.make('phone');
  const offer = await host.createOffer(), answer = await phone.acceptOffer(offer);
  // Simulate a suspended event loop: expiry timers have not run, but accepting the
  // answer still checks the host's monotonic deadline before touching RTC.
  f.setTime(120_001); await assert.rejects(host.acceptAnswer(answer), /expired/);
  assert.equal(f.pcs[0].remote.length, 0); phone.close();
});

test('a deliberate release using the previous in-flight challenge remains prompt', async () => {
  const f = fixture(); const { host, phone, hostChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); phone.sendPose(pose());
  hostChannel.other = null; f.advance(150); // The next challenge has not reached the phone.
  phone.setActive(false); assert.deepEqual(f.releases, ['released']); host.close(); phone.close();
});

test('an unexpected or reliable incoming channel closes pairing before input is admitted', async () => {
  const f = fixture(), host = f.make('host'), phone = f.make('phone');
  const offer = await host.createOffer(); await phone.acceptOffer(offer);
  let rejected = false;
  f.pcs[1].ondatachannel({ channel: { label: 'reachy-demo-phone', protocol: 'reachy-demo-phone-v1',
    ordered: true, maxRetransmits: 0, close() { rejected = true; } } });
  assert.equal(rejected, true); assert.equal(phone.getState().status, 'closed'); host.close();
});

test('phone input readiness requires a fresh challenge and expires without reactivation', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  assert.equal(phone.getState().inputReady, false); assert.equal(host.getState().inputReady, false);
  assert.equal(phone.setActive(true), false);
  host.setApproved(true); assert.equal(phone.getState().inputReady, true); assert.equal(phone.getState().active, false);
  const readyCount = f.states.filter(state => state.role === 'phone' && state.inputReady).length;
  f.advance(300);
  assert.equal(f.states.filter(state => state.role === 'phone' && state.inputReady).length, readyCount);
  phone.setActive(true); assert.equal(phone.getState().active, true);
  const oldChallenge = hostChannel.sent.at(-1);
  host.setApproved(false); f.advance(350);
  assert.equal(phone.getState().inputReady, false); assert.equal(phone.getState().active, false);
  phoneChannel.onmessage({ data: oldChallenge }); assert.equal(phone.getState().inputReady, false);
  host.setApproved(true); assert.equal(phone.getState().inputReady, true); assert.equal(phone.getState().active, false);
  assert.equal(phone.sendPose(pose()), false); phone.setActive(true); assert.equal(phone.sendPose(pose()), true);
  host.close(); phone.close(); assert.equal(phone.getState().inputReady, false);
});

test('a new challenge arriving before the expiry pulse cannot preserve an expired activation', async () => {
  const f = fixture(); const { host, phone } = await f.pair();
  host.setApproved(true); phone.setActive(true); host.setApproved(false);
  f.setTime(351); assert.equal(phone.getState().inputReady, false);
  host.setApproved(true); assert.equal(phone.getState().inputReady, true);
  assert.equal(phone.getState().active, false); assert.equal(phone.sendPose(pose()), false);
  host.close(); phone.close();
});

test('rapid PC Stop and reapproval revoke the old phone press even if no revoke message arrives', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); phone.sendPose(pose());
  const oldChallenge = hostChannel.sent.at(-1), oldPose = JSON.parse(phoneChannel.sent.at(-1));
  const firstAuthorization = JSON.parse(oldChallenge).authorization;
  f.advance(150); assert.equal(phone.getState().active, true);
  assert.equal(JSON.parse(hostChannel.sent.at(-1)).authorization, firstAuthorization);
  hostChannel.other = null; host.setApproved(false); // Any potential revocation is lost.
  hostChannel.other = phoneChannel; const previousStateCount = f.states.length;
  host.setApproved(true); // No time passes and no phone expiry pulse runs.
  assert.notEqual(JSON.parse(hostChannel.sent.at(-1)).authorization, firstAuthorization);
  assert.equal(phone.getState().inputReady, true); assert.equal(phone.getState().active, false);
  assert.ok(f.states.slice(previousStateCount).some(state => state.role === 'phone' && !state.active));
  assert.equal(phone.sendPose(pose()), false);
  phoneChannel.onmessage({ data: oldChallenge }); assert.equal(phone.getState().active, false);
  hostChannel.onmessage({ data: JSON.stringify({ ...oldPose, seq: 100 }) }); assert.equal(f.samples.length, 1);
  phone.setActive(true); assert.equal(phone.sendPose(pose()), true); assert.equal(f.samples.length, 2);
  // Reaffirming approval also creates a new authorization; ordinary challenge pulses do not.
  host.setApproved(true); assert.equal(phone.getState().active, false);
  host.close(); phone.close();
});

test('default browser timers preserve the global receiver required by native Window methods', async t => {
  let scheduled = 0, cleared = 0;
  t.mock.method(globalThis, 'setTimeout', function () { assert.equal(this, globalThis); scheduled += 1; return 123; });
  t.mock.method(globalThis, 'clearTimeout', function () { assert.equal(this, globalThis); cleared += 1; });
  const f = fixture(), host = f.make('host', { timers: undefined });
  try { await host.createOffer(); host.close(); assert.equal(scheduled, 1); assert.equal(cleared, 1); }
  finally { t.mock.restoreAll(); }
});

test('every pose repeats the press-time reference even when the first frame is lost', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); const pressReference = [0, 0, 0, 1];
  assert.equal(phone.setActive(true, { reference: pressReference }), true);
  pressReference[0] = 1; // Caller mutations cannot change the captured reference.
  phoneChannel.other = null; phone.sendPose(pose());
  const first = JSON.parse(phoneChannel.sent.at(-1));
  f.advance(150); phoneChannel.other = hostChannel;
  const moved = [0, Math.sin(0.1), 0, Math.cos(0.1)];
  phone.sendPose({ ...pose(), quaternion: moved });
  assert.equal(f.samples.length, 1); assert.deepEqual(f.samples[0].reference, [0, 0, 0, 1]);
  assert.deepEqual(f.samples[0].quaternion, moved); assert.equal(f.samples[0].gesture, first.gesture);
  assert.equal(f.samples[0].holdSeq, first.holdSeq); host.close(); phone.close();
});

test('a gesture cannot change its reference or identity while retaining its hold sequence', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true, { reference: [0, 0, 0, 1] }); phone.sendPose(pose());
  const frame = JSON.parse(phoneChannel.sent.at(-1));
  for (const change of [{ reference: [0, 0.1, 0, Math.sqrt(0.99)] }, { reference: [null, 0, 0, 1] },
    { reference: [0, 0, 0, 2] }, { gesture: 'x'.repeat(43) }]) {
    hostChannel.onmessage({ data: JSON.stringify({ ...frame, ...change, seq: frame.seq + 1 }) });
  }
  assert.equal(f.samples.length, 1); assert.deepEqual(f.releases, []); host.close(); phone.close();
});

test('a new hold releases the previous hold before its sample when the release packet was lost', async () => {
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true); phone.sendPose(pose());
  const old = JSON.parse(phoneChannel.sent.at(-1));
  phoneChannel.other = null; phone.setActive(false); const oldRelease = JSON.parse(phoneChannel.sent.at(-1));
  phoneChannel.other = hostChannel; phone.setActive(true, { reference: [0, 0, 0, 1] }); phone.sendPose(pose());
  assert.deepEqual(f.releases, ['new-hold']); assert.equal(f.samples.length, 2);
  assert.deepEqual(f.events, ['sample', 'release', 'sample']);
  assert.notEqual(f.samples[1].gesture, f.samples[0].gesture); assert.ok(f.samples[1].holdSeq > f.samples[0].holdSeq);
  // Even forged higher packet sequence numbers cannot make a retired hold current.
  hostChannel.onmessage({ data: JSON.stringify({ ...old, seq: 100 }) });
  hostChannel.onmessage({ data: JSON.stringify({ ...oldRelease, seq: 101 }) });
  assert.equal(f.samples.length, 2); assert.deepEqual(f.releases, ['new-hold']);
  host.close(); phone.close();
});

test('100 ms challenges leave freshness margin when one pose is lost at each rotation', async () => {
  assert.equal(PHONE_CHALLENGE_INTERVAL_MS, 100);
  const f = fixture(); const { host, phone, hostChannel, phoneChannel } = await f.pair();
  host.setApproved(true); phone.setActive(true, { reference: [0, 0, 0, 1] });
  phone.sendPose(pose());
  const acceptedAges = [];
  for (let timestamp = 50; timestamp <= 1000; timestamp += 50) {
    f.advance(50);
    // Model the pose at a rotation being dropped before it reaches the host.
    if (timestamp % PHONE_CHALLENGE_INTERVAL_MS === 0) phoneChannel.other = null;
    phone.sendPose(pose()); phoneChannel.other = hostChannel;
    const latest = f.samples.at(-1);
    const effectiveAge = latest.sampleAgeMs + timestamp - latest.receivedAt;
    acceptedAges.push(effectiveAge);
    assert.ok(effectiveAge < 250, `effective sensor age ${effectiveAge} at ${timestamp}`);
  }
  // An additional complete 50 ms guard tick still has margin for modest transit.
  assert.ok(Math.max(...acceptedAges) + 50 < 250);
  assert.equal(host.getState().approved, true); assert.deepEqual(f.releases, []);
  host.close(); phone.close();
});
