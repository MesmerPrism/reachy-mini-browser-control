import { useEffect, useRef, useState } from 'react';
import { boundTarget, dialTarget, padTarget } from './spatial-control.mjs';
import './spatial-controls.css';

const display = value => Number.isFinite(value) ? `${Number(value.toFixed(1))}°` : '—';
function pointerHandlers(disabled, change) {
  return {
    onPointerDown: event => { if (disabled || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); change(event); },
    onPointerMove: event => { if (!disabled && event.currentTarget.hasPointerCapture(event.pointerId)) change(event); },
    onPointerUp: event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); },
    onPointerCancel: event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); },
  };
}
export function PrecisionField({ label, value, limit, disabled, onChange, unit = '°' }) {
  const formatted = Number.isFinite(value) ? String(Number(value.toFixed(1))) : '';
  const [draft, setDraft] = useState(formatted);
  const dirty = useRef(false);
  useEffect(() => { if (!dirty.current || disabled) { dirty.current = false; setDraft(formatted); } }, [formatted, disabled]);
  const commit = () => {
    if (!dirty.current) return;
    dirty.current = false;
    const next = draft.trim() === '' ? null : boundTarget(Number(draft), limit);
    if (next !== null && !disabled) { setDraft(String(next)); onChange(next); } else setDraft(formatted);
  };
  return <label className="spatial-precision"><span>{label}</span><input aria-label={`${label} target ${unit === '°' ? 'angle' : 'position in millimetres'}`} title="Enter or leave the field to apply" type="number" step="0.1" min={-limit} max={limit} value={draft} disabled={disabled || limit === 0} onChange={event => { dirty.current = true; setDraft(event.target.value); }} onBlur={commit} onKeyDown={event => {
    if (event.key === 'Enter') { event.preventDefault(); commit(); }
    if (event.key === 'Escape') { event.preventDefault(); dirty.current = false; setDraft(formatted); }
  }} /><span>{unit}</span></label>;
}

export function OrientationPad({ values, measured = {}, limits = { yaw: 20, pitch: 15 }, disabled, onChange }) {
  const position = target => ({ x: 50 - (limits.yaw ? boundTarget(target.yaw, limits.yaw) / limits.yaw : 0) * 43,
    y: 50 + (limits.pitch ? boundTarget(target.pitch, limits.pitch) / limits.pitch : 0) * 36 });
  const requested = position(values), actual = position(measured);
  const change = event => { const target = padTarget(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), limits); if (target) onChange(target); };
  const key = event => {
    const amount = event.shiftKey ? 5 : 1;
    const changes = { ArrowLeft: ['yaw', amount], ArrowRight: ['yaw', -amount], ArrowUp: ['pitch', -amount], ArrowDown: ['pitch', amount] };
    if (!disabled && changes[event.key]) { event.preventDefault(); const [axis, delta] = changes[event.key]; onChange({ [axis]: boundTarget(values[axis] + delta, limits[axis]) }); }
    if (!disabled && event.key === 'Home') { event.preventDefault(); onChange({ yaw: 0, pitch: 0 }); }
  };
  return <div className="spatial-pad-control">
    <h3>Look direction</h3><p className="spatial-help">Drag to turn and nod. Directions are Reachy’s own.</p>
    <div className={`spatial-pad${disabled ? ' is-disabled' : ''}`} tabIndex={disabled ? -1 : 0} role="group" aria-label="Head turn and nod pad. Arrow keys adjust one degree, Shift adjusts five, Home centres turn and nod." aria-disabled={disabled} onKeyDown={key} {...pointerHandlers(disabled, change)}>
      <span className="pad-label pad-left">Left</span><span className="pad-label pad-right">Right</span><span className="pad-label pad-up">Up</span><span className="pad-label pad-down">Down</span>
      <span className="pad-cross pad-cross-x" /><span className="pad-cross pad-cross-y" />
      {Number.isFinite(measured.yaw) && Number.isFinite(measured.pitch) && <span className="pad-measured" style={{ left: `${actual.x}%`, top: `${actual.y}%` }} />}
      <span className="pad-target" style={{ left: `${requested.x}%`, top: `${requested.y}%` }}><svg viewBox="0 0 40 30" aria-hidden="true"><rect x="2" y="2" width="36" height="26" rx="10" /><circle cx="13" cy="14" r="4" /><circle cx="27" cy="14" r="4" /></svg></span>
    </div>
    <div className="spatial-fields"><PrecisionField label="Turn" value={values.yaw} limit={limits.yaw} disabled={disabled} onChange={yaw => onChange({ yaw })} /><PrecisionField label="Nod" value={values.pitch} limit={limits.pitch} disabled={disabled} onChange={pitch => onChange({ pitch })} /></div>
    <p className="spatial-measured">Measured: turn {display(measured.yaw)} · nod {display(measured.pitch)}</p>
  </div>;
}

export function AngleControl({ label, value, measured, limit = 90, disabled, onChange, kind = 'tilt' }) {
  const drag = useRef(null);
  const selectable = boundTarget(value, limit) ?? 0;
  // Front-view roll and top-view yaw are counterclockwise for positive angles.
  const direction = kind === 'antenna' ? 1 : -1;
  const angle = direction * selectable;
  const arcLimit = Math.min(limit, 90) * Math.PI / 180;
  const arcX = 72 * Math.sin(arcLimit), arcY = 86 - 72 * Math.cos(arcLimit);
  const change = event => {
    const raw = dialTarget(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), 90);
    if (raw === null) return;
    const start = drag.current;
    const next = boundTarget(start?.pointerId === event.pointerId ? start.value + direction * (raw - start.angle) : direction * raw, limit);
    if (next !== null) onChange(next);
  };
  const handlers = pointerHandlers(disabled || limit === 0, change);
  const key = event => {
    if (disabled) return;
    const delta = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : event.key === 'ArrowRight' ? direction : event.key === 'ArrowLeft' ? -direction : 0;
    if (delta || event.key === 'Home') { event.preventDefault(); onChange(event.key === 'Home' ? 0 : boundTarget(selectable + delta * (event.shiftKey ? 5 : 1), limit)); }
  };
  return <div className="spatial-angle-control">
    <h3>{label}</h3>
    <svg className={`spatial-dial${disabled ? ' is-disabled' : ''}`} style={{ height: 'auto', aspectRatio: '180 / 110' }} viewBox="0 0 180 110" role="slider" tabIndex={disabled ? -1 : 0} aria-label={`${label} target angle`} aria-valuemin={-limit} aria-valuemax={limit} aria-valuenow={selectable} aria-valuetext={`${display(value)} requested; ${display(measured)} measured`} aria-disabled={disabled} onKeyDown={key} {...handlers} onPointerDown={event => {
      // Grabbing the robot glyph starts from its held pose, avoiding a jump to
      // an end stop just because an eye or antenna tip was clicked off-centre.
      drag.current = event.target.closest?.('g') ? { pointerId: event.pointerId, value: selectable, angle: dialTarget(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), 90) } : null;
      handlers.onPointerDown(event);
    }} onLostPointerCapture={() => { drag.current = null; }}>
      <path d={`M${90 - arcX} ${arcY} A72 72 0 0 1 ${90 + arcX} ${arcY}`} className="spatial-arc" /><path d="M90 10v8" className="spatial-ticks" />
      {Number.isFinite(measured) && <path d="M90 86V20" className="spatial-feedback-line" transform={`rotate(${direction * (boundTarget(measured, limit) ?? 0)} 90 86)`} />}
      <g transform={`rotate(${angle} 90 86)`}>
        {kind === 'tilt' ? <><rect x="59" y="33" width="62" height="44" rx="15" className="spatial-robot-face" /><circle cx="76" cy="53" r="7" className="spatial-eye" /><circle cx="104" cy="53" r="7" className="spatial-eye" /></> : kind === 'body' ? <><ellipse cx="90" cy="64" rx="30" ry="22" className="spatial-robot-face" /><path d="M90 66V28m-7 9 7-9 7 9" className="spatial-arrow" /></> : <><path d="M90 86V22" className="spatial-antenna" /><circle cx="90" cy="22" r="9" className="spatial-knob" /></>}
      </g><text x="7" y="106">{direction < 0 ? '+' : '−'}{limit}°</text><text x="143" y="106">{direction < 0 ? '−' : '+'}{limit}°</text>
    </svg>
    <PrecisionField label={label} value={value} limit={limit} disabled={disabled} onChange={onChange} />
    <p className="spatial-measured">Measured {display(measured)}</p>
    {Number.isFinite(value) && Math.abs(value) > limit && <p className="spatial-help">Held target is outside the selectable range.</p>}
  </div>;
}
