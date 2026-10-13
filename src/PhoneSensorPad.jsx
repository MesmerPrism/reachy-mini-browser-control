import { useEffect, useRef, useState } from 'react';
import { createPhoneOrientationSource } from './phone-orientation.mjs';
import { mapXRHeadPose } from './xr-head-follow.mjs';

const zero = { yaw: 0, pitch: 0, roll: 0 };
export default function PhoneSensorPad({ allowed = false, onSample, onHeldChange, stopRevision = 0 }) {
  const [sensor, setSensor] = useState({ state: 'stopped', message: 'Phone sensors are off.' });
  const [enabled, setEnabled] = useState(false), [held, setHeld] = useState(false), [calibrated, setCalibrated] = useState(false);
  const [preview, setPreview] = useState(null), [fresh, setFresh] = useState(false), [error, setError] = useState('');
  const source = useRef(null), sample = useRef(null), neutral = useRef(null), hold = useRef(false), permit = useRef(false), latest = useRef({});
  latest.current = { allowed, onSample, onHeldChange };
  const endHold = () => {
    if (!hold.current) return;
    hold.current = false; setHeld(false); latest.current.onHeldChange?.(false);
  };
  useEffect(() => {
    let alive = true;
    source.current = createPhoneOrientationSource({
      onSample: value => {
        if (!alive) return;
        sample.current = value; setFresh(true);
        if (neutral.current) setPreview(mapXRHeadPose(value.quaternion, neutral.current, zero));
        latest.current.onSample?.(value);
      },
      onReset: () => {
        endHold(); sample.current = null; neutral.current = null; permit.current = false;
        if (alive) { setFresh(false); setCalibrated(false); setEnabled(false); setPreview(null); }
      },
      onStatus: value => { if (alive) setSensor(value); },
    });
    const watchdog = setInterval(() => {
      if (!alive) return;
      const age = sample.current ? performance.now() - sample.current.receivedAt : Infinity;
      const valid = age >= 0 && age <= 250 && !document.hidden;
      setFresh(valid);
      if (hold.current && (!valid || !latest.current.allowed)) { endHold(); permit.current = false; setEnabled(false); }
    }, 50);
    const blur = () => { endHold(); permit.current = false; setEnabled(false); };
    window.addEventListener('blur', blur);
    return () => { endHold(); alive = false; clearInterval(watchdog); window.removeEventListener('blur', blur); source.current?.stopSensors(); source.current = null; };
  }, []);
  useEffect(() => { endHold(); permit.current = false; setEnabled(false); }, [stopRevision]);
  const beginHold = () => {
    const value = sample.current, age = value ? performance.now() - value.receivedAt : Infinity;
    if (hold.current || !permit.current || !neutral.current || !latest.current.allowed || document.hidden || age < 0 || age > 250) return;
    try {
      if (latest.current.onHeldChange?.(true, value) !== true) throw Error('Following is not ready. Check the demo or paired connection.');
      neutral.current = [...value.quaternion]; setPreview(zero); hold.current = true; setHeld(true); setError('');
    } catch { setError('Following is not ready. Check the demo or paired connection.'); permit.current = false; setEnabled(false); }
  };
  return <div className="phone-sensor-pad">
    <p role="status">{sensor.state === 'ready' && calibrated ? 'Phone orientation is available.' : sensor.message}</p>
    <div className="actions"><button type="button" onClick={() => { setError(''); void source.current?.startSensors(); }}>Enable phone sensors</button><button type="button" disabled={!source.current?.active} onClick={() => source.current?.stopSensors()}>Turn phone sensors off</button>
      <button type="button" disabled={!fresh || held} onClick={() => { neutral.current = [...sample.current.quaternion]; setCalibrated(true); setPreview(zero); }}>Set phone neutral</button></div>
    <p className="phone-preview">{preview ? `Turn ${preview.yaw.toFixed(1)}° · Nod ${preview.pitch.toFixed(1)}° · Tilt ${preview.roll.toFixed(1)}°` : 'Hold the phone upright, then set neutral.'}{sensor.state === 'ready' && !fresh ? ' Waiting for a recent reading.' : ''}</p>
    <label className="checkbox"><input type="checkbox" checked={enabled} disabled={!allowed || !fresh || !calibrated} onChange={event => { permit.current = event.target.checked; setEnabled(event.target.checked); if (!event.target.checked) endHold(); }} />Enable motion following</label>
    <button className="phone-hold" type="button" aria-pressed={held} disabled={!allowed || !enabled || !fresh || !calibrated}
      onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); beginHold(); }}
      onPointerUp={endHold} onPointerCancel={endHold} onLostPointerCapture={endHold} onBlur={endHold}
      onKeyDown={event => { if ([' ', 'Enter'].includes(event.key) && !event.repeat) { event.preventDefault(); beginHold(); } }}
      onKeyUp={event => { if ([' ', 'Enter'].includes(event.key)) { event.preventDefault(); endHold(); } }}>Hold to move the simulated head</button>
    <p>Turn, nod and tilt follow the phone. Each hold starts from the current pose. Release pauses following. Changing screen orientation requires a new neutral pose. Translation stays on the touch controls.</p>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
