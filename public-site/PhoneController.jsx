import { useEffect, useRef, useState } from 'react';
import PhoneSensorPad from '../src/PhoneSensorPad.jsx';
import { createPhonePeer, PHONE_PAIR_CODE_LIMIT } from '../src/phone-peer.mjs';

export default function PhoneController() {
  const [offer, setOffer] = useState(''), [answer, setAnswer] = useState(''), [state, setState] = useState({ status: 'idle', active: false });
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [revision, setRevision] = useState(0);
  const peer = useRef(null), held = useRef(false), sample = useRef(null), lastSent = useRef(null);
  const release = () => { held.current = false; peer.current?.setActive(false); };
  const disconnect = () => { release(); const previous = peer.current; peer.current = null; previous?.close(); sample.current = null; setOffer(''); setAnswer(''); setState({ status: 'idle', active: false }); setRevision(value => value + 1); };
  useEffect(() => {
    const timer = setInterval(() => {
      if (!held.current) return;
      const value = sample.current, now = performance.now();
      const age = value ? now - Math.min(value.receivedAt, value.sampleAt ?? value.receivedAt) : Infinity;
      if (document.hidden || age < 0 || age > 250 || peer.current?.getState().inputReady !== true) {
        release(); setRevision(previous => previous + 1); setMessage('Input paused. Check the PC approval and enable following again.');
        return;
      }
      if (lastSent.current?.receivedAt === value.receivedAt && lastSent.current?.sampleAt === value.sampleAt) return;
      lastSent.current = { receivedAt: value.receivedAt, sampleAt: value.sampleAt };
      peer.current?.sendPose({ quaternion: value.quaternion, sampleAgeMs: age, held: true });
    }, 50);
    const hide = () => { if (document.hidden) { release(); setRevision(value => value + 1); } };
    window.addEventListener('blur', release); document.addEventListener('visibilitychange', hide);
    return () => { clearInterval(timer); window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', hide); held.current = false; peer.current?.close(); };
  }, []);
  const connect = async event => {
    event.preventDefault(); const code = offer.trim(); disconnect(); setError(''); setMessage('');
    let next;
    next = createPhonePeer({ role: 'phone', onState: value => {
      if (peer.current !== next) return;
      if (held.current && value.active !== true) { held.current = false; setRevision(previous => previous + 1); }
      setState(value); if (value.status === 'connected' || value.status === 'closed') setAnswer('');
    }, onClose: () => { if (peer.current === next) { held.current = false; sample.current = null; setRevision(value => value + 1); setMessage('Pairing ended. Connect with a new PC code.'); } } });
    peer.current = next;
    try { const reply = await next.acceptOffer(code); if (peer.current === next) setAnswer(reply); }
    catch { if (peer.current === next) setError('That code is invalid, expired or unavailable on this network. Ask the PC for a new code.'); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(answer); setMessage('Phone reply copied. Paste it on the PC.'); } catch { setMessage('Select and copy the phone reply below, then paste it on the PC.'); } };
  return <section className="phone-controller"><h2>Phone controller</h2>
    <p>Simulation only. This page sends phone orientation to a paired PC demo and has no robot connection.</p>
    {state.status !== 'connected' && <p>On the PC, open <a href="#demo" target="_blank" rel="noopener noreferrer">Demo</a> → Phone motion → Pair a phone to this demo. Keep both devices on the same Wi-Fi and both tabs visible.</p>}
    {['idle', 'closed'].includes(state.status) && <form className="connection-form" onSubmit={connect}><label htmlFor="phone-sender-offer">Paste the PC connection code</label><textarea id="phone-sender-offer" rows={4} maxLength={PHONE_PAIR_CODE_LIMIT} required value={offer} onChange={event => setOffer(event.target.value)} autoComplete="off" spellCheck={false} /><button type="submit">Connect phone to PC demo</button></form>}
    {answer && <><label htmlFor="phone-sender-answer">Phone reply code</label><textarea id="phone-sender-answer" className="phone-code" rows={3} readOnly value={answer} spellCheck={false} onFocus={event => event.target.select()} /><button type="button" onClick={() => void copy()}>Copy phone reply code</button><p>Paste this reply on the PC and finish pairing. Keep both codes private.</p></>}
    <p role="status">Pairing: {state.status}. {message}</p>
    <button type="button" disabled={state.status === 'idle'} onClick={disconnect}>Disconnect phone</button>
    {state.status === 'connected' && !state.inputReady && <p>Waiting for the PC to enable this phone.</p>}
    <PhoneSensorPad key={`phone:${revision}`} allowed={state.status === 'connected' && state.inputReady === true} onSample={value => { sample.current = value; }}
      onHeldChange={(value, pressSample) => { if (!value) { release(); return true; } if (!pressSample || peer.current?.getState().inputReady !== true || peer.current?.setActive(true, { reference: pressSample.quaternion }) !== true) return false; sample.current = pressSample; lastSent.current = null; held.current = true; return true; }} />
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
