import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createXRHeadFollowGuard, XR_HEAD_LIMITS, xrStopAllowed } from './xr-head-follow.mjs';
import './webxr-controls.css';

const radians = Math.PI / 180;
const disposeScene = scene => scene.traverse(object => {
  object.geometry?.dispose();
  for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
    material.map?.dispose(); material.dispose();
  }
});

// This panel is a visual option; its only robot authority is the parent's gated
// callback. Entering VR, showing a video and rendering poses never send motion.
export default function WebXRControls({ snapshot = {}, requested = {}, allowed = false, demo = false,
  limits = XR_HEAD_LIMITS, onHeadChange = () => {}, onStop = () => {}, videoElement = null, connectionKey = '', stopRevision = 0, onEngagementChange = () => {} }) {
  const host = useRef(null), runtime = useRef(null), latest = useRef(null);
  const [capability, setCapability] = useState('Checking immersive VR support…');
  const [supported, setSupported] = useState(false), [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false), [following, setFollowing] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [enabled, setEnabled] = useState(false), [error, setError] = useState('');
  latest.current = { snapshot, requested, allowed, demo, limits, onHeadChange, onStop, videoElement, enabled, onEngagementChange, connectionKey };

  useEffect(() => {
    let mounted = true;
    if (!window.isSecureContext) { setCapability('VR needs HTTPS or localhost. Open the HTTPS page in your headset browser.'); return; }
    if (!navigator.xr) { setCapability('Immersive VR is unavailable in this browser. The preview and regular controls remain available.'); return; }
    navigator.xr.isSessionSupported('immersive-vr').then(value => {
      if (!mounted) return;
      setSupported(value); setCapability(value ? 'Ready to enter VR. You can explore without controlling a robot.' : 'No immersive VR device is available here. Open this same page in a WebXR headset browser.');
    }).catch(() => { if (mounted) setCapability('The browser could not check VR support. Regular controls remain available.'); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!supported) return;
    const container = host.current;
    const guard = createXRHeadFollowGuard();
    let renderer, resize, alive = true;
    const r = { guard, session: null, token: null, orientation: null, orientationAt: -Infinity, engaged: false, lastSend: -Infinity, enabled: false };
    runtime.current = r;
    const disarm = (reason = '', stopEngaged = true) => {
      const engaged = r.engaged;
      r.engaged = false; guard.disarm();
      if (xrStopAllowed(engaged, stopEngaged, r.armedKey, latest.current.connectionKey, r.armedDemo)) {
        const failed = e => { if (alive) setError(`The software stop failed: ${e.message || 'request failed'}. Use the page's Stop motion control.`); };
        try { const result = r.armedStop?.(); result?.catch?.(failed); } catch (e) { failed(e); }
      }
      if (engaged) latest.current.onEngagementChange(false);
      if (reason) r.enabled = false;
      if (alive) { setFollowing(false); if (reason) { setEnabled(false); setError(reason); } }
    };
    r.disarm = disarm;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local');
      container.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-label', 'VR preview: schematic Reachy and camera screen');
      const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9eeed');
      const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
      camera.position.set(0, 0.1, 0.65); camera.lookAt(0, 0, -1.4);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x79827c, 3));
      const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(2, 3, 2); scene.add(light);
      const add = (parent, geometry, color, position, scale = [1, 1, 1]) => {
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
        mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
      };
      const robot = new THREE.Group(); robot.position.set(-0.4, -0.27, -1.4); scene.add(robot);
      add(robot, new THREE.CylinderGeometry(0.16, 0.18, 0.07, 32), 0xb7c4ca, [0, 0, 0]);
      add(robot, new THREE.BoxGeometry(0.22, 0.2, 0.22), 0xcdd8d9, [0, 0.1, 0]);
      const head = new THREE.Group(); head.position.y = 0.32; robot.add(head);
      add(head, new THREE.SphereGeometry(1, 28, 18), 0xf5f7f8, [0, 0, 0], [0.23, 0.15, 0.16]);
      for (const x of [-0.085, 0.085]) add(head, new THREE.SphereGeometry(0.039, 20, 12), 0x263b47, [x, 0.025, 0.135], [1, 1, 0.55]);
      for (const x of [-0.17, 0.17]) {
        add(head, new THREE.CylinderGeometry(0.009, 0.011, 0.18, 12), 0x7fa8bd, [x, 0.2, 0]);
        add(head, new THREE.SphereGeometry(0.02, 12, 8), 0x496d83, [x, 0.29, 0]);
      }
      const board = document.createElement('canvas'); board.width = 1024; board.height = 512;
      const context = board.getContext('2d');
      context.fillStyle = '#263b47'; context.fillRect(0, 0, board.width, board.height);
      context.fillStyle = '#ffffff'; context.font = '46px sans-serif';
      context.fillText('Reachy Mini · VR', 60, 95); context.font = '32px sans-serif';
      context.fillText('Camera appears here when available.', 60, 185);
      context.fillText('Enable following on the page first.', 60, 285);
      context.fillText('Hold a controller trigger to follow.', 60, 345);
      context.fillText('Release to stop. Exit via headset menu.', 60, 405);
      const placeholder = new THREE.CanvasTexture(board);
      const screenMaterial = new THREE.MeshBasicMaterial({ map: placeholder, side: THREE.DoubleSide });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), screenMaterial);
      screen.position.set(0.43, 0.1, -1.5); scene.add(screen);
      const grid = new THREE.GridHelper(6, 20, 0x87988f, 0xcbd4ce); grid.position.y = -0.37; scene.add(grid);
      r.renderer = renderer; r.scene = scene; r.camera = camera;
      let currentVideo = null, texture = null;
      r.disposeVideo = () => { texture?.dispose(); placeholder.dispose(); };
      const selectStart = () => {
        const c = latest.current;
        if (!r.session || r.session.visibilityState !== 'visible' || !r.enabled || !c.allowed || !r.orientation || performance.now() - r.orientationAt > 250 || guard.armed) return;
        const baseline = c.snapshot.headAngles;
        if (!guard.arm(r.token, r.orientation, baseline, c.limits, performance.now())) {
          setError('Fresh measured head angles inside the selectable limits are needed before following.'); return;
        }
        r.armedStop = c.onStop; r.armedKey = c.connectionKey; r.armedDemo = c.demo;
        r.engaged = true; r.lastSend = -Infinity; latest.current.onEngagementChange(true); setFollowing(true); setError('');
      };
      for (let index = 0; index < 2; index++) {
        const controller = renderer.xr.getController(index); scene.add(controller);
        controller.addEventListener('selectstart', selectStart);
        controller.addEventListener('selectend', () => disarm());
        controller.addEventListener('disconnected', () => disarm('Controller disconnected. Enable following again to continue.'));
        const ray = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x537f6e }));
        controller.add(ray);
      }
      renderer.setAnimationLoop((_, frame) => {
        if (!alive) return;
        const c = latest.current;
        if (c.videoElement !== currentVideo) {
          texture?.dispose(); texture = null; currentVideo = c.videoElement;
          if (currentVideo?.tagName === 'VIDEO') { texture = new THREE.VideoTexture(currentVideo); texture.colorSpace = THREE.SRGBColorSpace; }
          screenMaterial.map = texture || placeholder; screenMaterial.needsUpdate = true;
        }
        const measured = c.snapshot.headAngles || c.requested;
        const referenceSpace = renderer.xr.getReferenceSpace();
        const pose = frame && r.session && referenceSpace ? frame.getViewerPose(referenceSpace) : null;
        r.orientation = pose?.transform.orientation || null;
        if (r.orientation) r.orientationAt = performance.now();
        if (guard.armed) {
          const target = guard.update(r.token, r.orientation, performance.now(), { allowed: r.enabled && c.allowed, visible: r.session?.visibilityState === 'visible' });
          if (!target) disarm('Following paused. Release the trigger and enable following again.');
          else {
            head.rotation.set(-target.pitch * radians, target.yaw * radians, -target.roll * radians, 'YXZ');
            if (performance.now() - r.lastSend >= 100) {
              r.lastSend = performance.now();
              if (c.allowed) {
                const token = r.token;
                const failed = e => { if (r.token === token && r.engaged) disarm(`Following stopped: ${e.message || 'head request failed'}`); };
                try { const result = c.onHeadChange(target); result?.catch?.(failed); } catch (e) { failed(e); }
              }
            }
          }
        } else if (measured && ['yaw', 'pitch', 'roll'].every(axis => Number.isFinite(measured[axis]))) {
          head.rotation.set(-measured.pitch * radians, measured.yaw * radians, -measured.roll * radians, 'YXZ');
        }
        renderer.render(scene, camera);
      });
      resize = new ResizeObserver(() => {
        if (renderer.xr.isPresenting) return;
        const width = container.clientWidth || 600, height = 240;
        renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      });
      resize.observe(container);
      setPreviewReady(true);
    } catch (e) { setError(`The VR preview could not start: ${e.message}`); }
    const hide = () => { if (document.hidden) { r.enabled = false; disarm(); setEnabled(false); } };
    document.addEventListener('visibilitychange', hide);
    return () => {
      alive = false; disarm(); guard.endSession(); r.session?.end().catch(() => {});
      resize?.disconnect(); document.removeEventListener('visibilitychange', hide);
      renderer?.setAnimationLoop(null); r.disposeVideo?.();
      if (r.scene) disposeScene(r.scene);
      renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove();
      if (runtime.current === r) runtime.current = null;
    };
  }, [supported]);

  useEffect(() => {
    const r = runtime.current;
    if (r && (!allowed || !enabled)) { r.enabled = false; r.disarm(); if (!allowed) setEnabled(false); }
  }, [allowed, demo, enabled]);

  const previousConnection = useRef(connectionKey);
  useEffect(() => {
    const sameConnection = previousConnection.current === connectionKey;
    previousConnection.current = connectionKey;
    const r = runtime.current;
    if (r) { r.enabled = false; r.disarm('', sameConnection); setEnabled(false); }
  }, [connectionKey, stopRevision, limits.yaw, limits.pitch, limits.roll]);

  const enter = async () => {
    const r = runtime.current;
    if (!r?.renderer || starting || r.session) return;
    setStarting(true); setError('');
    let session;
    try {
      // Keep requestSession in this explicit button handler for browser consent.
      session = await navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local'] });
      if (runtime.current !== r) { await session.end(); return; }
      r.session = session; r.token = r.guard.beginSession(); r.enabled = latest.current.enabled;
      const pause = () => { if (r.session === session && session.visibilityState !== 'visible') { r.enabled = false; r.disarm(); setEnabled(false); } };
      session.addEventListener('visibilitychange', pause);
      session.addEventListener('inputsourceschange', event => {
        if (r.session === session && event.removed.length) { r.enabled = false; r.disarm(); setEnabled(false); }
      });
      session.addEventListener('end', () => {
        if (r.session !== session) return;
        r.disarm(); r.guard.endSession(); r.session = null; r.orientation = null; r.enabled = false;
        if (runtime.current === r) { setActive(false); setEnabled(false); }
      }, { once: true });
      await r.renderer.xr.setSession(session);
      if (runtime.current === r && r.session === session) setActive(true);
    } catch (e) {
      r.disarm(); r.guard.endSession(); r.session = null;
      session?.end().catch(() => {});
      if (runtime.current === r) { setEnabled(false); setError(`VR could not start: ${e.message}`); }
    } finally { if (runtime.current === r) setStarting(false); }
  };
  const toggleFollowing = value => {
    setEnabled(value);
    if (runtime.current) { runtime.current.enabled = value; if (!value) runtime.current.disarm(); }
  };
  return <section className="panel webxr-controls" aria-labelledby="webxr-heading">
    <div className="webxr-title"><h2 id="webxr-heading">Headset view</h2><span>{demo ? 'Simulation' : 'Experimental'}</span></div>
    <p className="panel-caption">Explore Reachy and its camera on this page in VR. Regular controls work without a headset.</p>
    <div className={supported ? 'webxr-preview' : 'webxr-fallback'} ref={host}>{!supported && <p>Use the camera, 3D view and head controls on this device. On a supported headset, this area becomes an immersive preview.</p>}</div>
    <p className="webxr-capability" role="status">{active ? following ? 'Following while the controller trigger is held.' : 'VR is open. Robot head following is off until you enable it and hold a trigger.' : capability}</p>
    <div className="webxr-actions">
      <button type="button" disabled={!supported || starting || !previewReady} onClick={active ? () => runtime.current?.session?.end().catch(e => setError(e.message)) : enter}>{starting ? 'Opening VR…' : active ? 'Exit VR' : 'Enter VR'}</button>
      <label><input type="checkbox" checked={enabled} disabled={!supported || !allowed} onChange={event => toggleFollowing(event.target.checked)} />{demo ? 'Enable simulated head following' : 'Enable robot head following'}</label>
      <button type="button" disabled={!following} onClick={() => toggleFollowing(false)}>Stop following</button>
    </div>
    <p className="webxr-help">Enable following before entering VR, then hold a controller trigger. The headset’s turn, nod and tilt are relative to the head’s measured pose when you press. Release to stop; press again to recenter. Position and antennas stay unchanged. This mapping needs attended headset and robot validation.</p>
    {!allowed && !demo && <p className="webxr-help">Head following becomes available after the connection and head-motion checks pass and the robot is awake.</p>}
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
