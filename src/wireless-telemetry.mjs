// Private ingress hook audited only against the pinned npm SDK 1.8.0.
// Both daemon 1.10 and 1.11 StateSnapshot/PoseFrame carry full control state;
// legacy standalone pose messages are passed through without granting freshness.
import { rigidPose } from '../server/head-pose.mjs';
function validSnapshot(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  if (!Array.isArray(state.head_pose) || state.head_pose.length !== 4 || !state.head_pose.every(row => Array.isArray(row) && row.length === 4)) return false;
  try { rigidPose(state.head_pose.flat()); } catch { return false; }
  return Array.isArray(state.antennas) && state.antennas.length === 2 && state.antennas.every(Number.isFinite)
    && Number.isFinite(state.body_yaw) && ['enabled', 'disabled', 'gravity_compensation'].includes(state.motor_mode)
    && typeof state.is_move_running === 'boolean';
}
export function installWirelessTelemetryGuard(sdk, { sdkVersion = '1.8.0', now = () => Date.now(), onInvalid = () => {} } = {}) {
  if (sdkVersion !== '1.8.0') throw Error('Wireless telemetry hook requires audited SDK 1.8.0');
  // Test/alternate synthetic adapters may deliver already validated state events.
  if (typeof sdk?._handleRobotMessage !== 'function') return () => {};
  const original = sdk._handleRobotMessage;
  let active = true, lastSeq = null, lastPoseAt = null;
  const wrapped = function (data) {
    if (!active) return;
    if (data && typeof data === 'object' && Object.hasOwn(data, 'state')) {
      const sequenced = Object.hasOwn(data, 'seq');
      if (sequenced) {
        if (!Number.isSafeInteger(data.seq) || data.seq < 0 || (lastSeq !== null && data.seq <= lastSeq)) return;
      }
      if (!validSnapshot(data.state)) {
        sdk._robotState = {};
        try { onInvalid(); } catch { /* Consumer cannot admit rejected data. */ }
        return;
      }
      if (!sequenced && lastPoseAt !== null) {
        const age = now() - lastPoseAt;
        // Poll replies have no seq; they cannot refresh or rewind an active
        // pose stream. Permit a full poll snapshot again when streaming stalls.
        if (age >= 0 && age <= 750) return;
      }
      if (sequenced) { lastSeq = data.seq; lastPoseAt = now(); }
    }
    return original.call(this, data);
  };
  sdk._handleRobotMessage = wrapped;
  return () => {
    active = false;
    if (sdk._handleRobotMessage === wrapped) sdk._handleRobotMessage = original;
    sdk._robotState = {}; lastSeq = null; lastPoseAt = null;
  };
}
