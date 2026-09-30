import { useHeadControl } from './useHeadControl';

function HeadDial({ label, unit = '°', limit, value, measured, disabled, onChange }) {
  const selectable = Math.max(-limit, Math.min(limit, value));
  const radians = (limit ? selectable / limit : 0) * Math.PI / 2;
  const display = number => `${Number(number.toFixed(1))}${unit}`;
  const x = 110 + 86 * Math.sin(radians), y = 105 - 86 * Math.cos(radians);
  const pointer = event => {
    if (disabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width * 220 - 110;
    const py = 105 - (event.clientY - bounds.top) / bounds.height * 135;
    onChange(Math.atan2(px, Math.max(0, py)) / (Math.PI / 2) * limit);
  };
  return <div className="dial">
    <h3>{label}</h3><div className="measured">Measured {Number.isFinite(measured) ? display(measured) : '—'}</div>
    <svg className={disabled ? 'dial-face disabled' : 'dial-face'} viewBox="0 0 220 135" aria-hidden="true"
      onPointerDown={event => { if (!disabled) { event.currentTarget.setPointerCapture(event.pointerId); pointer(event); } }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pointer(event); }}>
      <path d="M24 105 A86 86 0 0 1 196 105" className="dial-arc" />
      <path d="M24 105h10 M49 44l8 8 M110 19v10 M171 44l-8 8 M196 105h-10" className="dial-ticks" />
      <path d={`M110 105 L${x} ${y}`} className="dial-needle" /><circle cx={x} cy={y} r="10" className="dial-handle" />
      <text x="4" y="128">-{limit}{unit}</text><text x="184" y="128">+{limit}{unit}</text>
    </svg>
    <output className="target-angle">{display(value)}<span>Target</span></output>
    <div className="slider-row"><span>-{limit}{unit}</span><input aria-label={`${label} head target ${unit === '°' ? 'angle' : 'position in millimetres'}`} type="range" min={-limit} max={limit} step="1" value={selectable} disabled={disabled || limit === 0} onChange={event => onChange(Number(event.target.value))} /><span>+{limit}{unit}</span></div>
    {value !== selectable && <p className="hold-caption">Held target is outside the selectable range.</p>}
  </div>;
}

export default function HeadControls({ control, onEngagementChange }) {
  const head = useHeadControl(control, onEngagementChange);
  const bridgeRequired = control.session?.headManualPoseModes !== true;
  const dial = (axis, label, unit = '°') => <HeadDial key={axis} label={label} unit={unit} limit={head.limits[axis]} value={head.targets[axis]} measured={head.measured[axis]} disabled={head.disabled || head.limits[axis] === 0} onChange={value => head.setAxis(axis, value)} />;
  return <section className="panel head-controls">
    <h2>Head</h2><p className="panel-caption">Click or drag to set all six head axes. No webcam is needed.</p>
    <div className="dials head-orientation-dials">{dial('yaw', 'Turn')}{dial('pitch', 'Nod')}{dial('roll', 'Tilt')}</div>
    <p className="panel-caption">Position is in Reachy’s frame: positive values move forward, left and up. Zero is the daemon’s neutral head origin.</p>
    <div className="dials head-position-dials">{dial('x', 'Forward/back', 'mm')}{dial('y', 'Left/right', 'mm')}{dial('z', 'Up/down', 'mm')}</div>
    <div className="head-centre-actions"><button className="centre-button" disabled={head.disabled} onClick={head.centreRotation}>Centre rotation</button><button className="centre-button" disabled={head.disabled} onClick={head.centrePosition}>Centre position</button></div>
    <p className="hold-caption">Absolute targets hold when released. Each centre action preserves the other three axes.</p>
    <div className="antenna-speed"><label className="speed-toggle"><input type="checkbox" checked={head.limitSpeed} disabled={head.optionsDisabled} onChange={event => head.changeLimitSpeed(event.target.checked)} />Limit head speed</label><label className="speed-value"><input aria-label="Head speed limit in degrees per second" aria-describedby="head-speed-help" aria-invalid={head.invalidAngularSpeed || undefined} type="number" min="5" max="120" step="1" value={head.speedLimit} disabled={head.optionsDisabled || !head.limitSpeed} onChange={event => head.changeSpeedLimit(event.target.value === '' ? '' : Number(event.target.value))} /><span>deg/s</span></label><label className="speed-value position-speed"><input aria-label="Head position speed limit in millimetres per second" aria-describedby="head-speed-help" aria-invalid={head.invalidLinearSpeed || undefined} type="number" min="1" max="50" step="1" value={head.linearSpeedLimit} disabled={head.optionsDisabled || !head.limitSpeed} onChange={event => head.changeLinearSpeedLimit(event.target.value === '' ? '' : Number(event.target.value))} /><span>mm/s</span></label></div>
    <p className="speed-help" id="head-speed-help">{bridgeRequired ? 'Restart the updated bridge to enable all six head controls.' : control.session?.headTrackingMotion !== true ? 'Head movement awaits the mapping check.' : head.invalidSpeed ? 'Enter an angular speed from 5 to 120 deg/s and a position speed from 1 to 50 mm/s.' : head.limitSpeed ? 'Application speed caps; network delays can reduce speed. Changes apply to your next input.' : 'Off: direct control. Changes apply to your next input.'}</p>
    {head.error && <p className="inline-error" role="alert">{head.error}</p>}
  </section>;
}
