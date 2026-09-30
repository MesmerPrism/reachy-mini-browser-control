// Independent synthetic wire fixtures, not captured robot data.
// Schema authority: pollen-robotics/reachy_mini at
// 22dae6da569d888f15a73aef8fcbbe16ee95f66c, io/protocol.py and
// daemon/backend/abstract.py. Values are invented; units follow the schema.
export const DAEMON_COMMIT = '22dae6da569d888f15a73aef8fcbbe16ee95f66c';
export const SYNTHETIC_ID = '0123456789abcdef';
export function stateFrame({ yaw = 0, x = 0, motorMode = 'enabled', moving = false, optional = 'absent', seq } = {}) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const state = {
    head_pose: [[c, -s, 0, x], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
    antennas: [0.1, -0.2], head_joint_positions: null, body_yaw: 0.05,
    motor_mode: motorMode, is_recording: false, is_move_running: moving,
    face_target: { detected: false, x: null, y: null, roll: null, ts: null },
  };
  if (optional === 'null') Object.assign(state, { doa: null, imu: null });
  if (optional === 'present') Object.assign(state, {
    doa: { angle: 1, speech_detected: false },
    imu: { accelerometer: [0, 0, 9.81], gyroscope: [0, 0, 0], quaternion: [1, 0, 0, 0], temperature: 20 },
  });
  return seq === undefined ? { state } : { state, seq };
}
export const versionReply = version => ({ version });
export const identityReply = identity => ({ hardware_id: identity });
export const motionReply = (command, completed) => ({ status: 'ok', command, completed });

// Independently declared subset of the audited daemon input schema. Tests
// validate actual SDK-generated JSON against it, not an SDK mock's calls.
export function validateCommand(command) {
  const only = keys => Object.keys(command).every(key => keys.includes(key));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  switch (command.type) {
    case 'get_version': case 'get_hardware_id': case 'get_state': case 'wake_up': case 'goto_sleep': case 'stop_move': case 'clear_incoming_audio':
      return only(['type']);
    case 'set_motor_mode': return only(['type', 'mode']) && ['enabled', 'disabled', 'gravity_compensation'].includes(command.mode);
    case 'set_full_target': return only(['type', 'head', 'antennas', 'body_yaw'])
      && (command.head === undefined || (Array.isArray(command.head) && command.head.length === 16 && command.head.every(finite)))
      && (command.antennas === undefined || (Array.isArray(command.antennas) && command.antennas.length === 2 && command.antennas.every(finite)))
      && (command.body_yaw === undefined || finite(command.body_yaw));
    case 'play_recorded_move': return only(['type', 'move_name', 'dataset_name', 'initial_goto_duration']) && typeof command.move_name === 'string';
    case 'set_volume': return only(['type', 'volume']) && Number.isInteger(command.volume) && command.volume >= 0 && command.volume <= 100;
    default: return false;
  }
}
