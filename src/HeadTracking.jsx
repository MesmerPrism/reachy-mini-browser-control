import { useEffect, useRef, useState } from 'react';
import { createHeadFollow } from './head-follow.mjs';

const emptyPose = { yaw: 0, pitch: 0, roll: 0, tracked: false, calibrated: false, ageMs: Infinity };
export default function HeadTracking({ control }) {
  const video = useRef(null), tracker = useRef(null), generation = useRef(0), latestPose = useRef(emptyPose), latestAt = useRef(0);
  const latestControl = useRef(control); latestControl.current = control;
  const [preview, setPreview] = useState('idle'), [pose, setPose] = useState(emptyPose), [following, setFollowing] = useState('idle'), [error, setError] = useState('');
  const lastRender = useRef(0), follow = useRef(null);
  const simulation = useRef(null);
  const [simulating, setSimulating] = useState(false);
  if (!follow.current) follow.current = createHeadFollow({
    send: body => latestControl.current.sendControl(body), onChange: setFollowing, onError: setError,
    getLimits: () => latestControl.current.session?.headTrackingLimits || { yaw: 20, pitch: 15 },
  });
  const stopPreview = () => {
    clearInterval(simulation.current); simulation.current = null; setSimulating(false);
    generation.current++; void follow.current.stop(); tracker.current?.stop(); tracker.current = null;
    latestPose.current = emptyPose; setPose(emptyPose); setPreview('idle');
  };
  const startPreview = async () => {
    setError(''); const gen = ++generation.current; setPreview('starting');
    try {
      const { createHeadTracker } = await import('./head-tracker.js');
      if (gen !== generation.current) return;
      const next = createHeadTracker({ video: video.current,
        onState: state => { if (gen === generation.current) setPreview(state); },
        onError: error => { if (gen === generation.current) { setError(error.message || String(error)); void follow.current.stop(); } },
        onPose: nextPose => {
          if (gen !== generation.current) return;
          latestPose.current = nextPose; latestAt.current = performance.now();
          follow.current.push(nextPose);
          if (!nextPose.tracked || performance.now() - lastRender.current > 100) { lastRender.current = performance.now(); setPose(nextPose); }
        },
      });
      tracker.current = next; await next.start();
      if (gen !== generation.current) next.stop();
    } catch (e) { if (gen === generation.current) { setError(e.message); tracker.current?.stop(); tracker.current = null; setPreview('idle'); } }
  };
  const calibrate = () => {
    if (follow.current.active) return;
    setError('');
    if (!tracker.current?.calibrate()) setError('Look at the webcam, then capture a fresh neutral pose.');
  };
  const startFollow = () => {
    if (follow.current.active || !canFollow) return;
    const latest = latestPose.current;
    const ageMs = latest.ageMs + performance.now() - latestAt.current;
    if (!latest.tracked || !latest.calibrated || ageMs > 250) { setError('Tracking is not fresh. Recalibrate before following.'); return; }
    setError(''); void follow.current.start(); follow.current.push({ ...latest, ageMs });
  };
  const stopFollow = () => { clearInterval(simulation.current); simulation.current = null; setSimulating(false); void follow.current.stop(); };
  const runSimulation = async () => {
    if (latestControl.current.session?.mode !== 'demo' || follow.current.active) return;
    setError(''); setSimulating(true); await follow.current.start();
    if (!follow.current.active) { setSimulating(false); return; }
    const startedAt = performance.now();
    simulation.current = setInterval(() => {
      if (!follow.current.active || performance.now() - startedAt >= 1800) { stopFollow(); return; }
      const outgoing = performance.now() - startedAt < 900;
      follow.current.push({ yaw: outgoing ? 5 : 0, pitch: outgoing ? 3 : 0, ageMs: 0, tracked: true, calibrated: true });
    }, 65);
  };
  const active = following !== 'idle';
  const { session, status, disabled, stopRevision } = control;
  const canFollow = session?.headTrackingMotion === true && session?.headTrackingModes === true && pose.tracked && pose.calibrated && status.awake && !disabled;
  useEffect(() => { clearInterval(simulation.current); simulation.current = null; setSimulating(false); void follow.current.stop({ notify: false }); }, [stopRevision]);
  useEffect(() => {
    if (!status.connected || !status.ready || !status.awake) void follow.current.stop();
  }, [status.connected, status.ready, status.awake]);
  useEffect(() => { follow.current.observeStatus(status, control.statusReadAt); }, [status, control.statusReadAt]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stopPreview(); };
    const exit = () => stopPreview();
    const blur = () => stopFollow();
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', exit); window.addEventListener('blur', blur);
    return () => { generation.current++; clearInterval(simulation.current); tracker.current?.stop(); void follow.current.stop(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', exit); window.removeEventListener('blur', blur); };
  }, []);
  const labels = { idle: 'Webcam is off', starting: 'Starting webcam…', ready: 'Look forward and set neutral', calibrated: 'Neutral pose set', 'tracking-lost': 'Face lost — set neutral again' };
  return <section className="panel head-tracking">
    <h2>Head tracking</h2><p className="panel-caption">Use your webcam to turn and nod Reachy’s head.</p>
    <div className="head-tracking-content">
      <div className="webcam-preview"><video ref={video} autoPlay muted playsInline hidden={preview === 'idle' || preview === 'starting'} /><p className="webcam-status" aria-live="polite">{labels[preview] || preview}</p></div>
      <div className="head-tracking-controls">
        <p>Webcam images stay on this computer. Head tracking does not use the microphone.</p>
        <div className="head-angles" aria-label="Tracked relative head angles"><span>Turn <output>{pose.tracked && pose.calibrated ? `${Math.round(pose.yaw)}°` : '—'}</output></span><span>Nod <output>{pose.tracked && pose.calibrated ? `${Math.round(pose.pitch)}°` : '—'}</output></span></div>
        <div className="head-actions"><button disabled={session?.headTrackingModes !== true || simulating} onClick={preview === 'idle' ? startPreview : stopPreview}>{preview === 'idle' ? 'Start webcam' : 'Stop webcam'}</button><button onClick={calibrate} disabled={!pose.tracked || preview === 'starting' || active}>Set neutral</button></div>
        <button className="follow-button" aria-pressed={active} disabled={!canFollow && !active}
          onPointerDown={event => { if (canFollow) { event.currentTarget.setPointerCapture(event.pointerId); startFollow(); } }}
          onPointerUp={stopFollow} onPointerCancel={stopFollow} onLostPointerCapture={stopFollow} onBlur={stopFollow}
          onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); startFollow(); } }}
          onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); stopFollow(); } }}>
          {active ? 'Following — release to hold' : session?.mode === 'demo' ? 'Hold to follow in simulation' : session?.headTrackingLimits?.pilot ? 'Hold to check head movement (2°)' : 'Hold to follow'}
        </button>
        {session?.mode === 'demo' && <button disabled={disabled || !status.awake || active || preview !== 'idle'} onClick={runSimulation}>Run simulated head test</button>}
        <p className="head-help">{session?.headTrackingModes !== true ? 'Restart the updated bridge to enable webcam preview.' : session?.headTrackingMotion !== true ? 'Webcam preview is available. Robot follow awaits the head-mapping check.' : session?.headTrackingLimits?.pilot ? 'Mapping check: look forward and set neutral, then hold to turn or nod gently. Movement is limited to 2° from the starting pose. Release holds position.' : 'Hold the button or Space to follow. Release holds the measured position. Turn is limited to 20° and nod to 15°.'}</p>
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
    </div>
  </section>;
}
