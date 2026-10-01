const AXES = ['yaw', 'pitch', 'roll'];
export const XR_HEAD_LIMITS = Object.freeze({ yaw: 20, pitch: 15, roll: 15 });
const degrees = 180 / Math.PI;
const clamp = (v, cap) => Math.max(-cap, Math.min(cap, v));
export const xrStopAllowed = (engaged, requested, armedKey, currentKey, demo) =>
  engaged && requested && armedKey === currentKey && !demo;

export function normalizeXRQuaternion(value) {
  const q = Array.isArray(value) ? value : value && [value.x, value.y, value.z, value.w];
  if (!q || q.length !== 4 || !q.every(Number.isFinite)) return null;
  const length = Math.hypot(...q);
  return Number.isFinite(length) && length > 0.001 ? q.map(v => v / length) : null;
}

// WebXR is right/up/back; Reachy is forward/left/up. Orientation only:
// positive Reachy yaw turns left, positive pitch nods down, positive roll
// raises the left side. Translation deliberately remains unchanged.
export function mapXRHeadPose(orientation, reference, baseline, limits = XR_HEAD_LIMITS) {
  const a = normalizeXRQuaternion(reference), b = normalizeXRQuaternion(orientation);
  if (!a || !b || !AXES.every(axis => Number.isFinite(baseline?.[axis]) && Number.isFinite(limits[axis]) && limits[axis] >= 0)) return null;
  const [ax, ay, az, aw] = [-a[0], -a[1], -a[2], a[3]], [bx, by, bz, bw] = b;
  const x = aw * bx + ax * bw + ay * bz - az * by;
  const y = aw * by - ax * bz + ay * bw + az * bx;
  const z = aw * bz + ax * by - ay * bx + az * bw;
  const w = aw * bw - ax * bx - ay * by - az * bz;
  // Euler YXZ gives stable headset yaw, pitch and roll near the neutral pose.
  const m13 = 2 * (x * z + w * y), m33 = 1 - 2 * (x * x + y * y);
  const m23 = 2 * (y * z - w * x), m21 = 2 * (x * y + w * z), m22 = 1 - 2 * (x * x + z * z);
  const pitch = Math.asin(-clamp(m23, 1));
  const yaw = Math.abs(m23) < 0.9999999 ? Math.atan2(m13, m33) : Math.atan2(-2 * (x * z - w * y), 1 - 2 * (y * y + z * z));
  const roll = Math.abs(m23) < 0.9999999 ? Math.atan2(m21, m22) : 0;
  return { yaw: clamp(baseline.yaw + yaw * degrees, limits.yaw), pitch: clamp(baseline.pitch - pitch * degrees, limits.pitch), roll: clamp(baseline.roll - roll * degrees, limits.roll) };
}

// A new session always starts disarmed. Lost tracking/gates never re-arm it.
export function createXRHeadFollowGuard({ maxGapMs = 250, speedDegPerSecond = 20 } = {}) {
  let generation = 0, armed = null;
  return {
    beginSession() { armed = null; return ++generation; },
    endSession() { armed = null; generation++; },
    disarm() { const wasArmed = !!armed; armed = null; return wasArmed; },
    get armed() { return !!armed; },
    arm(token, orientation, baseline, limits, now) {
      const q = normalizeXRQuaternion(orientation);
      if (token !== generation || !q || !Number.isFinite(now) || !AXES.every(axis => Number.isFinite(baseline?.[axis]) && Number.isFinite(limits?.[axis]) && limits[axis] >= 0 && Math.abs(baseline[axis]) <= limits[axis])) return false;
      armed = { reference: q, baseline: { ...baseline }, previous: { ...baseline }, limits: { ...limits }, at: now };
      return true;
    },
    update(token, orientation, now, { allowed = false, visible = false } = {}) {
      if (token !== generation || !armed) return null;
      const elapsed = now - armed.at;
      if (!allowed || !visible || !Number.isFinite(now) || elapsed < 0 || elapsed > maxGapMs) { armed = null; return null; }
      const mapped = mapXRHeadPose(orientation, armed.reference, armed.baseline, armed.limits);
      if (!mapped) { armed = null; return null; }
      const step = speedDegPerSecond * Math.min(elapsed / 1000, 0.1);
      const target = Object.fromEntries(AXES.map(axis => [axis, armed.previous[axis] + clamp(mapped[axis] - armed.previous[axis], step)]));
      armed.previous = target; armed.at = now;
      return target;
    },
  };
}
