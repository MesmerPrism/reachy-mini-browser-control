import { mapXRHeadPose, normalizeXRQuaternion } from './xr-head-follow.mjs';

export const PHONE_HEAD_LIMITS = Object.freeze({ yaw: 20, pitch: 15, roll: 15 });
const axes = Object.keys(PHONE_HEAD_LIMITS);
const fresh = (timestamp, now, maxAgeMs = 250) => Number.isFinite(timestamp) && timestamp >= 0 && timestamp <= now && now - timestamp <= maxAgeMs;

// Convert a wall-clock telemetry receipt into the caller's monotonic timeline.
// Subtract a millisecond for wall-clock rounding uncertainty; never move a
// receipt forward to make it fresh. A future receipt also detects wall rollback.
export function conservativeBaselineReceipt(receivedAt, wallNow, monotonicNow) {
  if (![receivedAt, wallNow, monotonicNow].every(value => Number.isFinite(value) && value >= 0)
    || receivedAt > wallNow) return null;
  const converted = monotonicNow - (wallNow - receivedAt) - 1;
  return Number.isFinite(converted) && converted >= 0 ? converted : null;
}
const sampleValid = (sample, now) => normalizeXRQuaternion(sample?.quaternion)
  && fresh(sample?.receivedAt, now) && (sample.sampleAt === undefined || (fresh(sample.sampleAt, now) && sample.sampleAt <= sample.receivedAt))
  // Paired age is a conservative bound at receipt, not a synchronized source
  // timestamp. It may vary between packets; cached packets continue to age.
  && (sample.sampleAgeMs === undefined || (Number.isFinite(sample.sampleAgeMs) && sample.sampleAgeMs >= 0
    && sample.sampleAgeMs + (now - sample.receivedAt) <= 250));
const gatesValid = (gates, epoch) => gates?.held === true && gates.allowed === true
  && gates.visible === true && gates.demo === true && gates.epoch === epoch;
const pressReference = value => {
  const q = Array.isArray(value) ? value : value && [value.x, value.y, value.z, value.w];
  if (!q || q.length !== 4 || !q.every(Number.isFinite) || Math.abs(Math.hypot(...q) - 1) > 1e-6) return null;
  return normalizeXRQuaternion(q);
};

// Pure simulation-only input authority. Translation, body yaw and antennas are
// never returned. A fresh measured baseline is captured on EVERY engagement.
// The caller owns hold release, screen/source resets, watchdog ticks and staging.
export function createPhoneFollowGuard({ baselineMaxAgeMs = 1500 } = {}) {
  if (!Number.isFinite(baselineMaxAgeMs) || baselineMaxAgeMs < 0 || baselineMaxAgeMs > 1500) {
    throw new RangeError('Phone baseline age must be between 0 and 1500 milliseconds.');
  }
  let generation = 0, epoch = null, armed = null;
  const disarm = () => { const wasArmed = !!armed; armed = null; return wasArmed; };
  return {
    beginSession(nextEpoch) { disarm(); epoch = nextEpoch; return ++generation; },
    endSession() { disarm(); epoch = null; generation++; },
    disarm,
    get armed() { return !!armed; },
    arm(token, sample, baseline, options = {}) {
      disarm();
      const { now, baselineReceivedAt } = options;
      // A paired hold carries its press-time calibration separately from the
      // latest sample. Calibration has no freshness authority of its own.
      const reference = options.reference === undefined ? normalizeXRQuaternion(sample?.quaternion) : pressReference(options.reference);
      if (token !== generation || epoch === null || epoch === undefined || !Number.isFinite(now)
        || !reference || !gatesValid(options, epoch) || !sampleValid(sample, now) || !fresh(baselineReceivedAt, now, baselineMaxAgeMs)
        || !axes.every(axis => Number.isFinite(baseline?.[axis]) && Math.abs(baseline[axis]) <= PHONE_HEAD_LIMITS[axis])) return false;
      const rotation = Object.fromEntries(axes.map(axis => [axis, baseline[axis]]));
      armed = { reference, baseline: rotation,
        previous: rotation, at: now, observedAt: now, receipt: sample.receivedAt, sampleAt: sample.sampleAt,
        hasSampleAge: sample.sampleAgeMs !== undefined, source: sample.source,
        initialPending: options.reference !== undefined };
      return true;
    },
    update(token, sample, now, options = {}) {
      if (!armed) return null;
      if (token !== generation || !gatesValid(options, epoch) || !Number.isFinite(now) || now < armed.observedAt
        || now - armed.at > 250 || !sampleValid(sample, now) || sample.receivedAt < armed.receipt
        || sample.source !== armed.source || (sample.sampleAt === undefined) !== (armed.sampleAt === undefined)
        || (sample.sampleAgeMs !== undefined) !== armed.hasSampleAge
        || (sample.sampleAt !== undefined && sample.sampleAt < armed.sampleAt)) { disarm(); return null; }
      armed.observedAt = now;
      // A separate press reference leaves the first current packet unconsumed.
      // Allow it once after elapsed time permits a slew step, retaining its
      // original receipt/age. Subsequent cached values never emit or refresh.
      if (armed.initialPending && now === armed.at) return null;
      if (!armed.initialPending && (sample.receivedAt === armed.receipt
        || (sample.sampleAt !== undefined && sample.sampleAt === armed.sampleAt))) return null;
      const mapped = mapXRHeadPose(sample.quaternion, armed.reference, armed.baseline, PHONE_HEAD_LIMITS);
      if (!mapped) { disarm(); return null; }
      const step = 20 * Math.min((now - armed.at) / 1000, 0.1);
      const target = Object.fromEntries(axes.map(axis => [axis, armed.previous[axis]
        + Math.max(-step, Math.min(step, mapped[axis] - armed.previous[axis]))]));
      armed.previous = target; armed.at = now; armed.receipt = sample.receivedAt; armed.sampleAt = sample.sampleAt;
      armed.initialPending = false;
      return target;
    },
  };
}
