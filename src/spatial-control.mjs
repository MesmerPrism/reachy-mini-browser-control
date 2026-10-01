// Pure screen-to-target mapping. Positive yaw is Reachy's left; positive pitch
// lowers the face in its right-handed, forward/left/up coordinate frame.
export function boundTarget(value, limit) {
  if (!Number.isFinite(value) || !Number.isFinite(limit) || limit < 0) return null;
  return Math.max(-limit, Math.min(limit, Math.round(value * 10) / 10));
}
export function padTarget(clientX, clientY, rect, limits) {
  if (![clientX, clientY, rect?.left, rect?.top, rect?.width, rect?.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return null;
  const yaw = boundTarget((1 - 2 * (clientX - rect.left) / rect.width) * limits.yaw, limits.yaw);
  const pitch = boundTarget((2 * (clientY - rect.top) / rect.height - 1) * limits.pitch, limits.pitch);
  return yaw === null || pitch === null ? null : { yaw, pitch };
}
export function positionPadTarget(clientX, clientY, rect, limits) {
  const target = padTarget(clientX, clientY, rect, { yaw: limits.y, pitch: limits.z });
  return target ? { y: target.yaw, z: -target.pitch || 0 } : null;
}
export function dialTarget(clientX, clientY, rect, limit) {
  if (![clientX, clientY, rect?.left, rect?.top, rect?.width, rect?.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) return null;
  const x = (clientX - rect.left) / rect.width * 180 - 90;
  const y = 86 - (clientY - rect.top) / rect.height * 110;
  // Below the pivot still selects the nearest end, never wraps around.
  return boundTarget(Math.atan2(x, Math.max(0, y)) * 180 / Math.PI, limit);
}
