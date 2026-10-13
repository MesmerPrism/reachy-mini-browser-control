// This bounds unsent UI intent, not robot motion or transport acknowledgement.
// At the minimum head speed, the full angular diagonal takes about 11.7 s:
// hypot(40, 30, 30) / 5. Allow a bounded margin without promising arrival.
export const STAGED_TARGET_TIMEOUT_MS = 15000;
const TELEMETRY_MAX_AGE_MS = 1500;
const fields = { 'head-manual': 'pose', antennas: 'targets' };
const axes = { 'head-manual': ['yaw', 'pitch', 'roll', 'x', 'y', 'z'], antennas: ['left', 'right'] };
const validTime = value => Number.isFinite(value) && value >= 0;
const validEpoch = value => Number.isSafeInteger(value) && value >= 0;

function validRequest(request) {
  const field = Object.hasOwn(fields, request?.action) ? fields[request.action] : undefined, values = request?.[field];
  return !!field && validEpoch(request.epoch) && values && typeof values === 'object' && !Array.isArray(values)
    && Object.keys(values).length > 0
    && Object.entries(values).every(([axis, value]) => axes[request.action].includes(axis) && Number.isFinite(value));
}

function validStage(target) {
  return validRequest(target) && validTime(target.stagedAt) && validTime(target.baselineMeasuredAt)
    && target.baselineMeasuredAt <= target.stagedAt && validTime(target.deadlineAt)
    && target.deadlineAt === target.stagedAt + STAGED_TARGET_TIMEOUT_MS && target.deadlineAt > target.stagedAt;
}

// Call only for a deliberate target edit. Loop iterations must reuse the stage.
// Use the same millisecond clock as WirelessControl.measured.receivedAt.
export function stageTarget(previous, request, { now, measuredAt, merge = true } = {}) {
  if (!validRequest(request)) throw Error('Choose finite staged target axes and a valid control epoch.');
  if (!validTime(now) || !validTime(measuredAt) || measuredAt > now || now - measuredAt > TELEMETRY_MAX_AGE_MS
      || !Number.isFinite(now + STAGED_TARGET_TIMEOUT_MS) || now + STAGED_TARGET_TIMEOUT_MS <= now) {
    throw Error('A valid clock and fresh measured receipt are required to stage a target.');
  }
  const field = fields[request.action];
  const keepPrevious = merge && validStage(previous) && previous.action === request.action && previous.epoch === request.epoch
    && previous.stagedAt <= now && now < previous.deadlineAt;
  return {
    action: request.action, epoch: request.epoch,
    [field]: { ...(keepPrevious ? previous[field] : {}), ...request[field] },
    stagedAt: now, deadlineAt: now + STAGED_TARGET_TIMEOUT_MS, baselineMeasuredAt: measuredAt,
  };
}

// The caller discards the stage for every result except 'send'. This helper
// sends no command: expiry cannot issue Stop, Wake, Sleep, a hold or a replay.
// 'converged' means only a later received measurement is within the existing
// strict explicit-axis tolerance. It proves neither sensor age nor application.
export function assessStagedTarget(target, { now, epoch, measured } = {}) {
  if (!validStage(target) || !validTime(now) || now < target.stagedAt || !validEpoch(epoch)) return 'invalid';
  if (target.epoch !== epoch) return 'epoch-changed';
  if (now >= target.deadlineAt) return 'expired';
  const receivedAt = measured?.receivedAt;
  if (!validTime(receivedAt) || receivedAt > now || now - receivedAt > TELEMETRY_MAX_AGE_MS) return 'stale';
  const values = target[fields[target.action]];
  const actual = target.action === 'head-manual' ? measured.head : measured.antennas;
  if (Object.keys(values).some(axis => !Number.isFinite(actual?.[axis]))) return 'invalid';
  const laterReceipt = receivedAt > target.stagedAt && receivedAt > target.baselineMeasuredAt;
  return laterReceipt && Object.keys(values).every(axis => Math.abs(values[axis] - actual[axis]) < .1) ? 'converged' : 'send';
}
