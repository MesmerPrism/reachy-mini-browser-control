export function antennaDragTarget(startDegrees, deltaRadians, jointSign = 1) {
  if (![startDegrees, deltaRadians].every(Number.isFinite) || ![1, -1].includes(jointSign)) return null;
  return Math.round(Math.max(-90, Math.min(90, startDegrees + deltaRadians * 180 / Math.PI / jointSign)) * 10) / 10;
}

export function sameAntennaContext(start, current) {
  return !!start && !!current && current.disabled !== true &&
    typeof start.sessionKey === 'string' && start.sessionKey.length > 0 && Number.isInteger(start.controlEpoch) &&
    start.sessionKey === current.sessionKey && start.controlEpoch === current.controlEpoch;
}
