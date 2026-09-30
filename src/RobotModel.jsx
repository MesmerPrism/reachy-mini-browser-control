import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { deriveRobotModelState, toColumnMajor } from './robot-model-state.mjs';

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

export default function RobotModel({ control, schematic = false, Text = 'span' }) {
  const host = useRef(null), runtime = useRef(null), latest = useRef(control);
  latest.current = control;
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ label: 'Waiting for measured state', frozen: false });
  const [wireframe, setWireframe] = useState(false), [axes, setAxes] = useState(false);

  useEffect(() => {
    let disposed = false, failed = false, renderer, scene, orbit, observer, timer, frame;
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
      updateFeedback(next);
      renderer.domElement.dataset.state = next.qualified ? 'measured' : next.frozen ? 'frozen' : 'unavailable';
      renderer.domElement.dataset.controlEpoch = String(next.controlEpoch ?? '');
      renderer.domElement.dataset.headTransform = next.transforms ? JSON.stringify(next.transforms.head) : '';
      for (const [name, object] of Object.entries(active.groups)) {
        const matrix = name === 'reachy_antenna_right' ? next.transforms?.antennas.right : name === 'reachy_antenna_left' ? next.transforms?.antennas.left : next.transforms?.[name.replace('reachy_', '')];
        object.visible = !!matrix;
        if (matrix) { object.matrix.fromArray(toColumnMajor(matrix)); object.matrixWorldNeedsUpdate = true; }
      }
      render();
    };
    const visibility = () => { if (!document.hidden) refresh(); };
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
        renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); if (!disposed) setError('3D graphics context was lost. Reload the page to restore the view.'); });
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
        const view = name => {
          orbit.target.set(0, 0, 0.23);
          const positions = { reset: [0.8, -0.6, 0.43], front: [1, 0, 0.28], side: [0, -1, 0.28], top: [0.001, 0, 1.2] };
          camera.position.set(...positions[name]); orbit.update(); render();
        };
        runtime.current = { manifest, groups, camera, refresh, view, axis, lastConfirmed: null, render,
          wireframe: enabled => { for (const group of loaded) group.traverse(node => { if (node.isMesh) for (const material of Array.isArray(node.material) ? node.material : [node.material]) material.wireframe = enabled; }); render(); } };
        observer = new ResizeObserver(() => {
          const width = container.clientWidth, height = container.clientHeight;
          if (width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); render(); }
        });
        observer.observe(container); view('reset'); refresh(); timer = setInterval(refresh, 250);
        document.addEventListener('visibilitychange', visibility); setLoading(false);
      } catch (problem) {
        failed = true; clearInterval(timer); cancelAnimationFrame(frame); observer?.disconnect(); orbit?.dispose();
        if (scene) { disposeTree(scene); scene.clear(); }
        releaseRenderer(); runtime.current = null;
        if (!disposed && problem.name !== 'AbortError') { setError(problem.message || '3D model could not load.'); setLoading(false); }
      }
    };
    void init();
    return () => {
      disposed = true; abort.abort(); clearInterval(timer); cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility); observer?.disconnect(); orbit?.dispose();
      if (scene && !failed) disposeTree(scene);
      releaseRenderer(); runtime.current = null;
    };
  }, [schematic]);
  useEffect(() => { runtime.current?.refresh(); }, [control.status, control.statusReadAt, control.session]);

  return <section className="panel robot-model">
    <div className="model-heading"><h2>Reachy in 3D</h2><span className={feedback.frozen ? 'model-feedback stale' : 'model-feedback'} aria-live="polite"><Text>{loading ? 'Loading model…' : error ? 'Model unavailable' : feedback.label}</Text></span></div>
    <div className="model-stage"><div className="model-canvas-host" ref={host} />{(loading || error) && <div className="model-placeholder"><p>{error || 'Loading the Reachy model…'}</p></div>}</div>
    <div className="model-toolbar" aria-label="3D viewing controls">
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('front')}><Text>Front</Text></button>
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('side')}><Text>Side</Text></button>
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('top')}><Text>Top</Text></button>
      <button disabled={loading || !!error} onClick={() => runtime.current?.view('reset')}><Text>Reset view</Text></button>
      <label><input type="checkbox" disabled={loading || !!error} checked={wireframe} onChange={event => { setWireframe(event.target.checked); runtime.current?.wireframe(event.target.checked); }} /><Text>Wireframe</Text></label>
      <label><input type="checkbox" disabled={loading || !!error} checked={axes} onChange={event => { setAxes(event.target.checked); if (runtime.current) { runtime.current.axis.visible = event.target.checked; runtime.current.render(); } }} /><Text>Axes</Text></label>
    </div>
    <p className="model-caption">Drag to orbit; scroll or pinch to zoom. Viewing controls do not move Reachy.</p>
    <p className="model-caption">{feedback.reason || 'Head pose is estimated from measured joints. The model uses reported body and antenna positions.'}{axes && ' Axes: red = forward, green = left, blue = up.'}</p>
    <p className="model-caption">{schematic ? 'Schematic view: original simplified geometry and approximate proportions, not the robot’s CAD or a dimensionally accurate model.' : 'Source geometry; physical alignment is unverified.'} Internal head linkages are not animated.</p>
    {error && <p className="inline-error" role="alert"><Text>{error}</Text></p>}
  </section>;
}
