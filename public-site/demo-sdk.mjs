import { IDENTITY_POSE } from '../server/head-pose.mjs';
export class DemoWirelessSDK extends EventTarget {
  constructor() { super(); this.state = 'disconnected'; this.robots = [{ id: 'demo', meta: { name: 'Simulated Reachy Mini' } }]; const head=[...IDENTITY_POSE];head[11]=0; this.robotState = { head, antennas: [0,0], body_yaw: 0, motor_mode: 'enabled', is_move_running: false }; }
  async connect() { this.state = 'connected'; }
  async startSession() { this.state = 'streaming'; this.timer = setInterval(() => this.requestState(), 250); this.requestState(); }
  async getHardwareId() { return 'simulated-robot'; }
  async getVersion() { return '1.10.0'; }
  requestState() { this.dispatchEvent(new CustomEvent('state', { detail: { ...this.robotState } })); return true; }
  setTarget(target) { if (target.head) this.robotState.head = [...target.head]; if (target.antennas) this.robotState.antennas = [...target.antennas]; if (target.body_yaw !== undefined) this.robotState.body_yaw = target.body_yaw; this.requestState(); return true; }
  stopMove() { return true; }
  sendRaw() { return true; }
  async wakeUp() { this.robotState.motor_mode = 'enabled'; this.requestState(); }
  async gotoSleep() { this.robotState.motor_mode = 'disabled'; this.requestState(); }
  async setVolume(value) { return value; }
  async getVolume() { return 40; }
  subscribePose() { return true; }
  unsubscribePose() { return true; }
  attachVideo() { return () => {}; }
  async stopSession() { clearInterval(this.timer); this.state = 'disconnected'; }
  disconnect() { clearInterval(this.timer); this.state = 'disconnected'; }
}
