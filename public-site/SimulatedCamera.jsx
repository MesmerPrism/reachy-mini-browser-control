import { useEffect, useRef, useState } from 'react';
import panoramaUrl from './demo-room-panorama.png';
import { measuredPanoramaRotation, panoramaCameraRays, reprojectPanorama } from '../src/panorama-camera.mjs';
import FitText from './FitText.jsx';

export default function SimulatedCamera({ measured, compact = false }) {
  const host = useRef(null), latest = useRef(measured);
  const [message, setMessage] = useState('Loading simulated panorama…');
  latest.current = measured;
  useEffect(() => {
    let disposed = false, failed = false, timer, observer;
    let sourcePixels, sourceWidth, sourceHeight, rays, framePixels, previousRotation;
    let previousMessage = '', dirty = true;
    const image = new Image(), canvas = document.createElement('canvas'), source = document.createElement('canvas');
    const report = value => { if (!disposed && value !== previousMessage) { previousMessage = value; setMessage(value); } };
    const fail = value => { failed = true; canvas.hidden = true; report(value); };
    canvas.hidden = true;
    canvas.setAttribute('aria-label', 'Simulated panorama camera view following measured demo head rotation');
    canvas.setAttribute('role', 'img');
    host.current.appendChild(canvas);
    try {
      const context = canvas.getContext('2d'), sourceContext = source.getContext('2d', { willReadFrequently: true });
      if (!context || !sourceContext) throw Error('Canvas unavailable');
      const resize = () => {
        if (disposed || failed) return;
        const visibleWidth = Math.max(1, host.current?.clientWidth || 1), visibleHeight = Math.max(1, host.current?.clientHeight || 1);
        const scale = Math.min(1, 384 / visibleWidth, 288 / visibleHeight);
        const width = Math.max(1, Math.round(visibleWidth * scale)), height = Math.max(1, Math.round(visibleHeight * scale));
        if (canvas.width === width && canvas.height === height && rays) return;
        canvas.width = width; canvas.height = height;
        rays = panoramaCameraRays(width, height); framePixels = context.createImageData(width, height); dirty = true;
      };
      const render = () => {
        if (disposed || failed || !sourcePixels) return;
        let rotation;
        try { rotation = measuredPanoramaRotation(latest.current); }
        catch (error) { canvas.hidden = true; report(error.message); return; }
        if (!dirty && previousRotation?.every((value, index) => Math.abs(value - rotation[index]) < 1e-8)) {
          canvas.hidden = false; report('Simulated view · measured demo head rotation'); return;
        }
        try {
          reprojectPanorama({ pixels: sourcePixels, panoramaWidth: sourceWidth, panoramaHeight: sourceHeight, rays, rotation, output: framePixels.data });
          context.putImageData(framePixels, 0, 0); previousRotation = rotation; dirty = false;
          canvas.hidden = false; report('Simulated view · measured demo head rotation');
        } catch { fail('Simulated camera unavailable: panorama rendering failed.'); }
      };
      image.onload = () => {
        if (disposed) return;
        try {
          if (Math.abs(image.naturalWidth / image.naturalHeight - 2) > .02) throw Error('Panorama layout');
          source.width = sourceWidth = image.naturalWidth; source.height = sourceHeight = image.naturalHeight;
          sourceContext.drawImage(image, 0, 0); sourcePixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
          render();
        } catch { fail('Simulated camera unavailable: bundled spherical panorama could not be decoded.'); }
      };
      image.onerror = () => fail('Simulated camera unavailable: bundled panorama could not load.');
      observer = new ResizeObserver(resize); observer.observe(host.current); resize();
      timer = setInterval(render, 100);
      image.src = panoramaUrl;
    } catch { fail('Simulated camera unavailable: browser canvas could not initialize.'); }
    return () => {
      disposed = true; clearInterval(timer); observer?.disconnect();
      image.onload = null; image.onerror = null; image.removeAttribute('src');
      sourcePixels = null; rays = null; framePixels = null; previousRotation = null;
      source.width = 0; source.height = 0; canvas.width = 0; canvas.height = 0; canvas.remove();
    };
  }, []);
  return <>
    <div className="simulated-camera-stage" ref={host} />
    <FitText as="p" aria-live="polite">{message}</FitText>
    {compact ? <details className="camera-options"><summary>About the simulated camera</summary><p>Illustrated 360° room, not a robot feed. Turn, nod and tilt follow measured simulation telemetry. Translation has no parallax. Approximate 70° vertical field of view; not calibrated to Reachy’s camera.</p></details> : <FitText as="p">Illustrated 360° room, not a robot feed. Turn, nod and tilt follow measured simulation telemetry. Neutral looks at the panorama center. Translation has no parallax. Approximate 70° vertical field of view; not calibrated to Reachy’s camera.</FitText>}
  </>;
}
