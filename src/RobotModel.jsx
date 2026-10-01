import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRobotTransforms, deriveRobotModelState, MODEL_ANTENNA_FEEDBACK_SIDE, toColumnMajor } from './robot-model-state.mjs';
import { PrecisionField } from './SpatialControls.jsx';
import { antennaDragTarget, sameAntennaContext } from './model-antenna-control.mjs';

// Original diagram geometry and approximate dimensions, not converted CAD.
// Native RH: X forward, Y left, Z up. The same measured-state transform path
// and observed feedback-side map used for CAD drive these five rigid groups.
const identity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
const translate = (x,y,z) => { const result=[...identity]; result[3]=x; result[7]=y; result[11]=z; return result; };
export function createSchematicRobot() {
  const groups = Object.fromEntries(['reachy_base','reachy_body','reachy_head','reachy_antenna_right','reachy_antenna_left'].map(name => {
    const group = new THREE.Group(); group.name = name; return [name,group];
  }));
  const add = (group, geometry, color, position, scale = [1,1,1]) => {
    const mesh = new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({ color, roughness:.8 }));
    mesh.position.set(...position); mesh.scale.set(...scale); group.add(mesh); return mesh;
  };
  const base = add(groups.reachy_base,new THREE.CylinderGeometry(.064,.07,.026,32),0xb7c4ca,[0,0,.013]);
  base.rotation.x = Math.PI/2;
  add(groups.reachy_body,new THREE.BoxGeometry(.095,.105,.075),0xced8de,[0,0,.0375]);
  // A colored forward panel makes body-only yaw visible despite the head's
  // independent measured pose; its dimensions are illustrative, not metrology.
  add(groups.reachy_body,new THREE.BoxGeometry(.003,.048,.025),0x668f9f,[.049,0,.038]);
  add(groups.reachy_head,new THREE.SphereGeometry(1,28,18),0xf5f7f8,[0,0,.015],[.065,.09,.06]);
  for (const y of [-.032,.032]) add(groups.reachy_head,new THREE.SphereGeometry(.016,20,12),0x263b47,[.055,y,.027],[.45,1,1]);
  add(groups.reachy_head,new THREE.BoxGeometry(.004,.022,.004),0x7897a5,[.065,0,-.002]);
  for (const side of ['right','left']) {
    const group=groups[`reachy_antenna_${side}`];
    const stalk=add(group,new THREE.CylinderGeometry(.004,.005,.068,12),0x7fa8bd,[0,0,.034]);stalk.rotation.x=Math.PI/2;
    add(group,new THREE.SphereGeometry(.008,12,8),0x496d83,[0,0,.072]);
  }
  const model = { neutralHeadHeight:.177, bodyZero:translate(0,0,.03), antennas:{
    right:{pivotMatrix:translate(0,-.067,.057),axis:[1,0,0],sign:1,zeroMatrix:[...identity]},
    left:{pivotMatrix:translate(0,.067,.057),axis:[1,0,0],sign:1,zeroMatrix:[...identity]},
  } };
  return { manifest:{ model, schematic:true }, groups };
}

function disposeTree(tree) {
  tree.traverse(node => {
    node.geometry?.dispose();
    for (const material of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
}

export default function RobotModel({ control, schematic = false, Text = 'span', antennaControl = null }) {
  const host = useRef(null), runtime = useRef(null), latest = useRef(control);
  const antennaLatest = useRef(antennaControl), moveMode = useRef(false);
  const sliderGestures = useRef({});
  latest.current = control;
  antennaLatest.current = antennaControl;
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ label: 'Waiting for measured state', frozen: false });
  const [wireframe, setWireframe] = useState(false), [axes, setAxes] = useState(false);
  const [movingAntennas, setMovingAntennas] = useState(false), [antennaError, setAntennaError] = useState('');
  const context = () => antennaLatest.current ? { ...antennaLatest.current,
    controlEpoch: antennaLatest.current.controlEpoch ?? latest.current.status?.controlEpoch } : null;
  const turnOff = () => { moveMode.current = false; setMovingAntennas(false); runtime.current?.cancelAntennaDrag(); };
  const changeAntenna = (side, value, expected = context()) => {
    const current = antennaLatest.current;
    if (!current || !sameAntennaContext(expected, context()) || document.hidden || !Number.isFinite(value) || Math.abs(value) > 90) return;
    const captured = { sessionKey: expected.sessionKey, controlEpoch: expected.controlEpoch };
    try { const result = current.onChange?.(side, value, captured); result?.catch?.(problem => { if (sameAntennaContext(captured, context())) { setAntennaError(problem.message || 'Antenna request failed.'); turnOff(); } }); setAntennaError(''); }
    catch (problem) { setAntennaError(problem.message || 'Antenna request failed.'); turnOff(); }
  };

  useEffect(() => {
    let disposed = false, failed = false, renderer, scene, orbit, observer, timer, frame, removeAntennaEvents = () => {};
    moveMode.current = false; setMovingAntennas(false);
    setLoading(true);setError('');setWireframe(false);setAxes(false);
    const abort = new AbortController(), loaded = [], container = host.current;
    const releaseRenderer = () => {
      if (!renderer) return;
      renderer.dispose();
      // Removing a canvas does not release its WebGL context. Repeated route
      // changes must release the context instead of waiting for browser GC.
      renderer.forceContextLoss(); renderer.domElement.remove(); renderer = null;
    };
    const updateFeedback = next => { if (!disposed) setFeedback(old => old.label === next.label && old.reason === next.reason && old.frozen === next.frozen ? old : next); };
    const render = () => {
      if (disposed || failed || document.hidden || frame || !runtime.current) return;
      frame = requestAnimationFrame(() => { frame = null; if (!disposed && !failed && !document.hidden && runtime.current) renderer.render(scene, runtime.current.camera); });
    };
    const refresh = () => {
      const active = runtime.current;
      if (!active || disposed) return;
      const current = latest.current;
      const next = deriveRobotModelState({ session: current.session, status: current.status, statusReadAt: current.statusReadAt,
        now: performance.now(), model: active.manifest.model, lastConfirmed: active.lastConfirmed });
      if (next.qualified) active.lastConfirmed = next;
      active.qualified = next.qualified;
      updateFeedback(next);
      renderer.domElement.dataset.state = next.qualified ? 'measured' : next.frozen ? 'frozen' : 'unavailable';
      renderer.domElement.dataset.controlEpoch = String(next.controlEpoch ?? '');
      renderer.domElement.dataset.headTransform = next.transforms ? JSON.stringify(next.transforms.head) : '';
      for (const [name, object] of Object.entries(active.groups)) {
        const matrix = name === 'reachy_antenna_right' ? next.transforms?.antennas.right : name === 'reachy_antenna_left' ? next.transforms?.antennas.left : next.transforms?.[name.replace('reachy_', '')];
        object.visible = !!matrix;
        if (matrix) { object.matrix.fromArray(toColumnMajor(matrix)); object.matrixWorldNeedsUpdate = true; }
      }
      // Only antenna ghosts use requested values. Body/head and solid antenna
      // geometry continue to use the measured transform path above.
      const requested = antennaLatest.current?.targets;
      let targetTransforms;
      if (next.qualified && requested && ['left', 'right'].every(side => Number.isFinite(requested[side]) && Math.abs(requested[side]) <= 90)) {
        try { targetTransforms = buildRobotTransforms({ ...current.status, antennas: requested }, active.manifest.model); } catch { /* Requested preview never invalidates measured geometry. */ }
      }
      for (const side of ['left', 'right']) {
        const ghost = active.antennaGhosts[side], feedbackSide = MODEL_ANTENNA_FEEDBACK_SIDE[side];
        const matrix = targetTransforms?.antennas[side];
        ghost.visible = !!matrix && Math.abs(requested[feedbackSide] - current.status.antennas?.[feedbackSide]) > .25;
        if (matrix) { ghost.matrix.fromArray(toColumnMajor(matrix)); ghost.matrixWorldNeedsUpdate = true; }
      }
      render();
    };
    const visibility = () => { if (document.hidden) turnOff(); else refresh(); };
    const init = async () => {
      try {
        let manifest, schematicGroups;
        if (schematic) {
          const diagram=createSchematicRobot();manifest=diagram.manifest;schematicGroups=diagram.groups;
        } else {
          const response = await fetch('/reachy-model/asset-manifest.json', { signal: abort.signal });
          if (!response.ok) throw Error('The local Reachy model assets are unavailable.');
          manifest = await response.json();
        }
        if (disposed) return;
        scene = new THREE.Scene(); scene.background = new THREE.Color('#edf1f4');
        const camera = new THREE.PerspectiveCamera(35, 1, 0.005, 4); camera.up.set(0, 0, 1);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute('aria-label', 'Reachy Mini measured pose in 3D'); renderer.domElement.setAttribute('role', 'img');
        container.appendChild(renderer.domElement);
        renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); if (!disposed) { turnOff(); setError('3D graphics context was lost. Reload the page to restore the view.'); } });
        const light = new THREE.HemisphereLight(0xffffff, 0x788693, 2.2); light.position.set(0, 0, 1); scene.add(light);
        const key = new THREE.DirectionalLight(0xffffff, 3); key.position.set(0.4, -0.5, 0.7); scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 1); fill.position.set(-0.3, 0.4, 0.25); scene.add(fill);
        const grid = new THREE.GridHelper(0.5, 10, 0xa9b8c1, 0xd3dce2); grid.rotation.x = Math.PI / 2; grid.position.z = -0.001; scene.add(grid);
        const axis = new THREE.AxesHelper(0.11); axis.visible = false; scene.add(axis);
        orbit = new OrbitControls(camera, renderer.domElement);
        orbit.enableDamping = false; orbit.enablePan = false; orbit.minDistance = 0.23; orbit.maxDistance = 1.2;
        orbit.minPolarAngle = 0.02; orbit.maxPolarAngle = Math.PI / 2 + 0.15; orbit.addEventListener('change', render);
        const names = ['reachy_base', 'reachy_body', 'reachy_head', 'reachy_antenna_right', 'reachy_antenna_left'];
        if (!schematic && (!Array.isArray(manifest.rigid_groups) || manifest.rigid_groups.length !== 5 || new Set(manifest.rigid_groups.map(entry => entry.canonical_name)).size !== 5)) throw Error('Invalid Reachy model groups.');
        const groups = {}, loader = new GLTFLoader();
        if (schematicGroups) for (const name of names) {
          const group=schematicGroups[name];loaded.push(group);group.matrixAutoUpdate=false;group.visible=false;groups[name]=group;scene.add(group);
        }
        else await Promise.all(manifest.rigid_groups.map(async entry => {
          const name = entry.canonical_name;
          if (!names.includes(name)) throw Error('Unknown Reachy model group.');
          const url = entry.url || `/reachy-model/${entry.file}`;
          if (!/^\/reachy-model\/[a-z0-9_-]+\.glb$/.test(url)) throw Error('Invalid local model asset path.');
          const result = await loader.loadAsync(url);
          if (disposed || failed) { disposeTree(result.scene); return; }
          const group = result.scene; loaded.push(group); group.name = name;
          group.matrixAutoUpdate = false; group.visible = false; groups[name] = group; scene.add(group);
        }));
        if (disposed) return;
        if (names.some(name => !groups[name])) throw Error('The Reachy model is missing a required moving group.');
        const antennaGhosts = {};
        for (const side of ['right', 'left']) {
          const ghost = groups[`reachy_antenna_${side}`].clone(true);
          ghost.name = `requested_antenna_${side}`; ghost.visible = false;
          ghost.traverse(node => { if (node.isMesh) {
            node.geometry = node.geometry.clone();
            node.material = new THREE.MeshBasicMaterial({ color: 0x007f76, wireframe: true, transparent: true, opacity: .6, depthWrite: false });
          } });
          antennaGhosts[side] = ghost; scene.add(ghost);
        }
        const canvas = renderer.domElement, raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
        let drag = null;
        const ray = event => {
          const bounds = canvas.getBoundingClientRect();
          if (!bounds.width || !bounds.height) return null;
          pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
          raycaster.setFromCamera(pointer, camera); return raycaster.ray;
        };
        const cancelAntennaDrag = () => {
          const previous = drag; drag = null; orbit.enabled = true;
          canvas.style.cursor = moveMode.current ? 'crosshair' : '';
          if (previous && canvas.hasPointerCapture(previous.pointerId)) canvas.releasePointerCapture(previous.pointerId);
        };
        const pointerDown = event => {
          if (drag) { event.preventDefault(); event.stopImmediatePropagation(); return; }
          const current = context();
          if (!moveMode.current || !sameAntennaContext(current, current) || document.hidden || !runtime.current?.qualified || event.button !== 0) return;
          const pointerRay = ray(event); if (!pointerRay) return;
          scene.updateMatrixWorld(true);
          const candidates = ['right', 'left'].flatMap(side => {
            const group = groups[`reachy_antenna_${side}`]; return group.visible ? [group] : [];
          });
          // Head/body solids occlude a hidden antenna. Clicking the head must
          // never grab a stalk that happens to sit behind it along the ray.
          const hit = raycaster.intersectObjects(Object.values(groups).filter(group => group.visible), true)[0]; if (!hit) return;
          let selected = hit.object;
          while (selected.parent && !Object.values(groups).includes(selected)) selected = selected.parent;
          if (!candidates.includes(selected)) return;
          const side = selected.name === 'reachy_antenna_right' ? 'right' : 'left';
          const feedbackSide = MODEL_ANTENNA_FEEDBACK_SIDE[side], startValue = current.targets?.[feedbackSide];
          if (!Number.isFinite(startValue) || Math.abs(startValue) > 90) return;
          const binding = manifest.model.antennas[side];
          const headMatrix = new THREE.Matrix4().fromArray(toColumnMajor(runtime.current.lastConfirmed.transforms.head));
          const pivotMatrix = new THREE.Matrix4().fromArray(toColumnMajor(binding.pivotMatrix));
          const pivot = new THREE.Vector3().setFromMatrixPosition(pivotMatrix).applyMatrix4(headMatrix);
          const axis = new THREE.Vector3(...binding.axis).normalize().transformDirection(pivotMatrix).transformDirection(headMatrix);
          const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axis, pivot), intersection = new THREE.Vector3();
          const usable = Math.abs(pointerRay.direction.dot(axis)) > .15 && pointerRay.intersectPlane(plane, intersection) && intersection.distanceTo(pivot) > .002;
          drag = { ...current, pointerId: event.pointerId, side: feedbackSide, startValue, startX: event.clientX,
            sign: binding.sign ?? 1, axis, pivot, plane, totalDelta: 0, previousVector: usable ? intersection.sub(pivot).normalize() : null };
          // Capture listener precedes OrbitControls' pointer handler. Its normal
          // orbit gesture never shares ownership with an antenna motor gesture.
          orbit.enabled = false; event.preventDefault(); event.stopImmediatePropagation();
          canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
          setAntennaError('');
        };
        const pointerMove = event => {
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (!moveMode.current || document.hidden || !runtime.current?.qualified || !sameAntennaContext(drag, context())) { cancelAntennaDrag(); return; }
          event.preventDefault(); event.stopImmediatePropagation();
          let delta;
          if (drag.previousVector) {
            const intersection = ray(event)?.intersectPlane(drag.plane, new THREE.Vector3());
            if (!intersection || intersection.distanceTo(drag.pivot) < .002) return;
            const vector = intersection.sub(drag.pivot).normalize();
            drag.totalDelta += Math.atan2(drag.axis.dot(new THREE.Vector3().crossVectors(drag.previousVector, vector)), drag.previousVector.dot(vector));
            drag.previousVector = vector; delta = drag.totalDelta;
          } else delta = (event.clientX - drag.startX) * Math.PI / 180 / 2 * drag.sign;
          const value = antennaDragTarget(drag.startValue, delta, drag.sign);
          if (value !== null) changeAntenna(drag.side, value, drag);
        };
        const pointerEnd = event => {
          if (drag && drag.pointerId === event.pointerId) { event.stopImmediatePropagation(); cancelAntennaDrag(); }
        };
        const blur = () => turnOff();
        canvas.addEventListener('pointerdown', pointerDown, true);
        canvas.addEventListener('pointermove', pointerMove, true);
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, pointerEnd, true);
        window.addEventListener('blur', blur);
        removeAntennaEvents = () => {
          cancelAntennaDrag(); canvas.removeEventListener('pointerdown', pointerDown, true); canvas.removeEventListener('pointermove', pointerMove, true);
          for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.removeEventListener(name, pointerEnd, true);
          window.removeEventListener('blur', blur);
        };
        const view = name => {
          orbit.target.set(0, 0, 0.16);
          const positions = { reset: [0.6, -0.45, 0.4], front: [.65, 0, 0.28], side: [0, -.65, 0.28], top: [0.001, 0, .85] };
          camera.position.set(...positions[name]); orbit.update(); render();
        };
        runtime.current = { manifest, groups, camera, refresh, view, axis, lastConfirmed: null, render, antennaGhosts, cancelAntennaDrag,
          wireframe: enabled => { for (const group of loaded) group.traverse(node => { if (node.isMesh) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.wireframe = enabled; }); render(); } };
        observer = new ResizeObserver(() => {
          const width = container.clientWidth, height = container.clientHeight;
          if (width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); render(); }
        });
        observer.observe(container); view('front'); refresh(); timer = setInterval(refresh, 250);
        document.addEventListener('visibilitychange', visibility); setLoading(false);
      } catch (problem) {
        failed = true; removeAntennaEvents(); clearInterval(timer); cancelAnimationFrame(frame); observer?.disconnect(); orbit?.dispose();
        if (scene) { disposeTree(scene); scene.clear(); }
        releaseRenderer(); runtime.current = null;
        if (!disposed && problem.name !== 'AbortError') { setError(problem.message || '3D model could not load.'); setLoading(false); }
      }
    };
    void init();
    return () => {
      disposed = true; moveMode.current = false; abort.abort(); clearInterval(timer); cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility); removeAntennaEvents(); observer?.disconnect(); orbit?.dispose();
      if (scene && !failed) disposeTree(scene);
      releaseRenderer(); runtime.current = null;
    };
  }, [schematic]);
  useEffect(() => { runtime.current?.refresh(); }, [control.status, control.statusReadAt, control.session]);
  useEffect(() => { turnOff(); }, [antennaControl?.disabled, antennaControl?.sessionKey, antennaControl?.controlEpoch, control.status?.controlEpoch]);
  useEffect(() => { runtime.current?.refresh(); }, [antennaControl?.targets]);

  return <section className="panel robot-model">
    <div className="model-heading"><h2>Reachy in 3D</h2><span className={feedback.frozen ? 'model-feedback stale' : 'model-feedback'} aria-live="polite"><Text>{loading ? 'Loading model…' : error ? 'Model unavailable' : feedback.label}</Text></span></div>
    <div className="model-stage"><div className="model-canvas-host" ref={host} />{(loading || error) && <div className="model-placeholder"><p>{error || 'Loading the Reachy model…'}</p></div>}</div>
    {antennaControl && <div className="model-antenna-strip" aria-label="Antenna controls">
      {['left', 'right'].map(side => {
        const requested = antennaControl.targets?.[side], measured = antennaControl.measured?.[side];
        const angle = Number.isFinite(requested) ? Math.max(-90, Math.min(90, requested)) : 0;
        const requestedText = Number.isFinite(requested) ? `${Number(requested.toFixed(1))}°` : '—';
        const measuredText = Number.isFinite(measured) ? `${Number(measured.toFixed(1))}°` : '—';
        return <label key={`${antennaControl.sessionKey}:${antennaControl.controlEpoch ?? control.status?.controlEpoch}:${side}`} className="model-antenna-slider">
          <span className="model-antenna-side"><Text>{side === 'left' ? 'L' : 'R'}</Text></span>
          <input type="range" min={-90} max={90} step={1} value={angle} disabled={antennaControl.disabled} aria-label={`${side === 'left' ? 'Left' : 'Right'} antenna target angle`} aria-valuetext={`${requestedText} requested; ${measuredText} measured`}
            onPointerDown={() => { sliderGestures.current[side] = context(); }}
            onKeyDown={event => { if (!event.repeat) sliderGestures.current[side] = context(); }}
            onKeyUp={() => { delete sliderGestures.current[side]; }}
            onPointerUp={() => { delete sliderGestures.current[side]; }}
            onPointerCancel={() => { delete sliderGestures.current[side]; }}
            onBlur={() => { delete sliderGestures.current[side]; }}
            onChange={event => changeAntenna(side, Number(event.target.value), sliderGestures.current[side] ?? context())} />
          <output className="model-antenna-target"><Text>{requestedText}</Text></output>
          <span className="model-antenna-measured"><Text>{`${measuredText} measured`}</Text></span>
        </label>;
      })}
      {antennaControl.onCenter && <button type="button" disabled={antennaControl.disabled} onClick={() => {
        const current = antennaLatest.current, captured = context();
        if (!current || current.disabled || document.hidden) return;
        try { const result = current.onCenter?.({ sessionKey: captured.sessionKey, controlEpoch: captured.controlEpoch }); result?.catch?.(problem => { if (sameAntennaContext(captured, context())) setAntennaError(problem.message || 'Antenna centring failed.'); }); }
        catch (problem) { setAntennaError(problem.message || 'Antenna centring failed.'); }
      }}><Text>Centre</Text></button>}
    </div>}
    {antennaError && <p className="inline-error" role="alert"><Text>{antennaError}</Text></p>}
    <details className="model-details" onToggle={event => { if (!event.currentTarget.open) turnOff(); }}><summary><Text>Antenna precision & model options</Text></summary>
    {antennaControl && <div className="model-antenna-options">
      <div className="model-antenna-precision">{['left', 'right'].map(side => <PrecisionField key={`${antennaControl.sessionKey}:${antennaControl.controlEpoch ?? control.status?.controlEpoch}:${side}`} label={side === 'left' ? 'Left' : 'Right'} value={antennaControl.targets?.[side]} limit={90} disabled={antennaControl.disabled} onChange={value => changeAntenna(side, value)} />)}</div>
      <label className="model-antenna-mode"><input type="checkbox" checked={movingAntennas} disabled={antennaControl.disabled || loading || !!error} onChange={event => {
        if (event.target.checked && !antennaLatest.current?.disabled && !document.hidden) { moveMode.current = true; setMovingAntennas(true); setAntennaError(''); }
        else turnOff();
      }} /><Text>Move antennas by dragging in 3D</Text></label>
      {movingAntennas && <p className="model-caption">Drag a solid antenna; teal outlines show requested angles. From an edge-on view, dragging right increases its angle (2 pixels per degree). Closing these options turns 3D movement off.</p>}
    </div>}
    <div className="model-toolbar" aria-label="3D viewing controls">
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('front')}><Text>Front</Text></button>
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('side')}><Text>Side</Text></button>
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('top')}><Text>Top</Text></button>
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('reset')}><Text>Reset view</Text></button>
    </div>
    <div className="model-toolbar">
      <label><input type="checkbox" disabled={loading || !!error} checked={wireframe} onChange={event => { setWireframe(event.target.checked); runtime.current?.wireframe(event.target.checked); }} /><Text>Wireframe</Text></label>
      <label><input type="checkbox" disabled={loading || !!error} checked={axes} onChange={event => { setAxes(event.target.checked); if (runtime.current) { runtime.current.axis.visible = event.target.checked; runtime.current.render(); } }} /><Text>Axes</Text></label>
    </div>
    <p className="model-caption">Drag to orbit; scroll or pinch to zoom. Viewing controls do not move Reachy.</p>
    <p className="model-caption">{feedback.reason || 'Head pose is estimated from measured joints. The model uses reported body and antenna positions.'}{axes && ' Axes: red = forward, green = left, blue = up.'}</p>
    <p className="model-caption">{schematic ? 'Schematic view: original simplified geometry and approximate proportions, not the robot’s CAD or a dimensionally accurate model.' : 'Source geometry; physical alignment is unverified.'} Internal head linkages are not animated.</p>
    <p className="model-caption">Left and right name the existing controller channels. Only explicit antenna input moves Reachy; ordinary orbit and zoom remain viewing controls.</p>
    </details>
    {error && <p className="inline-error" role="alert"><Text>{error}</Text></p>}
  </section>;
}
