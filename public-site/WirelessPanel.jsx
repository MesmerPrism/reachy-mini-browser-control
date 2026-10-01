import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { WirelessControl, WIRELESS_EMOTES } from '../src/wireless-control.mjs';
import { createWirelessTalk } from '../src/wireless-audio.mjs';
import FitText from './FitText.jsx';
import { OrientationPad, AngleControl, PrecisionField } from '../src/SpatialControls.jsx';
import AgentConsole from '../src/AgentConsole.jsx';
import { createCommandFlight } from '../src/command-flight.mjs';
const WebXRControls = lazy(() => import('../src/WebXRControls.jsx'));
const RobotModel = lazy(() => import('../src/RobotModel.jsx'));
const SimulatedCamera = lazy(() => import('./SimulatedCamera.jsx'));
const zero = { yaw: 0, pitch: 0, roll: 0, x: 0, y: 0, z: 0 };
const names = { yaw: 'Turn', pitch: 'Nod', roll: 'Tilt', x: 'Forward / back', y: 'Left / right', z: 'Up / down' };
const degrees = value => Number.isFinite(value) ? value.toFixed(1) : '—';
function Slider({ label, value, min, max, measured, unit, disabled, onChange }) {
  return <div className="slider-row"><label><span className="slider-heading"><FitText>{label}</FitText><FitText>{`${value}${unit} requested`}</FitText></span><input type="range" min={min} max={max} step={1} value={value} disabled={disabled} onChange={event => onChange(Number(event.target.value))} aria-label={label} /></label><FitText as="p" className="measured">{`${degrees(measured)}${unit} measured`}</FitText></div>;
}
export default function WirelessPanel({ initialDemo = false, expectedVersion = '1.10.0' }) {
  const control = useRef(null), latest = useRef({}), goal = useRef(null), tokenInput = useRef(null), video = useRef(null), webcam = useRef(null), tracker = useRef(null), follow = useRef(false), pose = useRef(null), talk = useRef(null), tickBusy = useRef(false), picker = useRef(null), generation = useRef(0), previewGeneration=useRef(0);
  const [status, setStatus] = useState({ connected: false }), [token, setToken] = useState(''), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('Disconnected'), [demo, setDemo] = useState(false), [choices, setChoices] = useState([]), [selection, setSelection] = useState(''), [head, setHead] = useState(zero), [antennas, setAntennas] = useState({ left: 0, right: 0 }), [listen, setListen] = useState(false), [listeningVolume, setListeningVolume] = useState(60), [volume, setVolume] = useState(40), [webcamState, setWebcamState] = useState('off'), [following, setFollowing] = useState(false), [tracked, setTracked] = useState(null), [micState, setMicState] = useState('off'), [held, setHeld] = useState(false), [speed, setSpeed] = useState(20);
  const mutationFlight = useRef(createCommandFlight()), xrContext = useRef(null);
  const [xrEngaged, setXrEngaged] = useState(false), [stopRevision, setStopRevision] = useState(0);
  latest.current = { status, busy, demo, speed, xrEngaged };
  const halt = () => { xrContext.current = null; goal.current = null; follow.current = false; setFollowing(false); talk.current?.disable(); };
  const stop = async () => { const gen=generation.current;setStopRevision(value => value + 1);halt();try { await performAction({ action: 'stop' }); } catch(error) { if(gen===generation.current)setError(error.message); } };
  const stopPreview=()=>{previewGeneration.current++;tracker.current?.stop();tracker.current=null;setWebcamState('off');};
  const disconnect = async () => { generation.current++; mutationFlight.current.clear(); halt(); stopPreview(); setListen(false); picker.current?.(null); picker.current = null; setChoices([]); const previous = control.current; control.current = null; await previous?.close(); setStatus({ connected: false }); setToken(''); setMessage('Disconnected; requests were discarded'); };
  const [emote, setEmote] = useState(WIRELESS_EMOTES[0]);
  const performAction = async body => {
    const current = control.current, gen = generation.current;
    if (!current) throw Error('Connect first.');
    const flight = mutationFlight.current.begin(body.action === 'stop');
    halt(); setBusy(true); setError('');
    try {
      const result = await current.command({ ...body, epoch: current.snapshot().controlEpoch });
      if (gen !== generation.current || control.current !== current) throw Error('Connection changed while the command was pending.');
      if (result.queued === false) throw Error('Request was not queued.');
      if (flight.current()) setMessage(result.confirmed ? `${body.action}: daemon response received` : `${body.action}: queued, application unconfirmed`);
      return result;
    } finally {
      flight.release(); if (gen === generation.current) setBusy(mutationFlight.current.busy);
    }
  };
  const command = async body => { const gen = generation.current; try { await performAction(body); } catch (error) { if (gen === generation.current) setError(error.message); } };
  const connect = async isDemo => {
    const captured = token.trim(); setToken(''); setBusy(true); setError('');
    const disconnecting = disconnect(); const gen = ++generation.current; await disconnecting;
    if (gen !== generation.current) return;
    let next;
    try {
      const { ReachyMini } = isDemo ? { ReachyMini: (await import('./demo-sdk.mjs')).DemoWirelessSDK } : await import('@pollen-robotics/reachy-mini-sdk');
      if (gen !== generation.current) return;
      next = new WirelessControl({ ReachyMini, expectedVersion: isDemo ? '1.10.0' : expectedVersion }); control.current = next; setDemo(isDemo);
      next.subscribe(value => { if (control.current === next) setStatus(value); });
      await next.connect({ token: isDemo ? 'simulation' : captured, video: video.current, pickRobot: robots => new Promise(resolve => {
        setChoices(robots); setSelection(robots[0]?.id || ''); picker.current = resolve;
      }) });
      if (gen !== generation.current) { await next.close(); return; }
      setChoices([]); picker.current = null; next.subscribePose();
      const measured = next.snapshot().measured; if (measured) { setHead(Object.fromEntries(Object.keys(zero).map(axis => {return [axis,measured.head[axis]];}))); setAntennas({ left: measured.antennas.left, right: measured.antennas.right }); }
      talk.current = createWirelessTalk({ sdk: next.robot, allowed: () => { const state = next.snapshot(); return !document.hidden && state.connected && state.ready && state.awake && !state.measured?.running && control.current === next; }, capture: () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }), onState: (state, held) => { setMicState(state); setHeld(held); }, onError: error => setError(error.message) });
      if (!isDemo) { const v = await next.robot.getVolume(); if (Number.isFinite(v)) setVolume(v); }
      setMessage(isDemo ? 'Simulation: no robot, microphone or camera connection' : 'Connected; press Wake explicitly to move Reachy');
    } catch (error) { await next?.close(); if(gen===generation.current){if(control.current===next)control.current=null;setError(error.message);setStatus({connected:false});} } finally { if (gen === generation.current) setBusy(false); }
  };
  useEffect(() => {
    const timer = setInterval(async () => {
      const current = control.current; if (!current) return;
      const state = current.snapshot(); setStatus(state);
      if (goal.current && goal.current.epoch !== state.controlEpoch) goal.current = null;
      if (!state.connected || !state.ready || !state.awake || state.measured?.running || document.hidden) { goal.current = null; if (follow.current) { follow.current = false; setFollowing(false); } talk.current?.release(); return; }
      if (tickBusy.current) return;
      let target = goal.current;
      if (follow.current) {
        const tracked = pose.current;
        if (!tracked?.tracked || !tracked.calibrated || performance.now() - tracked.receivedAt + tracked.ageMs > 250) { follow.current = false; setFollowing(false); void stop(); return; }
        target = { action: 'head-manual', pose: { ...state.measured.head, yaw: Math.max(-20,Math.min(20,tracked.yaw)), pitch: Math.max(-15,Math.min(15,tracked.pitch)) } };
      }
      if (!target || latest.current.busy) return;
      if (!follow.current) {
        const arrived = target.pose ? Object.keys(target.pose).every(axis => Math.abs(target.pose[axis]-state.measured.head[axis]) < .1) : Object.keys(target.targets).every(side=>Math.abs(target.targets[side]-state.measured.antennas[side]) < .1);
        if (arrived) { goal.current=null; return; }
      }
      tickBusy.current = true;
      try { const result = await current.command({ ...target, epoch:state.controlEpoch, speed: latest.current.speed }); if (!result.queued) throw Error('Motion request was not queued'); if(control.current===current && current.snapshot().controlEpoch===state.controlEpoch)setMessage('Target queued; compare the measured values'); }
      catch (error) { goal.current = null; follow.current = false; setFollowing(false); setError(error.message); }
      finally { tickBusy.current = false; }
    }, 50);
    const hide = () => { if (document.hidden) { void disconnect(); } };
    const blur = () => { if (goal.current || follow.current) void stop(); else talk.current?.release(); };
    const exit = () => { generation.current++; halt(); stopPreview(); void control.current?.close(); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('blur', blur); window.addEventListener('pagehide', exit);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', blur); window.removeEventListener('pagehide', exit); exit(); };
  }, []);
  useEffect(() => { if (initialDemo) void connect(true); }, []);
  useEffect(() => { const node = video.current; if (node) { node.muted = !listen; node.volume = listeningVolume / 100; control.current?.robot?.setAudioMuted(!listen); if (listen) void node.play().catch(error => setError(error.message)); } }, [listen, listeningVolume]);
  const startWebcam = async () => {
    const requested=++previewGeneration.current;
    setError(''); setWebcamState('starting');
    try { const { createHeadTracker } = await import('../src/head-tracker.js'); if(requested!==previewGeneration.current)return; const next = createHeadTracker({ video: webcam.current, onState: setWebcamState, onError: error => setError(error.message), onPose: value => { pose.current = { ...value, receivedAt: performance.now() }; setTracked(value); if (!value.tracked && follow.current) void stop(); } }); tracker.current = next; await next.start(); }
    catch (error) { if(requested===previewGeneration.current){setWebcamState('off');setError(error.message);} }
  };
  const canMove = status.connected && status.ready && status.awake && !status.measured?.running && !busy;
  const submitHead = (partial, merge = true) => {
    const current = control.current, state = current?.snapshot();
    if (!state?.ready || !state.awake || state.measured?.running || latest.current.busy || mutationFlight.current.busy || document.hidden || follow.current) throw Error('Head control is not ready.');
    if (!partial || !Object.keys(partial).length || Object.entries(partial).some(([axis, value]) => !Object.hasOwn(zero, axis) || !Number.isFinite(value) || Math.abs(value) > (axis === 'yaw' ? 20 : ['pitch', 'roll'].includes(axis) ? 15 : 10))) throw Error('Head target exceeds the selected controls.');
    const previous = merge && goal.current?.action === 'head-manual' && goal.current.epoch === state.controlEpoch ? goal.current.pose : {};
    setHead(value => ({ ...value, ...partial }));
    goal.current = { action: 'head-manual', pose: { ...previous, ...partial }, epoch: state.controlEpoch };
    return { queued: true, confirmed: false, controlEpoch: state.controlEpoch, message: 'Target staged for the bounded controller loop.' };
  };
  const submitAntennas = (partial, merge = true) => {
    const state = control.current?.snapshot();
    if (!state?.ready || !state.awake || state.measured?.running || latest.current.busy || mutationFlight.current.busy || document.hidden || follow.current || latest.current.xrEngaged) throw Error('Antenna control is not ready.');
    if (!partial || !Object.keys(partial).length || Object.entries(partial).some(([axis, value]) => !['left', 'right'].includes(axis) || !Number.isFinite(value) || Math.abs(value) > 90)) throw Error('Antenna target exceeds 90 degrees.');
    const previous = merge && goal.current?.action === 'antennas' && goal.current.epoch === state.controlEpoch ? goal.current.targets : {};
    setAntennas(value => ({ ...value, ...partial }));
    goal.current = { action: 'antennas', targets: { ...previous, ...partial }, epoch: state.controlEpoch };
    return { queued: true, confirmed: false, controlEpoch: state.controlEpoch };
  };
  const executeAgent = async (request, epoch) => {
    const current = control.current;
    if (!current || current.snapshot().controlEpoch !== epoch || (request.name !== 'stop' && (mutationFlight.current.busy || latest.current.busy || follow.current || latest.current.xrEngaged))) throw Error('This connection is busy or the command epoch expired.');
    if (request.name === 'head') return submitHead(request.values, false);
    if (request.name === 'antennas') return submitAntennas(request.values, false);
    if (request.name === 'stop') setStopRevision(value => value + 1);
    return performAction({ action: request.name });
  };
  // Stable receipt conversion: reusing one packet must never fabricate an
  // older monotonic timestamp through Date.now()/performance.now() rounding.
  const modelControl = { session: { mode: demo ? 'demo' : 'wireless', token:`${generation.current}:${status.hardwareId || 'pending'}` }, status: { ...status, headPose: status.measured?.headMatrix, bodyYaw: status.measured?.bodyYawRad, antennas: status.measured?.antennas, diagnostics: { snapshot: { startAgeMs: status.measured ? Date.now() - status.measured.receivedAt : Infinity } } }, statusReadAt: status.measured ? status.measured.receivedAt-performance.timeOrigin : -Infinity };
  const antennaKey = `${generation.current}:${status.hardwareId || 'none'}`;
  const antennaContext = { sessionKey: antennaKey, controlEpoch: status.controlEpoch };
  const verifyAntennaContext = context => {
    const current = control.current;
    if (!context || context.sessionKey !== `${generation.current}:${current?.snapshot().hardwareId || 'none'}` || context.controlEpoch !== current?.snapshot().controlEpoch || mutationFlight.current.busy || latest.current.busy || follow.current || latest.current.xrEngaged) throw Error('Antenna control context changed.');
  };
  const antennaControl = { targets: antennas, measured: status.measured?.antennas, disabled: !canMove || following || xrEngaged,
    ...antennaContext, onChange: (side, value, context) => { verifyAntennaContext(context); return submitAntennas({ [side]: value }); },
    onCenter: context => { verifyAntennaContext(context); return submitAntennas({ left: 0, right: 0 }); } };
  return <>
    {!status.connected && initialDemo && <div className="actions"><button type="button" disabled={busy} onClick={() => void connect(true)}>Start simulation</button></div>}
    {!status.connected && !initialDemo && <form className="connection-form" onSubmit={event => { event.preventDefault(); void connect(false); }}>
      <label htmlFor="hf-token">Hugging Face read token</label><input ref={tokenInput} id="hf-token" type="password" autoComplete="off" spellCheck={false} value={token} onChange={event => setToken(event.target.value)} disabled={busy} placeholder="Paste your own read token" />
      <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Connect through Pollen’s signaling service. My token stays in this tab’s memory.</label>
      <button className="primary" disabled={busy || !token.trim() || !consent}>Connect to my robot</button>
    </form>}
    {choices.length > 0 && <div className="connection-form"><label htmlFor="robot-picker">Choose a robot</label><select id="robot-picker" value={selection} onChange={event => setSelection(event.target.value)}>{choices.map(robot => <option key={robot.id} value={robot.id}>{robot.meta?.name || robot.id}</option>)}</select><button onClick={() => picker.current?.(selection)}>Start selected session</button><button onClick={() => picker.current?.(null)}>Cancel connection</button></div>}
    <div className="controller-bar">
      <p className="status" aria-live="polite">{`${demo && status.connected ? 'Simulated · ' : ''}${message}${status.connected ? ` · ${status.ready ? status.awake ? 'Awake' : 'Asleep' : 'Waiting for fresh verified state'}` : ''}`}</p>
      {status.connected && <div className="actions"><button className="stop" onClick={() => void stop()}>Stop motion requests</button><button disabled={busy || !status.ready || status.awake} onClick={() => void command({action:'wake'})}>Wake</button><button disabled={busy || !status.ready || !status.awake} onClick={() => { talk.current?.disable(); void command({action:'sleep'}); }}>Sleep</button><button onClick={() => void disconnect()}>Disconnect</button></div>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="connected-surface" hidden={!status.connected}>
      <div className="controller-workspace">
        <section className="control-section operator-camera"><h2>{initialDemo || demo ? 'Simulated camera' : 'Reachy camera'}</h2>
          <video ref={video} autoPlay muted playsInline hidden={initialDemo || demo && status.connected} />
          {demo && status.connected && <Suspense fallback={<p>Loading simulated camera…</p>}><SimulatedCamera measured={status.measured} compact /></Suspense>}
          {!demo && <p className="media-note">Live WebRTC feed · audio off until enabled.</p>}
          <details className="camera-options"><summary>Listening & camera details</summary>
            <label className="checkbox"><input type="checkbox" checked={listen} disabled={!status.connected || demo} onChange={event => setListen(event.target.checked)} />Listen to Reachy’s microphone</label>
            <Slider label="Listening volume" value={listeningVolume} min={0} max={100} unit="%" disabled={!listen} onChange={setListeningVolume} />
            <p>{demo ? 'Simulation has no microphone stream.' : 'Listening plays the robot microphone on this computer. It does not enable the computer microphone.'}</p>
          </details>
        </section>
        <Suspense fallback={<section className="control-section"><h2>Reachy in 3D</h2><p>Loading model…</p></section>}><RobotModel control={modelControl} schematic Text={FitText} antennaControl={antennaControl} /></Suspense>
        <section className="control-section operator-head"><h2>Head movement</h2>
          <div className="spatial-orientation"><OrientationPad values={head} measured={status.measured?.head} disabled={!canMove || following || xrEngaged} onChange={submitHead} /><AngleControl label="Tilt" value={head.roll} measured={status.measured?.head.roll} limit={15} disabled={!canMove || following || xrEngaged} onChange={roll => submitHead({ roll })} /></div>
          <button disabled={!canMove || following || xrEngaged} onClick={() => submitHead({ yaw: 0, pitch: 0, roll: 0 })}>Center orientation</button>
          <p className="spatial-help">Solid = requested · dashed = measured. Directions are Reachy’s own.</p>
          <details className="spatial-position"><summary>Position & speed</summary><p>Head position in millimetres from the neutral origin.</p><div className="spatial-position-fields">{['x','y','z'].map(axis => <PrecisionField key={axis} label={names[axis]} value={head[axis]} limit={10} unit="mm" disabled={!canMove || following || xrEngaged} onChange={value => submitHead({ [axis]: value })} />)}</div><button disabled={!canMove || following || xrEngaged} onClick={() => submitHead({ x: 0, y: 0, z: 0 })}>Center position</button><label className="compact-speed">Angular speed <input type="number" aria-label="Angular speed limit" min={5} max={30} value={speed} onChange={event => {const next=Number(event.target.value);if(Number.isFinite(next)&&next>=5&&next<=30)setSpeed(next);}} /> °/s</label><p>Translation is capped at 10 mm/s.</p></details>
        </section>
      </div>
      <div className="controller-options">
        <details className="control-section"><summary>Emotes</summary><label htmlFor="emote-picker">Official emotion library</label><select id="emote-picker" value={emote} onChange={event=>setEmote(event.target.value)}>{WIRELESS_EMOTES.map(name=><option key={name}>{name}</option>)}</select><button disabled={!canMove || demo || following || xrEngaged} onClick={()=>void command({action:'emote',name:emote})}>Play selected emote</button><p>Playback is queued only. The robot must have the official emotion library available.</p></details>
        <details className="control-section"><summary>Speaker & push to talk</summary>
          <Slider label="Reachy speaker volume" value={volume} min={0} max={100} unit="%" disabled={!status.connected || !status.ready || busy} onChange={setVolume} />
          <div className="actions"><button disabled={!status.ready || busy} onClick={() => void command({action:'volume',value:volume})}>Apply speaker volume</button><button disabled={!status.ready || busy} onClick={() => {setVolume(0);void command({action:'volume',value:0});}}>Mute speaker</button></div>
          <p>{`Computer microphone: ${micState}${held ? ' · transmitting while held' : ''}`}</p>
          <div className="actions"><button disabled={!canMove || demo || micState==='enabling'} onClick={() => void talk.current?.enable()}>Enable computer microphone</button><button disabled={micState==='off'} onClick={() => talk.current?.disable()}>Disable microphone</button><button className="push-talk" aria-pressed={held} disabled={!canMove || demo || micState!=='ready'} onPointerDown={event => {event.currentTarget.setPointerCapture(event.pointerId);void talk.current?.press();}} onPointerUp={() => talk.current?.release()} onPointerCancel={() => talk.current?.release()} onLostPointerCapture={() => talk.current?.release()} onKeyDown={event => {if ([' ','Enter'].includes(event.key)&&!event.repeat){event.preventDefault();void talk.current?.press();}}} onKeyUp={event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();talk.current?.release();}}} onBlur={() => talk.current?.release()}>Hold to talk through Reachy</button></div>
        </details>
        <details className="control-section tracking-options"><summary>Webcam tracking</summary><div className="media-grid"><video ref={webcam} autoPlay playsInline muted /><div><p>{`Webcam: ${webcamState} · ${following ? 'Following your head' : 'Preview does not move Reachy'}`}</p><p>{tracked?.tracked && tracked?.calibrated ? `Turn ${degrees(tracked.yaw)}° · Nod ${degrees(tracked.pitch)}°` : 'Look forward and set a neutral pose.'}</p><div className="actions"><button disabled={webcamState!=='off'&&webcamState!=='idle'} onClick={() => void startWebcam()}>Start webcam preview</button><button disabled={!tracked?.tracked || following} onClick={() => {if(!tracker.current?.calibrate())setError('Wait for a fresh face frame.');}}>Set neutral pose</button><button disabled={!canMove || xrEngaged || !tracked?.tracked || !tracked.calibrated || following} onClick={() => {goal.current=null;follow.current=true;setFollowing(true);}}>Follow my head</button><button disabled={!following} onClick={() => void stop()}>Stop following</button><button disabled={webcamState==='off'||webcamState==='idle'} onClick={() => {void stop();stopPreview();}}>Turn webcam off</button></div></div></div></details>
        <details className="control-section xr-options"><summary>WebXR headset</summary><Suspense fallback={<p>Loading WebXR controls…</p>}><WebXRControls snapshot={{ ...status, headAngles: status.measured?.head }} requested={head} allowed={canMove && !following} demo={demo} onHeadChange={partial => { const ctx=xrContext.current;if(!ctx || control.current!==ctx.control || ctx.control.snapshot().controlEpoch!==ctx.epoch)throw Error('XR control context expired.');return submitHead(partial, false); }} onStop={() => { if(xrContext.current?.control===control.current)void stop(); }} onEngagementChange={value => { xrContext.current=value && control.current ? {control:control.current,epoch:control.current.snapshot().controlEpoch} : null;setXrEngaged(value); }} connectionKey={antennaKey} stopRevision={stopRevision} videoElement={video.current} /></Suspense></details>
        <AgentConsole snapshot={() => control.current?.snapshot() || { connected: false }} execute={executeAgent} onDisarm={() => { goal.current = null; }} sessionKey={antennaKey} disabled={!status.connected || busy || following || xrEngaged} />
        <details className="control-section connection-details"><summary>Connection & limits</summary><p>{demo ? 'Simulation only: no robot, camera or microphone connection.' : `Connected robot hardware ID: ${status.hardwareId || 'checking'}`}</p><p>Daemon {status.version || 'checking'}. Targets and Stop are queued; compare fresh measured feedback. Keep one controller active. <a href="#use">Transport details</a>.</p></details>
      </div>
    </div>
  </>;
}
