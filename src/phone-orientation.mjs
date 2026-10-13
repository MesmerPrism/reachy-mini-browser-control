import { normalizeXRQuaternion } from './xr-head-follow.mjs';

const multiply = ([ax, ay, az, aw], [bx, by, bz, bw]) => [
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
  aw * bw - ax * bx - ay * by - az * bz,
];
const rotation = (axis, angle) => {
  const q = [0, 0, 0, Math.cos(angle / 2)]; q[axis] = Math.sin(angle / 2); return q;
};
const radians = Math.PI / 180;

// Device axes: right / top / out of screen; world axes: east / north / up.
// Qz(alpha) Qx(beta) Qy(gamma) is the intrinsic Z-X-Y orientation-event
// convention. Convert world up to XR up, then rotate the screen's local axes.
// An upright portrait phone (beta=90) has identity orientation at alpha=gamma=0.
// Native sensors use referenceFrame:'device' so BOTH paths use this transform.
export function phoneQuaternionToXR(quaternion, screenAngle = 0) {
  const q = normalizeXRQuaternion(quaternion);
  if (!q || !Number.isFinite(screenAngle)) return null;
  return normalizeXRQuaternion(multiply(multiply(rotation(0, -Math.PI / 2), q), rotation(2, -screenAngle * radians)));
}

export function deviceOrientationToXR({ alpha, beta, gamma } = {}, screenAngle = 0) {
  if (![alpha, beta, gamma].every(Number.isFinite)) return null;
  return phoneQuaternionToXR(multiply(multiply(rotation(2, alpha * radians), rotation(0, beta * radians)), rotation(1, gamma * radians)), screenAngle);
}

const messages = Object.freeze({
  starting: 'Waiting for a fresh phone orientation reading.',
  ready: 'Phone orientation is available. Set neutral before following.',
  denied: 'Motion permission was denied. Enable it in browser settings and try again.',
  unsupported: 'Phone orientation is unavailable in this browser.',
  insecure: 'Phone sensors require a secure HTTPS page or localhost.',
  invalid: 'Phone orientation was invalid or stale. Enable sensors again.',
  hidden: 'Phone sensors stopped because the page is hidden.',
  stopped: 'Phone sensors are off.',
  screen: 'Screen orientation changed. Set neutral again.',
});

// Construction is inert. Only a user-click call to startSensors requests access.
// Event timestamps establish browser-event age, not physical sensor sample age.
// No timer or animation frame fabricates readings when a stationary phone is quiet.
export function createPhoneOrientationSource({
  window: win = globalThis.window,
  document: doc = win?.document,
  now = () => win.performance.now(),
  onSample = () => {}, onReset = () => {}, onStatus = () => {},
} = {}) {
  let active = false, generation = 0, source = null, sensor = null;
  let lastReceipt = null, lastSample = null, screenAngle = 0;
  const cleanups = [];
  const status = state => onStatus({ state, message: messages[state] ?? messages.stopped, source });
  const angle = () => Number.isFinite(win?.screen?.orientation?.angle) ? win.screen.orientation.angle
    : Number.isFinite(win?.orientation) ? win.orientation : 0;
  const listen = (target, type, listener) => {
    target?.addEventListener(type, listener);
    cleanups.push(() => target?.removeEventListener(type, listener));
  };
  const stopNative = () => {
    if (!sensor) return;
    sensor.onreading = null; sensor.onerror = null;
    try { sensor.stop(); } catch { /* Cleanup cannot restore input authority. */ }
    sensor = null;
  };
  function stopSensors(reason = 'stopped') {
    generation++; active = false;
    stopNative();
    for (const cleanup of cleanups.splice(0)) cleanup();
    source = null; lastReceipt = null; lastSample = null;
    onReset(Object.hasOwn(messages, reason) ? reason : 'stopped');
    status(reason);
  }
  function accept(quaternion, timestamp) {
    if (!active) return;
    if (doc?.visibilityState === 'hidden') { stopSensors('hidden'); return; }
    if (angle() !== screenAngle) { screenChanged(); return; }
    const receivedAt = now();
    if (!quaternion || !Number.isFinite(receivedAt) || receivedAt < 0
      || !Number.isFinite(timestamp) || timestamp < 0 || timestamp > receivedAt || receivedAt - timestamp > 250
      || (lastReceipt !== null && receivedAt < lastReceipt) || (lastSample !== null && timestamp < lastSample)) {
      stopSensors('invalid'); return;
    }
    if (timestamp === lastSample || receivedAt === lastReceipt) return;
    lastReceipt = receivedAt; lastSample = timestamp;
    onSample({ quaternion, receivedAt, sampleAt: timestamp, source });
    status('ready');
  }
  function screenChanged() {
    const next = angle();
    if (next === screenAngle) return;
    screenAngle = next;
    onReset('screen'); status('screen');
  }
  function fallback() {
    stopNative();
    if (typeof win?.DeviceOrientationEvent !== 'function') { stopSensors('unsupported'); return false; }
    source = 'device-orientation'; lastReceipt = null; lastSample = null;
    const token = generation;
    listen(win, 'deviceorientation', event => {
      if (active && token === generation && source === 'device-orientation') accept(deviceOrientationToXR(event, screenAngle), event.timeStamp);
    });
    status('starting'); return true;
  }
  async function startSensors() {
    stopSensors();
    const token = generation;
    if (!win?.isSecureContext) { status('insecure'); return false; }
    if (doc?.visibilityState === 'hidden') { status('hidden'); return false; }
    const permission = win.DeviceOrientationEvent?.requestPermission;
    if (typeof permission === 'function') {
      let granted = false;
      try { granted = await permission.call(win.DeviceOrientationEvent) === 'granted'; } catch { /* Bounded denial only. */ }
      if (token !== generation) return false;
      if (!granted) { status('denied'); return false; }
    }
    if (token !== generation || doc?.visibilityState === 'hidden') return false;
    active = true; screenAngle = angle();
    listen(doc, 'visibilitychange', () => { if (doc.visibilityState === 'hidden') stopSensors('hidden'); });
    listen(win, 'pagehide', () => stopSensors());
    listen(win, 'blur', () => stopSensors());
    listen(win.screen?.orientation, 'change', screenChanged);
    listen(win, 'orientationchange', screenChanged);
    if (typeof win.RelativeOrientationSensor === 'function') {
      try {
        sensor = new win.RelativeOrientationSensor({ frequency: 30, referenceFrame: 'device' });
        const native = sensor;
        source = 'relative-orientation';
        sensor.onreading = () => {
          if (active && token === generation && sensor === native) accept(phoneQuaternionToXR(native.quaternion, screenAngle), native.timestamp);
        };
        sensor.onerror = event => {
          if (!active || token !== generation || sensor !== native) return;
          if (event?.error?.name === 'NotAllowedError' || event?.error?.name === 'SecurityError') stopSensors('denied');
          else { onReset('source'); fallback(); }
        };
        status('starting'); sensor.start(); return active;
      } catch (error) {
        if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') { stopSensors('denied'); return false; }
        return fallback();
      }
    }
    return fallback();
  }
  return { startSensors, stopSensors, get active() { return active; }, get source() { return source; } };
}
