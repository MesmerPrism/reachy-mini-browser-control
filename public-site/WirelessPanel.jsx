import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { WirelessControl, WIRELESS_EMOTES } from '../src/wireless-control.mjs';
import { createWirelessTalk } from '../src/wireless-audio.mjs';
import FitText from './FitText.jsx';
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
  latest.current = { status, busy, demo, speed };
  const halt = () => { goal.current = null; follow.current = false; setFollowing(false); talk.current?.disable(); };
  const stop = async () => { halt(); try { const result = await control.current?.command({ action: 'stop' }); setMessage(result?.message || 'Stopped local requests'); } catch (error) { setError(error.message); } };
  const stopPreview=()=>{previewGeneration.current++;tracker.current?.stop();tracker.current=null;setWebcamState('off');};
  const disconnect = async () => { generation.current++; halt(); stopPreview(); setListen(false); picker.current?.(null); picker.current = null; setChoices([]); const previous = control.current; control.current = null; await previous?.close(); setStatus({ connected: false }); setToken(''); setMessage('Disconnected; requests were discarded'); };
  const [emote, setEmote] = useState(WIRELESS_EMOTES[0]);
  const command = async body => { goal.current = null; follow.current = false; setFollowing(false); setBusy(true); setError(''); try { const result = await control.current.command({...body,epoch:control.current.snapshot().controlEpoch}); if (result.queued === false) throw Error('Request was not queued.'); setMessage(result.confirmed ? `${body.action}: daemon response received` : `${body.action}: queued, application unconfirmed`); } catch (error) { setError(error.message); } finally { setBusy(false); } };
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
      const measured = next.snapshot().measured; if (measured) { setHead(Object.fromEntries(Object.keys(zero).map(axis => {const limit=axis==='yaw'?20:['pitch','roll'].includes(axis)?15:10;return [axis,Math.round(Math.max(-limit, Math.min(limit, measured.head[axis])))];}))); setAntennas({ left: Math.round(measured.antennas.left), right: Math.round(measured.antennas.right) }); }
      talk.current = createWirelessTalk({ sdk: next.robot, allowed: () => { const state = next.snapshot(); return !document.hidden && state.connected && state.ready && state.awake && !state.measured?.running && control.current === next; }, capture: () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }), onState: (state, held) => { setMicState(state); setHeld(held); }, onError: error => setError(error.message) });
      if (!isDemo) { const v = await next.robot.getVolume(); if (Number.isFinite(v)) setVolume(v); }
      setMessage(isDemo ? 'Simulation: no robot, microphone or camera connection' : 'Connected; press Wake explicitly to move Reachy');
    } catch (error) { await next?.close(); if(gen===generation.current){if(control.current===next)control.current=null;setError(error.message);setStatus({connected:false});} } finally { if (gen === generation.current) setBusy(false); }
  };
  useEffect(() => {
    const timer = setInterval(async () => {
      const current = control.current; if (!current) return;
      const state = current.snapshot(); setStatus(state);
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
        const arrived = target.pose ? Object.keys(zero).every(axis => Math.abs(target.pose[axis]-state.measured.head[axis]) < .5) : ['left','right'].every(side=>Math.abs(target.targets[side]-state.measured.antennas[side]) < .5);
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
  // Stable receipt conversion: reusing one packet must never fabricate an
  // older monotonic timestamp through Date.now()/performance.now() rounding.
  const modelControl = { session: { mode: demo ? 'demo' : 'wireless', token:`${generation.current}:${status.hardwareId || 'pending'}` }, status: { ...status, headPose: status.measured?.headMatrix, bodyYaw: status.measured?.bodyYawRad, antennas: status.measured?.antennas, diagnostics: { snapshot: { startAgeMs: status.measured ? Date.now() - status.measured.receivedAt : Infinity } } }, statusReadAt: status.measured ? status.measured.receivedAt-performance.timeOrigin : -Infinity };
  return <>
    {!status.connected && initialDemo && <div className="actions"><button type="button" disabled={busy} onClick={() => void connect(true)}><FitText>Start simulation</FitText></button></div>}
    {!status.connected && !initialDemo && <form className="connection-form" onSubmit={event => { event.preventDefault(); void connect(false); }}>
      <label htmlFor="hf-token"><FitText>Hugging Face read token</FitText></label><input ref={tokenInput} id="hf-token" type="password" autoComplete="off" spellCheck={false} value={token} onChange={event => setToken(event.target.value)} disabled={busy} placeholder="Paste your own read token" />
      <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><FitText>I have stopped other robot apps and understand that browser Stop and target delivery are unconfirmed.</FitText></label>
      <div className="actions"><button type="submit" className="primary" disabled={busy || !consent || !token.trim()}><FitText>{busy ? 'Connecting…' : 'Connect Wireless Mini'}</FitText></button><button type="button" disabled={busy} onClick={() => void connect(true)}><FitText>Try simulated controls</FitText></button></div>
    </form>}
    {choices.length > 0 && <div className="connection-form"><label htmlFor="robot-picker"><FitText>Choose your Wireless Mini</FitText></label><select id="robot-picker" value={selection} onChange={event => setSelection(event.target.value)}>{choices.map(robot => <option key={robot.id} value={robot.id}>{robot.meta?.name || robot.id}</option>)}</select><FitText>{choices.find(robot=>robot.id===selection)?.meta?.name || selection}</FitText><button onClick={() => picker.current?.(selection)}><FitText>Start selected session</FitText></button><button onClick={() => { picker.current?.(null); }}><FitText>Cancel connection</FitText></button></div>}
    <FitText as="p" className="status" aria-live="polite">{`${demo && status.connected ? 'Simulated · ' : ''}${message}${status.connected ? ` · Daemon ${status.version || 'checking'} · ${status.ready ? status.awake ? 'Awake' : 'Asleep' : 'Waiting for fresh verified state'}` : ''}`}</FitText>
    {error && <FitText as="p" className="error" role="alert">{error}</FitText>}
    {status.connected && <>
      {!demo&&<FitText as="p">{`Connected robot hardware ID: ${status.hardwareId || 'checking'}`}</FitText>}
      {demo ? <p>Head and antenna controls affect this simulation only. Camera and microphone permissions are not needed for the room view.</p> : <p className="notice">WebRTC targets and Stop are queued only. Measured telemetry is shown separately. Keep one controller active. <a href="#use">Read the transport limits</a>.</p>}
      <div className="actions"><button className="stop" onClick={() => void stop()}><FitText>Stop motion requests</FitText></button><button disabled={busy || !status.ready || status.awake} onClick={() => void command({action:'wake'})}><FitText>Wake</FitText></button><button disabled={busy || !status.ready || !status.awake} onClick={() => { talk.current?.disable(); void command({action:'sleep'}); }}><FitText>Sleep</FitText></button><button onClick={() => void disconnect()}><FitText>Disconnect</FitText></button></div>
    </>}
    <div className="media-grid"><section className="control-section"><h3>{initialDemo || demo ? 'Simulated Reachy camera' : 'Reachy camera & microphone'}</h3><video ref={video} autoPlay muted playsInline hidden={initialDemo || demo && status.connected} />{demo && status.connected && <Suspense fallback={<FitText as="p">Loading simulated camera…</FitText>}><SimulatedCamera measured={status.measured} /></Suspense>}<FitText as="p">{status.connected && !demo ? 'Live WebRTC media; audio is off until you enable Listen.' : demo && status.connected ? 'Simulation has no microphone stream.' : initialDemo ? 'Start simulation to explore the room view.' : 'Connect a real robot to receive its camera and microphone.'}</FitText><label className="checkbox"><input type="checkbox" checked={listen} disabled={!status.connected || demo} onChange={event => setListen(event.target.checked)} /><FitText>Listen to Reachy’s microphone</FitText></label><Slider label="Listening volume" value={listeningVolume} min={0} max={100} unit="%" disabled={!listen} onChange={setListeningVolume} /></section><Suspense fallback={<FitText as="p">Loading 3D view…</FitText>}><RobotModel control={modelControl} schematic Text={FitText} /></Suspense></div>
    <div className="controls-grid"><section className="control-section"><h3>Head movement</h3>{Object.keys(zero).map(axis => <Slider key={axis} label={names[axis]} value={head[axis]} min={axis==='yaw'?-20:['pitch','roll'].includes(axis)?-15:-10} max={axis==='yaw'?20:['pitch','roll'].includes(axis)?15:10} unit={['x','y','z'].includes(axis)?' mm':'°'} measured={status.measured?.head[axis]} disabled={!canMove || following} onChange={value => { const next = {...head,[axis]:value}; setHead(next); goal.current={action:'head-manual',pose:next}; }} />)}<div className="actions"><button disabled={!canMove || following} onClick={() => { setHead(zero); goal.current={action:'head-manual',pose:zero}; }}><FitText>Center head</FitText></button></div><Slider label="Angular speed limit" value={speed} min={5} max={30} unit="°/s" onChange={setSpeed} /><p>Translation is limited to 10 mm/s. The robot may limit combined poses further.</p></section>
      <section className="control-section"><h3>Antennas</h3>{['left','right'].map(side=><Slider key={side} label={`${side==='left'?'Left':'Right'} antenna`} value={antennas[side]} min={-90} max={90} unit="°" measured={status.measured?.antennas[side]} disabled={!canMove || following} onChange={value => {const next={...antennas,[side]:value};setAntennas(next);goal.current={action:'antennas',targets:next};}} />)}<button disabled={!canMove} onClick={() => {setAntennas({left:0,right:0});goal.current={action:'antennas',targets:{left:0,right:0}};}}><FitText>Center antennas</FitText></button><p>Antenna speed is limited to 120°/s.</p>
        <h3>Recorded emotes</h3><label htmlFor="emote-picker"><FitText>Official emotion library</FitText></label><select id="emote-picker" value={emote} onChange={event=>setEmote(event.target.value)}>{WIRELESS_EMOTES.map(name=><option key={name}>{name}</option>)}</select><FitText>{emote}</FitText><button disabled={!canMove || demo} onClick={()=>void command({action:'emote',name:emote})}><FitText>Play selected emote</FitText></button><p>Playback is queued only. The robot must have the official emotion library available.</p>
        <h3>Audio output & push to talk</h3><Slider label="Reachy speaker volume" value={volume} min={0} max={100} unit="%" disabled={!status.connected || !status.ready || busy} onChange={setVolume} /><div className="actions"><button disabled={!status.ready || busy} onClick={() => void command({action:'volume',value:volume})}><FitText>Apply speaker volume</FitText></button><button disabled={!status.ready || busy} onClick={() => {setVolume(0);void command({action:'volume',value:0});}}><FitText>Mute speaker</FitText></button></div>
        <FitText as="p">{`Computer microphone: ${micState}${held ? ' · transmitting while held' : ''}`}</FitText><div className="actions"><button disabled={!canMove || demo || micState==='enabling'} onClick={() => void talk.current?.enable()}><FitText>Enable computer microphone</FitText></button><button disabled={micState==='off'} onClick={() => talk.current?.disable()}><FitText>Disable microphone</FitText></button><button className="push-talk" aria-pressed={held} disabled={!canMove || demo || micState!=='ready'} onPointerDown={event => {event.currentTarget.setPointerCapture(event.pointerId);void talk.current?.press();}} onPointerUp={() => talk.current?.release()} onPointerCancel={() => talk.current?.release()} onLostPointerCapture={() => talk.current?.release()} onKeyDown={event => {if ([' ','Enter'].includes(event.key)&&!event.repeat){event.preventDefault();void talk.current?.press();}}} onKeyUp={event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();talk.current?.release();}}} onBlur={() => talk.current?.release()}><FitText>Hold to talk through Reachy</FitText></button></div>
      </section></div>
    <section className="control-section"><h3>Webcam head tracking</h3><div className="media-grid"><video ref={webcam} autoPlay playsInline muted /><div><FitText as="p">{`Webcam: ${webcamState} · ${following ? 'Following your head' : 'Preview does not move Reachy'}`}</FitText><FitText as="p">{tracked?.tracked && tracked?.calibrated ? `Turn ${degrees(tracked.yaw)}° · Nod ${degrees(tracked.pitch)}°` : 'Look forward and set a neutral pose.'}</FitText><div className="actions"><button disabled={webcamState!=='off'&&webcamState!=='idle'} onClick={() => void startWebcam()}><FitText>Start webcam preview</FitText></button><button disabled={!tracked?.tracked || following} onClick={() => {if(!tracker.current?.calibrate())setError('Wait for a fresh face frame.');}}><FitText>Set neutral pose</FitText></button><button disabled={!canMove || !tracked?.tracked || !tracked.calibrated || following} onClick={() => {goal.current=null;follow.current=true;setFollowing(true);}}><FitText>Follow my head</FitText></button><button disabled={!following} onClick={() => void stop()}><FitText>Stop following</FitText></button><button disabled={webcamState==='off'||webcamState==='idle'} onClick={() => {void stop();stopPreview();}}><FitText>Turn webcam off</FitText></button></div></div></div></section>
  </>;
}
