let landmarker;
let initializing = false;

self.onmessage = async ({ data }) => {
  if (data.type === 'init' && !initializing) {
    initializing = true;
    try {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      // v1.0.1's second argument selects its ES-module WASM loader. Classic UMD
      // loader cannot install ModuleFactory when dynamically imported in a module worker.
      const base = new URL(data.assetBase);
      const fileset = await FilesetResolver.forVisionTasks(new URL('mediapipe', base).href, true);
      const options = {
        runningMode: 'VIDEO', numFaces: 1,
        outputFacialTransformationMatrixes: true,
        minFaceDetectionConfidence: 0.7, minFacePresenceConfidence: 0.7,
        minTrackingConfidence: 0.7,
        // Supplying OffscreenCanvas avoids MediaPipe's document fallback in workers.
      };
      const create = delegate => FaceLandmarker.createFromOptions(fileset, {
        ...options, canvas: new OffscreenCanvas(640, 480),
        baseOptions: { modelAssetPath: new URL('models/face_landmarker.task', base).href, delegate },
      });
      try { landmarker = await create('GPU'); }
      catch { landmarker = await create('CPU'); }
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'error', message: `Face tracker could not initialize: ${error.message}` });
    }
    return;
  }
  if (data.type === 'frame') {
    try {
      if (!landmarker) throw new Error('Face tracker is not ready.');
      const result = landmarker.detectForVideo(data.bitmap, data.timestamp);
      self.postMessage({ type: 'pose', timestamp: data.timestamp,
        matrix: result.faceLandmarks.length === 1 ? result.facialTransformationMatrixes[0] ?? null : null });
    } catch (error) {
      self.postMessage({ type: 'error', message: `Face tracking failed: ${error.message}` });
    } finally { data.bitmap.close(); }
  }
};
