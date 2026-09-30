// Wireless is deliberately a limited transport. SDK target calls only report
// that a frame was queued on WebRTC; they are never represented as applied.
import { rigidPose } from '../server/head-pose.mjs';
import { installWirelessTelemetryGuard } from './wireless-telemetry.mjs';
const RAD = Math.PI / 180;
const deg = value => value / RAD;
const rad = value => value * RAD;
const axes = ['yaw', 'pitch', 'roll', 'x', 'y', 'z'];
// v1.10's bundled emotion library names. Playback is sent through the pinned
// SDK's documented `sendRaw` escape hatch because SDK 1.8 has no typed catalog
// or recorded-move helper. It remains queued-only.
// Exact `.json` stems from the official corpus read 2026-09-27. This remains
// a bounded cached list: the daemon can still reject an unavailable download.
export const WIRELESS_EMOTES = Object.freeze(['amazed1','anxiety1','attentive1','attentive2','boredom1','boredom2','calming1','cheerful1','come1','confused1','contempt1','curious1','dance1','dance2','dance3','disgusted1','displeased1','displeased2','downcast1','dying1','electric1','enthusiastic1','enthusiastic2','exhausted1','fear1','frustrated1','furious1','go_away1','grateful1','helpful1','helpful2','impatient1','impatient2','incomprehensible2','indifferent1','inquiring1','inquiring2','inquiring3','irritated1','irritated2','laughing1','laughing2','lonely1','lost1','loving1','mini-deep-sleep','no1','no_excited1','no_sad1','oops1','oops2','proud1','proud2','proud3','rage1','relief1','relief2','reprimand1','reprimand2','reprimand3','resigned1','sad1','sad2','scared1','serenity1','shy1','sleep1','success1','success2','surprised1','surprised2','thoughtful1','thoughtful2','tired1','toc-toc-toc','uncertain1','uncomfortable1','understanding1','understanding2','waiting','wake-mini-up','welcoming1','welcoming2','yes1','yes_sad1']);

function finite(value, name) {
  if (!Number.isFinite(value)) throw Error(`${name} must be finite`);
  return value;
}

function poseParts(matrix) {
  const pose = rigidPose(matrix);
  const pitch = Math.asin(Math.max(-1, Math.min(1, -pose[8])));
  const gimbal = Math.abs(Math.cos(pitch)) < 1e-7;
  return {
    yaw: deg(gimbal ? Math.atan2(-pose[1], pose[5]) : Math.atan2(pose[4], pose[0])),
    pitch: deg(pitch),
    roll: deg(gimbal ? 0 : Math.atan2(pose[9], pose[10])),
    x: pose[3] * 1000, y: pose[7] * 1000, z: pose[11] * 1000,
  };
}

// Daemon wire matrices are flat row-major homogeneous transforms. RzRyRx is
// the daemon's documented Euler convention; translations are metres on wire.
function poseMatrix({ yaw, pitch, roll, x, y, z }) {
  const Y = rad(yaw), P = rad(pitch), R = rad(roll);
  const cy = Math.cos(Y), sy = Math.sin(Y), cp = Math.cos(P), sp = Math.sin(P), cr = Math.cos(R), sr = Math.sin(R);
  return [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr, x / 1000,
    sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr, y / 1000,
    -sp, cp * sr, cp * cr, z / 1000, 0, 0, 0, 1];
}

function step(from, to, seconds, angular = 20, linear = 10) {
  const ad = Math.hypot(...['yaw', 'pitch', 'roll'].map(axis => to[axis] - from[axis]));
  const ld = Math.hypot(...['x', 'y', 'z'].map(axis => to[axis] - from[axis]));
  const scale = Math.min(1, ad ? angular * seconds / ad : 1, ld ? linear * seconds / ld : 1);
  return Object.fromEntries(axes.map(axis => [axis, from[axis] + (to[axis] - from[axis]) * scale]));
}

export class WirelessControl {
  constructor({ ReachyMini, expectedVersion = '1.10.0', now = () => Date.now(), connectionTimeoutMs = 5000 }) {
    if (typeof ReachyMini !== 'function') throw Error('ReachyMini SDK constructor is required');
    if (!Number.isFinite(connectionTimeoutMs) || connectionTimeoutMs <= 0 || connectionTimeoutMs > 30000) throw Error('Identity timeout must be from 1 to 30000 milliseconds');
    this.connectionTimeoutMs = connectionTimeoutMs;
    this.ReachyMini = ReachyMini; this.expectedVersion = expectedVersion; this.now = now;
    this.sdk = null; this.robotId = null; this.hardwareId = null; this.version = null;
    this.measured = null; this.lastSent = null; this.epoch = 0; this.uncertain = null; this.listeners = new Set(); this.detachVideo = null;
    this.onState = event => { if (this.sdk?.state === 'streaming') this.#recordState(event?.detail ?? this.sdk?.robotState); };
    this.onSessionStopped = () => { this.measured = null; this.lastSent = null; ++this.epoch; this.#emit(); };
  }

  get capabilities() {
    return Object.freeze({ limitedTransport: true, ownership: 'session-only', targetAcknowledgement: 'queued-only',
      remoteVideo: true, remoteAudioAttachment: true, microphoneTransmit: 'pinned-sdk-extension', autoWake: false, autoReconnect: false });
  }

  // Deliberately narrow escape hatch for the version-pinned media adapter.
  // UI code must use this class's command methods, never raw SDK motion calls.
  get robot() { return this.sdk; }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  #emit() { const value = this.snapshot(); for (const listener of this.listeners) listener(value); }
  #recordState(state) {
    try {
      const head = poseParts(state?.head); const antennas = state?.antennas;
      if (!Array.isArray(antennas) || antennas.length !== 2 || !antennas.every(Number.isFinite) || !Number.isFinite(state?.body_yaw) || typeof state.is_move_running !== 'boolean' || !['enabled','disabled','gravity_compensation'].includes(state.motor_mode)) return;
      if (this.lastSent && (state.is_move_running || state.motor_mode!=='enabled')) {this.lastSent=null;++this.epoch;}
      this.measured = { head, headMatrix: rigidPose(state.head), antennas: { right: deg(antennas[0]), left: deg(antennas[1]) },
        bodyYaw: deg(state.body_yaw), bodyYawRad: state.body_yaw, awake: state.motor_mode === 'enabled', running: state.is_move_running === true, receivedAt: this.now() };
      this.#emit();
    } catch { /* malformed telemetry never becomes a command baseline */ }
  }

  snapshot() {
    const age=this.measured ? this.now()-this.measured.receivedAt : Infinity;
    const fresh = age>=0 && age<=1500;
    const connected = this.sdk?.state === 'streaming';
    return { connected, ready: connected && !this.uncertain && !!this.hardwareId && this.version === this.expectedVersion && fresh,
      awake: fresh && this.measured.awake, measured: this.measured ? { ...this.measured, head: { ...this.measured.head }, antennas: { ...this.measured.antennas } } : null,
      hardwareId: this.hardwareId, version: this.version, uncertain: this.uncertain, controlEpoch: this.epoch, ...this.capabilities,
      message: 'Wireless commands are queued only; application and Stop hold are unconfirmed.' };
  }

  async connect({ token, robotId, pickRobot, video } = {}) {
    await this.close();
    const sdk = new this.ReachyMini({ autoStartFromUrl: false, appName: 'Reachy Mini Browser Control' });
    this.detachTelemetry = installWirelessTelemetryGuard(sdk, { now: this.now, onInvalid: () => {
      if (this.sdk !== sdk) return;
      this.measured = null; this.lastSent = null; ++this.epoch; this.#emit();
    } });
    this.sdk = sdk; sdk.addEventListener?.('state', this.onState); sdk.addEventListener?.('sessionStopped', this.onSessionStopped);
    try {
      const authenticated = token ? false : (typeof sdk.authenticate === 'function' ? await sdk.authenticate() : false);
      if (!token && !authenticated) throw Error('Sign in to Hugging Face before selecting a robot');
      await sdk.connect(token); // token is deliberately not retained by this class.
      const robots = await this.#robots(sdk);
      const selected = robotId ?? (robots.length === 1 ? robots[0]?.id : await pickRobot?.(robots));
      if (!selected || !robots.some(robot => robot?.id === selected)) throw Error('Select one available Wireless Reachy Mini');
      // The SDK can emit its first video track while startSession is pending.
      // Attach before it so the initial camera stream is not lost.
      if (video) this.detachVideo = this.#attachVideo(sdk, video);
      await sdk.startSession(selected);
      let identityTimer;
      const identityDeadline = new Promise((_, reject) => {
        identityTimer = setTimeout(() => reject(Error('Wireless robot identity and version check timed out')), this.connectionTimeoutMs);
      });
      let hardwareId, version;
      try { [hardwareId, version] = await Promise.race([Promise.all([sdk.getHardwareId(), sdk.getVersion()]), identityDeadline]); }
      finally { clearTimeout(identityTimer); }
      if (!hardwareId || version !== this.expectedVersion) throw Error('Wireless robot identity or daemon version is not supported');
      this.robotId = selected; this.hardwareId = hardwareId; this.version = version; sdk.requestState(); this.#emit();
      return { robotId: selected, hardwareId, version, limitedTransport: true };
    } catch (error) { await this.close(); throw error; }
  }

  #robots(sdk) {
    if (Array.isArray(sdk.robots) && sdk.robots.length) return Promise.resolve(sdk.robots);
    return new Promise((resolve, reject) => {
      const onRobots = event => { const robots = event?.detail?.robots ?? sdk.robots; if (Array.isArray(robots) && robots.length) { clearTimeout(timer); sdk.removeEventListener?.('robotsChanged', onRobots); resolve(robots); } };
      const timer = setTimeout(() => { sdk.removeEventListener?.('robotsChanged', onRobots); reject(Error('No Wireless robots became available')); }, 5000);
      sdk.addEventListener?.('robotsChanged', onRobots);
    });
  }

  #freshVerified({ permitRunning = false } = {}) {
    const status = this.snapshot();
    if (!status.ready || !this.measured) throw Error('Fresh verified Wireless robot state is required');
    if (!permitRunning && this.measured.running) throw Error('Another move is reported running');
    return this.measured;
  }

  #targetEpoch(value) {
    if (!Number.isInteger(value) || value !== this.epoch) throw Error('Wireless target belongs to an expired control epoch');
  }
  #latchUnknown(action, error) { this.uncertain = `${action} outcome is unknown: ${error?.message || 'no daemon response'}`; this.#emit(); }

  #freshAwake({ permitRunning = false } = {}) {
    const measured = this.#freshVerified({ permitRunning });
    if (!measured.awake) throw Error('Wake Reachy before moving it');
    return measured;
  }

  #queued(value, action) { return { queued: value === true, confirmed: false, action, controlEpoch: this.epoch, limitedTransport: true }; }

  async command(input) {
    const action = input?.action;
    if (!this.sdk || this.sdk.state !== 'streaming') throw Error('Wireless session is not streaming');
    if (action === 'wake') { this.#freshVerified(); try { await this.sdk.wakeUp(); this.sdk.requestState(); return { queued: true, confirmed: true, action }; } catch (error) { this.#latchUnknown(action, error); throw error; } }
    if (action === 'sleep') { this.#freshVerified(); ++this.epoch; try { await this.sdk.gotoSleep(); this.sdk.requestState(); return { queued: true, confirmed: true, action, controlEpoch: this.epoch }; } catch (error) { this.#latchUnknown(action, error); throw error; } }
    if (action === 'volume') { this.#freshVerified(); const value = input.value; if (!Number.isInteger(value) || value < 0 || value > 100) throw Error('Volume must be an integer from 0 to 100'); try { const applied = await this.sdk.setVolume(value); if (!Number.isInteger(applied) || applied<0 || applied>100) throw Error('No valid volume response'); return { queued: true, confirmed: true, action, value: applied }; } catch (error) { this.#latchUnknown(action, error); throw error; } }
    if (action === 'stop') return this.stop();
    if (action === 'emote') {
      this.#targetEpoch(input.epoch);
      this.#freshAwake(); if (!WIRELESS_EMOTES.includes(input.name)) throw Error('Choose an available Wireless emote');
      return this.#queued(this.sdk.sendRaw({ type: 'play_recorded_move', move_name: input.name }), action);
    }
    if (action === 'head-manual') { this.#targetEpoch(input.epoch); return this.#head(input.pose, input.speed); }
    if (action === 'antennas') { this.#targetEpoch(input.epoch); return this.#antennas(input.targets); }
    throw Error('Unknown Wireless command');
  }

  #head(pose, speed = 20) {
    const measured = this.#freshAwake(); const source = measured.head;
    if (!Number.isFinite(speed) || speed < 5 || speed > 30) throw Error('Head speed must be from 5 to 30 degrees per second');
    const goal = { ...source };
    for (const axis of axes) if (pose?.[axis] !== undefined) goal[axis] = finite(pose[axis], axis);
    if (Object.keys(pose ?? {}).length === 0 || Object.keys(pose).some(axis => !axes.includes(axis))) throw Error('Choose valid head axes');
    if (Math.abs(goal.yaw) > 20 || Math.abs(goal.pitch) > 15 || Math.abs(goal.roll) > 15 || ['x', 'y', 'z'].some(axis => Math.abs(goal[axis]) > 10)) throw Error('Head target exceeds Wireless limits');
    const base = this.lastSent?.head ?? source; const elapsed = Math.max(0, Math.min(.05, (this.now() - (this.lastSent?.at ?? this.now())) / 1000));
    const next = step(base, goal, elapsed, speed); const sent = this.sdk.setTarget({ head: poseMatrix(next), body_yaw: measured.bodyYawRad });
    if (sent === true) this.lastSent = { ...this.lastSent, head: next, at: this.now(), epoch: this.epoch }; return this.#queued(sent, 'head-manual');
  }

  #antennas(targets) {
    const measured = this.#freshAwake(); if (!targets || Object.keys(targets).some(axis => axis !== 'left' && axis !== 'right')) throw Error('Choose valid antenna axes');
    const goal = { ...measured.antennas }; for (const side of ['left', 'right']) if (targets[side] !== undefined) goal[side] = finite(targets[side], side);
    if (Object.keys(targets).length === 0 || Math.max(Math.abs(goal.left), Math.abs(goal.right)) > 90) throw Error('Antenna target exceeds 90 degrees');
    const base = this.lastSent?.antennas ?? measured.antennas; const elapsed = Math.max(0, Math.min(.05, (this.now() - (this.lastSent?.at ?? this.now())) / 1000));
    const distance = Math.hypot(goal.left - base.left, goal.right - base.right); const scale = distance ? Math.min(1, 120 * elapsed / distance) : 1;
    const next = { left: base.left + (goal.left - base.left) * scale, right: base.right + (goal.right - base.right) * scale };
    const sent = this.sdk.setTarget({ antennas: [rad(next.right), rad(next.left)] }); if (sent === true) this.lastSent = { ...this.lastSent, antennas: next, at: this.now(), epoch: this.epoch }; return this.#queued(sent, 'antennas');
  }

  stop() {
    const epoch = ++this.epoch; this.lastSent = null;
    const measured = this.measured; const stopped = this.sdk.sendRaw?.({ type: 'stop_move' }) === true;
    const age=measured ? this.now()-measured.receivedAt : Infinity;
    const held = measured?.awake && age>=0 && age<=1500 ? this.sdk.setTarget({ head: measured.headMatrix, antennas: [rad(measured.antennas.right), rad(measured.antennas.left)], body_yaw: measured.bodyYawRad }) === true : false;
    return { queued: stopped || held, confirmed: false, action: 'stop', controlEpoch: epoch, holdQueued: held, message: 'Stop and measured-pose hold were queued; neither is confirmed.' };
  }

  #attachVideo(sdk, video) {
    const detach = sdk.attachVideo(video);
    return typeof detach === 'function' ? detach : null;
  }
  attachVideo(video) {
    if (!this.sdk) throw Error('Start a Wireless session first');
    this.detachVideo?.();
    this.detachVideo = this.#attachVideo(this.sdk, video);
    return this.detachVideo;
  }
  subscribePose() { return this.sdk?.subscribePose?.() === true; }
  unsubscribePose() { return this.sdk?.unsubscribePose?.() === true; }
  async close() {
    ++this.epoch; this.lastSent = null; const sdk = this.sdk; const detachVideo = this.detachVideo; this.sdk = null; this.detachVideo = null; this.robotId = null; this.hardwareId = null; this.version = null; this.measured = null; this.uncertain = null;
    try { detachVideo?.(); } catch { /* teardown must continue even if a media element was removed */ }
    this.detachTelemetry?.(); this.detachTelemetry = null;
    if (sdk) { sdk.removeEventListener?.('state', this.onState); sdk.removeEventListener?.('sessionStopped', this.onSessionStopped); try { await sdk.stopSession?.(); } finally { sdk.disconnect?.(); sdk._token = null; } }
    this.#emit();
  }
}
