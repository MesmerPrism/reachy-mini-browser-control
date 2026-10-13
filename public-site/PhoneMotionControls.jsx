import { useEffect, useRef, useState } from 'react';
import PhoneSensorPad from '../src/PhoneSensorPad.jsx';
import { createPhoneFollowGuard, conservativeBaselineReceipt } from '../src/phone-follow.mjs';
import { createPhonePeer, PHONE_PAIR_CODE_LIMIT } from '../src/phone-peer.mjs';

const initialPeer = { status: 'idle', approved: false };
export default function PhoneMotionControls({ demo, allowed, getSnapshot, onEngagementChange, onHeadChange, onStop, connectionKey, stopRevision }) {
  const [mode, setMode] = useState('direct'), [peerState, setPeerState] = useState(initialPeer);
  const [offer, setOffer] = useState(''), [answer, setAnswer] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('Following is off.'), [revision, setRevision] = useState(0);
  const latest = useRef({}), peer = useRef(null), runtime = useRef({ guard: createPhoneFollowGuard(), token: null, sample: null, engaged: false, lastSend: -Infinity, handoffUntil: null });
  latest.current = { demo, allowed, getSnapshot, onEngagementChange, onHeadChange, onStop, connectionKey, mode };
  const release = (reason = 'Following paused.') => {
    const r = runtime.current, engaged = r.engaged;
    r.engaged = false; r.guard.disarm(); r.sample = null; r.handoffUntil = null;
    if (engaged) { latest.current.onStop(); latest.current.onEngagementChange(false); }
    setMessage(reason);
  };
  const start = (sample, reference) => {
    const c = latest.current, state = c.getSnapshot(), wallNow = Date.now(), now = performance.now(), r = runtime.current;
    if (!c.demo || !c.allowed || document.hidden || !state.connected || !state.ready || !state.awake || state.busy || state.measured?.running) return false;
    r.token = r.guard.beginSession(state.controlEpoch);
    if (!r.guard.arm(r.token, sample, state.measured.head, { now, baselineReceivedAt: conservativeBaselineReceipt(state.measured.receivedAt, wallNow, now),
      epoch: state.controlEpoch, held: true, allowed: true, visible: true, demo: true, reference })) return false;
    try { if (c.onEngagementChange(true) !== true) { r.guard.disarm(); return false; } }
    catch { r.guard.disarm(); return false; }
    r.sample = sample; r.engaged = true; r.handoffUntil = null; r.key = c.connectionKey; r.epoch = state.controlEpoch; r.lastSend = -Infinity;
    setMessage('Following the held phone in simulation.'); return true;
  };
  useEffect(() => {
    const timer = setInterval(() => {
      const r = runtime.current, c = latest.current;
      if (!r.engaged) {
        if (r.handoffUntil !== null && performance.now() > r.handoffUntil) { peer.current?.setApproved(false); release('The previous hold did not finish in time. Enable again.'); }
        return;
      }
      const state = c.getSnapshot(), now = performance.now();
      const target = r.guard.update(r.token, r.sample, now, { epoch: state.controlEpoch, held: true,
        allowed: c.allowed && r.key === c.connectionKey && state.ready && state.awake && !state.measured?.running, visible: !document.hidden, demo: c.demo });
      if (!r.guard.armed) { peer.current?.setApproved(false); release('Following ended. Check fresh readings and enable again.'); return; }
      if (target && now - r.lastSend >= 100) {
        r.lastSend = now;
        try { c.onHeadChange(target); } catch { peer.current?.setApproved(false); release('The simulation control context changed. Enable again.'); }
      }
    }, 50);
    const revoke = () => { peer.current?.setApproved(false); release(); };
    const hide = () => { if (document.hidden) revoke(); };
    window.addEventListener('blur', revoke); document.addEventListener('visibilitychange', hide);
    return () => { clearInterval(timer); window.removeEventListener('blur', revoke); document.removeEventListener('visibilitychange', hide); peer.current?.close(); runtime.current.guard.endSession(); };
  }, []);
  useEffect(() => {
    peer.current?.setApproved(false); release();
  }, [stopRevision]);
  useEffect(() => () => { peer.current?.close(); runtime.current.guard.endSession(); }, [connectionKey]);
  const disconnectPeer = () => { const previous = peer.current; peer.current = null; previous?.close(); release(); setPeerState(initialPeer); setOffer(''); setAnswer(''); };
  const changeMode = value => { if(value===latest.current.mode)return;disconnectPeer(); setMode(value); setError(''); setRevision(previous => previous + 1); };
  const prepareOffer = async () => {
    disconnectPeer(); setError('');
    if (!latest.current.demo || !latest.current.allowed) { setError('Start a ready simulation before pairing.'); return; }
    let next;
    next = createPhonePeer({ role: 'host', onState: value => {
      if (peer.current !== next) return;
      setPeerState(value); if (value.status === 'connected' || value.status === 'closed') { setOffer(''); setAnswer(''); }
    }, onSample: value => {
      if (peer.current !== next || !next.getState().approved || !latest.current.demo) return;
      const sample = { quaternion: value.quaternion, receivedAt: value.receivedAt, sampleAgeMs: value.sampleAgeMs, source: 'paired-phone' };
      const r = runtime.current;
      // A lost release can make the first packet of a new hold stop the old
      // hold. Discard packets while that stop is pending; never replay them.
      if (!r.engaged && r.handoffUntil !== null) {
        const state = latest.current.getSnapshot();
        if (performance.now() > r.handoffUntil) { next.setApproved(false); release('The previous hold did not finish in time. Enable again.'); return; }
        if (!document.hidden && (state.busy || !latest.current.allowed)) return;
      }
      if (!r.engaged && !start(sample, value.reference)) { next.setApproved(false); r.handoffUntil = null; return; }
      runtime.current.sample = sample;
    }, onRelease: reason => { if (peer.current === next) { release('The paired phone released or lost fresh input.'); if (reason === 'new-hold') runtime.current.handoffUntil = performance.now() + 500; } },
    onClose: () => { if (peer.current === next) release('Phone pairing ended. Pair again to continue.'); } });
    peer.current = next;
    try { const code = await next.createOffer(); if (peer.current === next) setOffer(code); }
    catch { if (peer.current === next) setError('Pairing could not start. Use the same Wi-Fi and a supported secure browser, then try a new pairing.'); }
  };
  const finish = async event => {
    event.preventDefault(); const current = peer.current, code = answer.trim(); setAnswer(''); setError('');
    try { await current?.acceptAnswer(code); }
    catch { if (peer.current === current) setError('The reply is invalid, expired or belongs to another pairing. Start again if necessary.'); }
  };
  const copyOffer = async () => { try { await navigator.clipboard.writeText(offer); setMessage('PC connection code copied.'); } catch { setMessage('Select and copy the PC connection code below.'); } };
  return <details className="control-section phone-motion"><summary>Phone motion · demo</summary>
    <p>Use phone turn, nod and tilt to move the simulated head. This feature cannot control a physical robot.</p>
    <div className="phone-modes"><button type="button" aria-pressed={mode === 'direct'} onClick={() => changeMode('direct')}>On this phone</button><button type="button" aria-pressed={mode === 'host'} onClick={() => changeMode('host')}>Pair a phone to this demo</button></div>
    {mode === 'direct' ? <PhoneSensorPad key={`direct:${revision}`} allowed={demo && allowed} stopRevision={stopRevision}
      onSample={sample => { runtime.current.sample = sample; }} onHeldChange={(held, sample) => { if (held) return start(sample); release(); return true; }} /> : <>
      <p>Use the same Wi-Fi on both devices. Open this site’s <a href="#phone" target="_blank" rel="noopener noreferrer">phone controller page</a> on the phone. Pairing uses two private codes, which expire after two minutes. No account or Bluetooth is needed.</p>
      <ol><li>Create a PC code and copy it to the phone controller.</li><li>Copy the phone’s reply back here and finish pairing.</li><li>Enable the paired phone here, then enable sensors, set neutral and hold its control button.</li></ol>
      <div className="actions"><button type="button" disabled={!demo || !allowed || ['preparing', 'connecting'].includes(peerState.status)} onClick={() => void prepareOffer()}>Create PC connection code</button><button type="button" disabled={peerState.status === 'idle'} onClick={disconnectPeer}>Disconnect paired phone</button></div>
      {offer && <><label htmlFor="phone-host-offer">PC connection code</label><textarea id="phone-host-offer" className="phone-code" readOnly value={offer} rows={3} spellCheck={false} onFocus={event => event.target.select()} /><button type="button" onClick={() => void copyOffer()}>Copy PC connection code</button></>}
      {peerState.status === 'waiting' && <form className="connection-form" onSubmit={finish}><label htmlFor="phone-host-answer">Phone reply code</label><textarea id="phone-host-answer" rows={3} maxLength={PHONE_PAIR_CODE_LIMIT} value={answer} onChange={event => setAnswer(event.target.value)} autoComplete="off" spellCheck={false} required /><button type="submit">Finish phone pairing</button></form>}
      <p role="status">Pairing: {peerState.status}. {message}</p>
      <label className="checkbox"><input type="checkbox" disabled={!demo || !allowed || peerState.status !== 'connected'} checked={peerState.approved === true} onChange={event => { peer.current?.setApproved(event.target.checked); if (!event.target.checked) release(); }} />Enable the paired phone for this simulation</label>
      <p>Keep this PC tab visible. Lost input revokes following; stale input also revokes this approval. Enable again explicitly. Connection codes include private connection information: keep them out of public reports.</p>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </details>;
}
