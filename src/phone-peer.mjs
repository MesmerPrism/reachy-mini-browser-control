// Static, manually paired DEMO sensor transport. This module has no robot adapter.
export const PHONE_PAIR_CODE_LIMIT = 16_384;
export const PHONE_PAIR_LIFETIME_MS = 120_000;
export const PHONE_CHALLENGE_LIFETIME_MS = 350;
export const PHONE_CHALLENGE_INTERVAL_MS = 100;
const LABEL = 'reachy-demo-phone';
const PROTOCOL = 'reachy-demo-phone-v1';
const MESSAGE_LIMIT = 1024;
const usedOffers = new Map();

function exact(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
function token(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value); }
function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
function encode(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function localAddress(address) {
  const octets = address.split('.');
  const ipv4 = octets.length === 4 && octets.every(value => /^\d{1,3}$/.test(value) && Number(value) <= 255);
  return /^[a-z0-9-]+\.local$/i.test(address)
    || (ipv4 && /^(?:10\.|192\.168\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(address))
    || (/^(?:fc|fd|fe[89ab])[0-9a-f:]+$/i.test(address) && address.includes(':')) || address === '::1';
}
function checkSdp(sdp) {
  if (typeof sdp !== 'string' || sdp.length > 11_000 || !sdp.startsWith('v=0\r\n')) throw new Error('Invalid pairing SDP.');
  const lines = sdp.split(/\r?\n/);
  const media = lines.filter(line => line.startsWith('m='));
  if (media.length !== 1 || !/^m=application \d+ UDP\/DTLS\/SCTP webrtc-datachannel$/.test(media[0])) throw new Error('Only demo data channels are allowed.');
  for (const line of lines.filter(value => value.startsWith('a=candidate:'))) {
    const fields = line.split(' ');
    if (fields[6] !== 'typ' || fields[7] !== 'host' || !localAddress(fields[4])) throw new Error('Pairing requires local host candidates.');
  }
  for (const line of lines.filter(value => value.startsWith('c='))) {
    const address = line.split(' ')[2];
    if (address !== '0.0.0.0' && address !== '::' && !localAddress(address ?? '')) throw new Error('Pairing requires a local connection.');
  }
  return sdp;
}
function decode(code, wallNow, clockSkew = 0) {
  if (typeof code !== 'string' || code.length > PHONE_PAIR_CODE_LIMIT || !/^[A-Za-z0-9_-]+$/.test(code)) throw new Error('Invalid or oversized pairing code.');
  let value;
  try {
    const bytes = Uint8Array.from(atob(code.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { throw new Error('Invalid pairing code.'); }
  if (!exact(value, ['v', 'mode', 'kind', 'session', 'secret', 'expiresAt', 'sdp'])
    || value.v !== 1 || value.mode !== 'demo-only' || !['offer', 'answer'].includes(value.kind)
    || !token(value.session) || !token(value.secret) || !integer(value.expiresAt)
    || value.expiresAt <= wallNow - clockSkew || value.expiresAt > wallNow + PHONE_PAIR_LIFETIME_MS + clockSkew) throw new Error('Invalid or expired demo pairing code.');
  checkSdp(value.sdp);
  return value;
}
function quaternion(value) {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite)) return null;
  const norm = Math.hypot(...value);
  if (!Number.isFinite(norm) || norm < 0.000001 || Math.abs(norm - 1) > 0.05) return null;
  return value.map(component => component / norm);
}

export function createPhonePeer({ role, createPeerConnection = config => new RTCPeerConnection(config),
  now = () => performance.now(), wallNow = () => Date.now(),
  randomBytes = size => crypto.getRandomValues(new Uint8Array(size)),
  timers = { setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay), clearTimeout: id => globalThis.clearTimeout(id) }, onState = () => {}, onSample = () => {},
  onRelease = () => {}, onClose = () => {} } = {}) {
  if (!['host', 'phone'].includes(role)) throw new Error('Unknown phone peer role.');
  let status = 'idle', pc = null, channel = null, pairing = null;
  let approved = false, active = false, closed = false, generation = 0, seq = 0, lastSeq = -1;
  let challenge = null, receivedChallenge = null, held = false, sampleDeadline = 0;
  let lastChallengeGeneration = -1;
  let authorization = null;
  let gesture = null, reference = null, holdSeq = 0;
  let receivedGesture = null, receivedReference = null, receivedHoldSeq = 0;
  let releasedHoldSeq = 0;
  const clearGesture = () => { gesture = null; reference = null; };
  let setupTimer = null, pulseTimer = null, iceTimer = null, rejectIce = null, setupDeadline = 0;
  let lastClock = -1;
  function clock() {
    const value = now();
    if (!Number.isFinite(value) || value < 0 || value < lastClock) { close('invalid-clock'); return NaN; }
    lastClock = value; return value;
  }
  function wallTime() {
    const value = wallNow();
    if (!integer(value)) throw new Error('Invalid pairing clock.');
    return value;
  }
  const freshToken = () => {
    const bytes = randomBytes(32);
    if (!(bytes instanceof Uint8Array) || bytes.length !== 32) throw new Error('Secure randomness unavailable.');
    return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  };
  const inputReady = () => {
    if (role !== 'phone' || closed || status !== 'connected' || !receivedChallenge) return false;
    const timestamp = now();
    return Number.isFinite(timestamp) && timestamp >= lastClock && timestamp >= receivedChallenge.receivedAt
      && timestamp - receivedChallenge.receivedAt < PHONE_CHALLENGE_LIFETIME_MS;
  };
  const getState = () => ({ role, status, approved, active, inputReady: inputReady() });
  const publish = () => onState(getState());
  const release = reason => {
    if (held) { held = false; onRelease(reason); }
  };
  function close(reason = 'closed') {
    if (closed) return;
    closed = true; approved = false; active = false; challenge = null; receivedChallenge = null; authorization = null;
    clearGesture(); receivedGesture = null; receivedReference = null;
    for (const timer of [setupTimer, pulseTimer, iceTimer]) if (timer !== null) timers.clearTimeout(timer);
    rejectIce?.(new Error('Pairing closed.')); rejectIce = null;
    release(reason);
    if (channel) { channel.onopen = channel.onclose = channel.onerror = channel.onmessage = null; channel.close(); }
    if (pc) { pc.ondatachannel = pc.onconnectionstatechange = pc.onicegatheringstatechange = null; pc.close(); }
    pairing = null; status = 'closed'; publish(); onClose(reason);
  }
  function send(message) {
    if (closed || channel?.readyState !== 'open' || channel.bufferedAmount > 0) return false;
    const json = JSON.stringify(message);
    if (json.length > MESSAGE_LIMIT) return false;
    try { channel.send(json); return true; } catch { close('send-failed'); return false; }
  }
  function issueChallenge() {
    if (closed || !approved || channel?.readyState !== 'open') return;
    const timestamp = clock();
    if (!Number.isFinite(timestamp)) return;
    const next = { token: freshToken(), issuedAt: timestamp, generation: generation + 1 };
    if (send({ type: 'challenge', session: pairing.session, generation: next.generation, challenge: next.token, authorization })) {
      generation = next.generation; challenge = next;
    }
  }
  function pulse() {
    if (closed) return;
    const timestamp = clock();
    if (!Number.isFinite(timestamp)) return;
    if (role === 'host') {
      if (held && timestamp >= sampleDeadline) {
        approved = false; challenge = null; authorization = null; release('stale'); publish();
      }
      // At a 50 ms sensor/send/guard cadence, 100 ms rotation leaves room within
      // the consumer's 250 ms guard for one lost frame and one guard tick.
      // New challenges never extend an accepted sample's receiver-clock deadline.
      if (!challenge || timestamp - challenge.issuedAt >= PHONE_CHALLENGE_INTERVAL_MS) issueChallenge();
    } else if (receivedChallenge && timestamp - receivedChallenge.receivedAt >= PHONE_CHALLENGE_LIFETIME_MS) {
      receivedChallenge = null; active = false; clearGesture(); publish();
    }
    pulseTimer = timers.setTimeout(pulse, 50);
  }
  function receive(event) {
    if (closed || typeof event.data !== 'string' || event.data.length > MESSAGE_LIMIT) return;
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (!message || message.session !== pairing?.session) return;
    if (role === 'phone') {
      if (!exact(message, ['type', 'session', 'generation', 'challenge', 'authorization']) || message.type !== 'challenge'
        || !integer(message.generation) || !token(message.challenge) || !token(message.authorization)) return;
      if (message.generation <= lastChallengeGeneration) return;
      const wasReady = inputReady();
      const timestamp = clock();
      if (!Number.isFinite(timestamp)) return;
      const authorizationChanged = message.authorization !== authorization;
      if (!wasReady || authorizationChanged) { active = false; clearGesture(); }
      authorization = message.authorization;
      lastChallengeGeneration = message.generation;
      receivedChallenge = { ...message, receivedAt: timestamp };
      if (!wasReady || authorizationChanged) publish();
      return;
    }
    if (message.type === 'release') {
      if (!exact(message, ['type', 'session', 'seq', 'generation', 'authorization', 'gesture', 'holdSeq']) || !integer(message.seq)
        || message.seq <= lastSeq || !integer(message.generation) || message.generation > generation
        || !token(message.gesture) || !integer(message.holdSeq) || message.holdSeq < 1
        || message.holdSeq < receivedHoldSeq || message.holdSeq <= releasedHoldSeq
        || (message.holdSeq === receivedHoldSeq && message.gesture !== receivedGesture)
        || message.authorization !== authorization) return;
      lastSeq = message.seq; releasedHoldSeq = message.holdSeq;
      generation += 1; challenge = null; release('released'); issueChallenge(); return;
    }
    if (!exact(message, ['type', 'session', 'seq', 'generation', 'challenge', 'authorization', 'gesture', 'holdSeq', 'reference', 'quaternion', 'sampleAgeMs', 'held'])
      || message.type !== 'pose' || message.held !== true || !approved || !challenge
      || !integer(message.seq) || message.seq <= lastSeq || message.generation !== generation
      || message.challenge !== challenge.token || message.authorization !== authorization
      || !token(message.gesture) || !integer(message.holdSeq) || message.holdSeq < 1 || message.holdSeq < receivedHoldSeq
      || message.holdSeq <= releasedHoldSeq
      || !Number.isFinite(message.sampleAgeMs) || message.sampleAgeMs < 0) return;
    const q = quaternion(message.quaternion);
    const pressReference = quaternion(message.reference);
    const timestamp = clock();
    if (!Number.isFinite(timestamp)) return;
    const age = timestamp - challenge.issuedAt + message.sampleAgeMs;
    if (!q || !pressReference || age < 0 || age >= PHONE_CHALLENGE_LIFETIME_MS) return;
    if (message.holdSeq === receivedHoldSeq) {
      if (message.gesture !== receivedGesture || !pressReference.every((value, index) => value === receivedReference[index])) return;
    } else {
      if (message.gesture === receivedGesture) return;
      release('new-hold');
      // A consumer may synchronously revoke approval while releasing ownership.
      if (closed || !approved || message.authorization !== authorization
        || message.generation !== generation || message.challenge !== challenge?.token) return;
      receivedGesture = message.gesture; receivedReference = pressReference; receivedHoldSeq = message.holdSeq;
    }
    lastSeq = message.seq; held = true;
    sampleDeadline = challenge.issuedAt + PHONE_CHALLENGE_LIFETIME_MS - message.sampleAgeMs;
    onSample({ quaternion: q, reference: [...receivedReference], gesture: receivedGesture, holdSeq: receivedHoldSeq,
      seq: message.seq, generation, held: true, sampleAgeMs: age, receivedAt: timestamp });
  }
  function attach(candidate) {
    if (closed) { candidate.close(); return; }
    if (channel || candidate.label !== LABEL || candidate.protocol !== PROTOCOL
      || candidate.ordered !== false || candidate.maxRetransmits !== 0 || candidate.maxPacketLifeTime != null) {
      candidate.close(); close('invalid-channel'); return;
    }
    channel = candidate;
    channel.onmessage = receive;
    channel.onerror = () => close('channel-error');
    channel.onclose = () => close('disconnected');
    channel.onopen = () => {
      if (closed || status === 'connected') return;
      const timestamp = clock();
      if (!Number.isFinite(timestamp) || timestamp >= setupDeadline) { close('pairing-expired'); return; }
      status = 'connected'; timers.clearTimeout(setupTimer); setupTimer = null;
      approved = false; active = false; publish(); pulse();
    };
  }
  function initialize() {
    if (closed || status !== 'idle') throw new Error('Pairing is single-use. Start a new pairing.');
    status = 'preparing'; publish();
    pc = createPeerConnection({ iceServers: [], iceTransportPolicy: 'all' });
    pc.onconnectionstatechange = () => {
      if (!closed && ['failed', 'disconnected', 'closed'].includes(pc.connectionState)) close('disconnected');
    };
    // Phone tolerates small wall-clock skew; the originating host retains its own
    // strict wall-clock expiry AND monotonic setup deadline, never renewed by codes.
    const lifetime = Math.min(PHONE_PAIR_LIFETIME_MS, Math.max(0, pairing.expiresAt - wallTime() + (role === 'phone' ? 30_000 : 0)));
    setupDeadline = clock() + lifetime;
    if (closed) throw new Error('Invalid pairing clock.');
    setupTimer = timers.setTimeout(() => close('pairing-expired'), lifetime);
    if (role === 'host') attach(pc.createDataChannel(LABEL, { protocol: PROTOCOL, ordered: false, maxRetransmits: 0 }));
    else pc.ondatachannel = event => attach(event.channel);
  }
  async function localDescription(description) {
    await pc.setLocalDescription(description);
    if (closed) throw new Error('Pairing closed.');
    if (pc.iceGatheringState !== 'complete') await new Promise((resolve, reject) => {
      rejectIce = reject;
      iceTimer = timers.setTimeout(() => { reject(new Error('Local network gathering timed out.')); close('ice-timeout'); }, 8000);
      pc.onicegatheringstatechange = () => {
        if (closed || pc.iceGatheringState !== 'complete') return;
        timers.clearTimeout(iceTimer); iceTimer = null; rejectIce = null;
        pc.onicegatheringstatechange = null; resolve();
      };
    });
    if (closed) throw new Error('Pairing closed.');
    const result = encode({ ...pairing, kind: description.type, sdp: checkSdp(pc.localDescription.sdp) });
    if (result.length > PHONE_PAIR_CODE_LIMIT) throw new Error('Pairing code is too large.');
    return result;
  }
  async function createOffer() {
    if (role !== 'host' || status !== 'idle') throw new Error('Host pairing is single-use.');
    pairing = { v: 1, mode: 'demo-only', kind: 'offer', session: freshToken(), secret: freshToken(), expiresAt: wallTime() + PHONE_PAIR_LIFETIME_MS, sdp: '' };
    try {
      initialize(); const description = await pc.createOffer();
      if (closed) throw new Error('Pairing closed.');
      const code = await localDescription(description);
      status = 'waiting'; publish(); return code;
    } catch (error) { close('pairing-failed'); throw error; }
  }
  async function acceptOffer(code) {
    if (role !== 'phone' || status !== 'idle') throw new Error('Phone pairing is single-use.');
    const value = decode(code, wallTime(), 30_000);
    if (value.kind !== 'offer') throw new Error('Expected a host offer.');
    for (const [session, expiry] of usedOffers) if (expiry <= wallTime()) usedOffers.delete(session);
    if (usedOffers.has(value.session) || usedOffers.size >= 128) throw new Error('Offer already used or pairing capacity reached.');
    usedOffers.set(value.session, value.expiresAt + 30_000); pairing = value;
    try {
      initialize(); await pc.setRemoteDescription({ type: 'offer', sdp: value.sdp });
      if (closed) throw new Error('Pairing closed.');
      const description = await pc.createAnswer();
      if (closed) throw new Error('Pairing closed.');
      const answer = await localDescription(description);
      status = 'connecting'; publish(); return answer;
    } catch (error) { close('pairing-failed'); throw error; }
  }
  async function acceptAnswer(code) {
    if (role !== 'host' || status !== 'waiting' || closed) throw new Error('No pending host offer.');
    const timestamp = clock();
    if (!Number.isFinite(timestamp) || timestamp >= setupDeadline) { close('pairing-expired'); throw new Error('Host pairing expired.'); }
    const value = decode(code, wallTime());
    if (value.kind !== 'answer' || value.session !== pairing.session || value.secret !== pairing.secret
      || value.expiresAt !== pairing.expiresAt) throw new Error('Answer does not match this pairing.');
    status = 'connecting'; publish();
    try {
      await pc.setRemoteDescription({ type: 'answer', sdp: value.sdp });
      if (closed) throw new Error('Pairing closed.');
    } catch (error) { close('pairing-failed'); throw error; }
  }
  function setApproved(value) {
    if (role !== 'host' || closed || status !== 'connected') return false;
    approved = value === true; generation += 1; challenge = null;
    authorization = approved ? freshToken() : null;
    release('approval-changed'); if (approved) issueChallenge(); publish(); return approved;
  }
  function setActive(value, options = {}) {
    if (role !== 'phone' || closed || status !== 'connected') return false;
    if (value === true && !inputReady()) return false;
    const pressReference = options.reference === undefined ? null : quaternion(options.reference);
    if (value === true && options.reference !== undefined && !pressReference) return false;
    if (value !== true && active && receivedChallenge) send({ type: 'release', session: pairing.session, seq: ++seq,
      generation: receivedChallenge.generation, authorization: receivedChallenge.authorization, gesture, holdSeq });
    active = value === true;
    if (active) { gesture = freshToken(); reference = pressReference; holdSeq += 1; }
    else clearGesture();
    publish(); return active;
  }
  function sendPose(sample) {
    if (role !== 'phone' || !active || closed || status !== 'connected' || !receivedChallenge) return false;
    if (sample?.held === false) { setActive(false); return false; }
    const timestamp = clock();
    if (!Number.isFinite(timestamp)) return false;
    if (!exact(sample, ['quaternion', 'sampleAgeMs', 'held']) || sample.held !== true
      || !Number.isFinite(sample.sampleAgeMs) || sample.sampleAgeMs < 0
      || timestamp - receivedChallenge.receivedAt + sample.sampleAgeMs >= PHONE_CHALLENGE_LIFETIME_MS) return false;
    const q = quaternion(sample.quaternion);
    if (!q) return false;
    if (!reference) reference = [...q];
    // No pending queue: a busy channel drops the sample; later sends use fresh input only.
    return send({ type: 'pose', session: pairing.session, seq: ++seq, generation: receivedChallenge.generation,
      challenge: receivedChallenge.challenge, authorization: receivedChallenge.authorization,
      gesture, holdSeq, reference, quaternion: q, sampleAgeMs: sample.sampleAgeMs, held: true });
  }
  return { createOffer, acceptOffer, acceptAnswer, setApproved, setActive, sendPose, close, getState };
}
