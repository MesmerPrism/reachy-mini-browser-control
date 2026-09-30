// The same bounded SO(3) validation used for measured server poses. This module
// has no Node/browser side effects and admits only measured state, never targets.
import { rigidPose } from '../server/head-pose.mjs';

export const MODEL_READ_MAX_AGE_MS = 1500;
export const MODEL_SNAPSHOT_MAX_AGE_MS = 500;
export const IDENTITY_MATRIX = Object.freeze([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
// Operator comparison with the physical robot confirmed that the control
// bridge's named feedback sides are opposite the pinned model's joint sides.
// Correct the view only; preserve source pivots/axes and motor command routing.
export const MODEL_ANTENNA_FEEDBACK_SIDE = Object.freeze({ right: 'left', left: 'right' });

function matrix(value) {
  const input = value?.m ?? value;
  const flat = Array.isArray(input) && input.length === 4 && input.every(row => Array.isArray(row) && row.length === 4)
    ? input.flat() : input;
  return rigidPose(flat);
}

export function multiplyMatrices(a, b) {
  return Array.from({ length: 16 }, (_, index) => {
    const row = Math.floor(index / 4), col = index % 4;
    return [0,1,2,3].reduce((sum, k) => sum + a[row*4+k]*b[k*4+col], 0);
  });
}

// Three.js Matrix4.fromArray uses column-major elements. Keep native RH Z-up;
// transposing memory layout is not a camera-basis or handedness conversion.
export function toColumnMajor(value) {
  return Array.from({ length: 16 }, (_, i) => value[(i % 4)*4 + Math.floor(i / 4)]);
}

function axisRotation(axis, angle) {
  if (!Array.isArray(axis) || axis.length !== 3 || !axis.every(Number.isFinite) || !Number.isFinite(angle)) throw Error('Invalid model joint axis');
  const norm = Math.hypot(...axis);
  if (norm < 1e-8) throw Error('Invalid model joint axis');
  const [x,y,z] = axis.map(v => v / norm), c = Math.cos(angle), s = Math.sin(angle), t = 1-c;
  return [t*x*x+c,t*x*y-s*z,t*x*z+s*y,0, t*x*y+s*z,t*y*y+c,t*y*z-s*x,0,
    t*x*z-s*y,t*y*z+s*x,t*z*z+c,0, 0,0,0,1];
}

export function buildRobotTransforms(status, model) {
  if (!model || !Number.isFinite(model.neutralHeadHeight) || !model.bodyZero) throw Error('Source model bindings unavailable');
  if (!Number.isFinite(status?.bodyYaw)) throw Error('Measured body yaw unavailable');
  const measured = matrix(status.headPose), bodyZero = matrix(model.bodyZero);
  const neutral = [...IDENTITY_MATRIX]; neutral[11] = model.neutralHeadHeight;
  const head = multiplyMatrices(neutral, measured);
  const body = multiplyMatrices(bodyZero, axisRotation([0,0,1], status.bodyYaw));
  const antennas = {}, antennaLocal = {};
  // Read named bridge feedback through the observed model-side mapping, never
  // a bare-array order. Asset bindings retain the source pivot and signed axis.
  for (const side of ['right', 'left']) {
    const feedbackSide = MODEL_ANTENNA_FEEDBACK_SIDE[side];
    const binding = model.antennas?.[side], degrees = status.antennas?.[feedbackSide];
    if (!binding || !Number.isFinite(degrees)) throw Error(`Measured ${feedbackSide} antenna or ${side} model binding unavailable`);
    const sign = binding.sign ?? 1;
    if (sign !== 1 && sign !== -1) throw Error('Invalid model joint sign');
    const pivot = matrix(binding.pivotMatrix), zero = binding.zeroMatrix ? matrix(binding.zeroMatrix) : [...IDENTITY_MATRIX];
    antennaLocal[side] = multiplyMatrices(multiplyMatrices(pivot, axisRotation(binding.axis, sign*degrees*Math.PI/180)), zero);
    antennas[side] = multiplyMatrices(head, antennaLocal[side]);
  }
  // Body/head are siblings below the base. Head FK already incorporates body
  // yaw; multiplying by the body transform again would rotate it twice.
  // All five rendered entities are scene siblings in robot-base coordinates.
  return { base: [...IDENTITY_MATRIX], body, head, antennas, antennaLocal };
}

function unavailableReason(status, readAgeMs) {
  if (!status?.connected) return 'Robot disconnected';
  if (!Number.isFinite(readAgeMs) || readAgeMs < 0 || readAgeMs > MODEL_READ_MAX_AGE_MS) return 'Measured state delivery is stale';
  const snapshot = status.diagnostics?.snapshot;
  if (snapshot) {
    if (snapshot.error) return 'Robot snapshot failed';
    if (!Number.isFinite(snapshot.startAgeMs) || snapshot.startAgeMs < 0 || snapshot.startAgeMs > MODEL_SNAPSHOT_MAX_AGE_MS) return 'Robot snapshot exceeded the 500 ms freshness limit';
  }
  if (status.daemonReady === false || status.backendReady === false || status.daemonHealthy === false || status.error) return 'Robot daemon is unhealthy';
  // Existing adapter exposes current identity/backend health in blockedReason.
  // Historical diagnostics.lastFault is intentionally not a freshness signal.
  const blocked = status.blockedReason || '';
  if (/identity differs|hardware id.*(?:differs|mismatch)|version differs|daemon.*not ready|backend.*(?:unhealthy|not ready)|snapshot.*(?:unavailable|freshness|exceeded)|(?:head|antenna).*state unavailable/i.test(blocked)) return blocked;
  return null;
}

export function deriveRobotModelState({ session, status, statusReadAt, now, model, lastConfirmed = null }) {
  const readAgeMs = Number.isFinite(now) && Number.isFinite(statusReadAt) ? now-statusReadAt : Infinity;
  // These fields fence delivery only; they never claim atomic encoder sampling.
  const controlEpoch = Number.isInteger(status?.controlEpoch) ? status.controlEpoch : null;
  const sessionIdentity = { token: session?.token ?? null, mode: session?.mode ?? null,
    bootId: session?.robotBootId ?? session?.bootId ?? status?.robotBootId ?? status?.bootId ?? null };
  const previous = lastConfirmed?.qualified ? lastConfirmed : lastConfirmed?.confirmed ?? null;
  const sameSession = previous?.sessionIdentity && ['token', 'mode', 'bootId'].every(key => previous.sessionIdentity[key] === sessionIdentity[key]);
  // A new token, mode or declared boot may reuse epoch zero. Never freeze that
  // new session on an old robot's or simulation's confirmed geometry.
  const confirmed = sameSession ? previous : null;
  let reason = unavailableReason(status, readAgeMs), transforms = null;
  if (!reason && confirmed) {
    if (controlEpoch !== null && confirmed.controlEpoch !== null && controlEpoch < confirmed.controlEpoch) reason = 'Measured state belongs to an older control epoch';
    else if (controlEpoch === confirmed.controlEpoch && Number.isFinite(statusReadAt) && statusReadAt < confirmed.statusReadAt) reason = 'Measured state arrived out of order';
  }
  if (!reason) {
    try { transforms = buildRobotTransforms(status, model); }
    catch (error) { reason = error.message; }
  }
  const simulation = session?.mode === 'demo';
  const provenance = simulation ? 'simulated' : 'encoder_fk';
  if (reason) {
    return { qualified: false, frozen: !!confirmed?.transforms, transforms: confirmed?.transforms ?? null,
      confirmed, reason, label: confirmed?.transforms ? `Frozen — ${reason}` : `Unavailable — ${reason}`,
      readAgeMs: Number.isFinite(readAgeMs) ? readAgeMs : null, provenance: confirmed?.provenance ?? 'unknown', acquisitionAgeKnown: false,
      controlEpoch, statusReadAt, sessionIdentity };
  }
  const held = status.ready !== true;
  return { qualified: true, frozen: false, transforms, reason: null, confirmed: null,
    label: `${simulation ? 'Simulation' : 'Measured joints / estimated head pose'}${held ? ' · Control held' : ''}`,
    readAgeMs, provenance, acquisitionAgeKnown: false, controlEpoch, statusReadAt, sessionIdentity };
}
