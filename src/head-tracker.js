import { rotationFromFaceMatrix, relativeRotation, anglesFromRotation } from './head-math.mjs';

const MAX_AGE_MS = 250;
const START_TIMEOUT_MS = 20000;
const INFERENCE_TIMEOUT_MS = 5000;

// Resolve relative deployment bases in the document, before transferring them
// to the worker emitted beneath assets/. Worker-relative paths lose that base.
export function headAssetBase(base = import.meta.env?.BASE_URL ?? '/', page = globalThis.document?.baseURI ?? import.meta.url) {
  return new URL(base, page).href;
}

export function createHeadTracker({ video, onPose = () => {}, onState = () => {}, onError = () => {} }) {
  let session = 0, running = false, starting = false, stream = null, worker = null;
  let frameId = null, frameKind = null, busy = false, pendingBitmap = null;
  let neutral = null, latest = null, expiryTimer = null, inferenceTimer = null;
  let cancelStart = null, state = 'idle';
  const setState = next => { if (state !== next) { state = next; onState(next); } };
  const lost = () => {
    latest = null; neutral = null;
    onPose({ yaw: 0, pitch: 0, roll: 0, ageMs: MAX_AGE_MS, tracked: false, calibrated: false });
    if (running) setState('tracking-lost');
  };
  const stop = () => {
    session++; running = false; starting = false;
    cancelStart?.(); cancelStart = null;
    if (frameId !== null) {
      if (frameKind === 'video') video.cancelVideoFrameCallback?.(frameId);
      else globalThis.cancelAnimationFrame?.(frameId);
    }
    frameId = null;
    clearTimeout(expiryTimer); clearTimeout(inferenceTimer);
    pendingBitmap?.close(); pendingBitmap = null;
    worker?.terminate(); worker = null; busy = false;
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    video.pause?.(); video.srcObject = null;
    lost(); setState('idle');
  };
  const fail = error => { stop(); onError(error instanceof Error ? error : new Error(String(error))); };
  const schedule = token => {
    if (!running || token !== session) return;
    const callback = () => { frameId = null; capture(token); };
    if (video.requestVideoFrameCallback) {
      frameKind = 'video'; frameId = video.requestVideoFrameCallback(callback);
    } else { frameKind = 'raf'; frameId = requestAnimationFrame(callback); }
  };
  const capture = async token => {
    if (!running || token !== session) return;
    schedule(token);
    if (busy || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    busy = true;
    inferenceTimer = setTimeout(() => { if (token === session) fail(new Error('Face frame processing timed out.')); }, INFERENCE_TIMEOUT_MS);
    // The timestamp belongs to capture, not inference completion; clocks are monotonic.
    const timestamp = performance.now();
    try {
      const bitmap = await createImageBitmap(video);
      if (!running || token !== session) { bitmap.close(); return; }
      pendingBitmap = bitmap;
      worker.postMessage({ type: 'frame', bitmap, timestamp }, [bitmap]);
      pendingBitmap = null; // worker owns and closes the transferred bitmap
    } catch (error) { if (token === session) fail(error); }
  };
  const start = async () => {
    if (running || starting) return;
    const token = ++session; starting = true; setState('starting');
    let timer;
    const cancellation = new Promise((_, reject) => {
      cancelStart = () => reject(new Error('Webcam start cancelled.'));
      timer = setTimeout(() => reject(new Error('Webcam or face tracker initialization timed out.')), START_TIMEOUT_MS);
    });
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof Worker === 'undefined' || typeof createImageBitmap !== 'function') {
        throw new Error('This browser cannot run local webcam face tracking. Use a secure localhost browser with camera and worker support.');
      }
      const capturePromise = navigator.mediaDevices.getUserMedia({ video: {
        width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 },
      }, audio: false }).then(captured => {
        if (token !== session) { captured.getTracks().forEach(track => track.stop()); return null; }
        stream = captured; return captured;
      });
      await Promise.race([capturePromise, cancellation]);
      if (token !== session) return;
      stream.getTracks().forEach(track => { track.onended = () => { if (token === session) fail(new Error('Webcam capture ended.')); }; });
      video.srcObject = stream; video.muted = true; video.playsInline = true;
      await Promise.race([video.play(), cancellation]);
      if (token !== session) return;
      worker = new Worker(new URL('./head-tracker.worker.js', import.meta.url), { type: 'module' });
      const initialized = new Promise((resolve, reject) => {
        worker.onerror = () => {
          const error = new Error('Local face tracker worker failed.');
          if (starting) reject(error); else fail(error);
        };
        worker.onmessageerror = worker.onerror;
        worker.onmessage = ({ data }) => {
          if (token !== session) return;
          if (data.type === 'ready') { resolve(); return; }
          if (data.type === 'error') {
            const error = new Error(data.message);
            if (starting) reject(error); else fail(error);
            return;
          }
          if (data.type !== 'pose') return;
          clearTimeout(inferenceTimer); busy = false;
          const ageMs = performance.now() - data.timestamp;
          const rotation = rotationFromFaceMatrix(data.matrix);
          if (!rotation || !Number.isFinite(ageMs) || ageMs < 0 || ageMs > MAX_AGE_MS) { lost(); return; }
          latest = { rotation, timestamp: data.timestamp };
          clearTimeout(expiryTimer);
          expiryTimer = setTimeout(() => { if (token === session) lost(); }, MAX_AGE_MS - ageMs);
          const angles = neutral ? anglesFromRotation(relativeRotation(neutral, rotation)) : { yaw: 0, pitch: 0, roll: 0 };
          onPose({ ...angles, ageMs, tracked: true, calibrated: !!neutral });
          setState(neutral ? 'calibrated' : 'ready');
        };
        worker.postMessage({ type: 'init', assetBase: headAssetBase() });
      });
      await Promise.race([initialized, cancellation]);
      if (token !== session) return;
      starting = false; running = true; setState('ready'); schedule(token);
    } catch (error) {
      if (token === session) { fail(error); throw error; }
    } finally {
      clearTimeout(timer);
      if (token === session) cancelStart = null;
    }
  };
  const calibrate = () => {
    if (!running || !latest || performance.now() - latest.timestamp > MAX_AGE_MS) return false;
    neutral = [...latest.rotation]; setState('calibrated');
    onPose({ yaw: 0, pitch: 0, roll: 0, ageMs: performance.now() - latest.timestamp, tracked: true, calibrated: true });
    return true;
  };
  return { start, calibrate, stop, get neutralReady() { return !!neutral; } };
}
