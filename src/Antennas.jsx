function Dial({ side, value, measured, disabled, onChange }) {
  const radians = value * Math.PI / 180;
  const x = 110 + 86 * Math.sin(radians), y = 105 - 86 * Math.cos(radians);
  const changeFromPointer = event => {
    if (disabled) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width * 220 - 110;
    const py = 105 - (event.clientY - bounds.top) / bounds.height * 135;
    onChange(Math.atan2(px, Math.max(0, py)) * 180 / Math.PI);
  };
  return <div className="dial">
    <h3>{side}</h3>
    <div className="measured">Measured {Number.isFinite(measured) ? `${Math.round(measured)}°` : '—'}</div>
    <svg className={disabled ? 'dial-face disabled' : 'dial-face'} viewBox="0 0 220 135" aria-hidden="true" onPointerDown={e => { if (!disabled) { e.currentTarget.setPointerCapture(e.pointerId); changeFromPointer(e); } }} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) changeFromPointer(e); }}>
      <path d="M24 105 A86 86 0 0 1 196 105" className="dial-arc" />
      <path d="M24 105h10 M49 44l8 8 M110 19v10 M171 44l-8 8 M196 105h-10" className="dial-ticks" />
      <path d={`M110 105 L${x} ${y}`} className="dial-needle" />
      <circle cx={x} cy={y} r="10" className="dial-handle" />
      <text x="4" y="128">-90°</text><text x="184" y="128">+90°</text>
    </svg>
    <output className="target-angle">{value}°<span>Target</span></output>
    <div className="slider-row"><span>-90°</span><input aria-label={`${side} antenna target angle`} type="range" min="-90" max="90" step="1" value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} /><span>+90°</span></div>
  </div>;
}
export default function Antennas({ targets, measured, disabled, optionsDisabled, bridgeUpdateRequired, setAngle, centre, limitSpeed, speedLimit, changeLimitSpeed, changeSpeedLimit, invalidSpeed }) {
  return <section className="panel antennas"><h2>Antennas</h2><p className="panel-caption">Click or drag to set an angle.</p>
    <div className="dials"><Dial side="Left" value={targets.left} measured={measured?.left} disabled={disabled} onChange={v => setAngle('left', v)} /><Dial side="Right" value={targets.right} measured={measured?.right} disabled={disabled} onChange={v => setAngle('right', v)} /></div>
    <div className="antenna-speed"><label className="speed-toggle"><input type="checkbox" checked={limitSpeed} disabled={optionsDisabled} onChange={e => changeLimitSpeed(e.target.checked)} />Limit antenna speed</label><label className="speed-value"><input aria-label="Antenna speed limit in degrees per second" aria-describedby="antenna-speed-help" aria-invalid={invalidSpeed || undefined} type="number" min="5" max="120" step="1" value={speedLimit} disabled={optionsDisabled || !limitSpeed} onChange={e => changeSpeedLimit(e.target.value === '' ? '' : Number(e.target.value))} /><span>deg/s</span></label></div>
    <p className="speed-help" id="antenna-speed-help">{bridgeUpdateRequired ? 'Bridge update required — restart the updated bridge to enable antenna controls.' : invalidSpeed ? 'Enter a speed from 5 to 120 deg/s.' : limitSpeed ? 'Application speed cap; network delays can reduce speed. Changes apply to your next input.' : 'Off: direct control. Changes apply to your next input.'}</p>
    <button className="centre-button" disabled={disabled} onClick={centre}>Centre both</button><p className="hold-caption">Angles hold when released.</p>
  </section>;
}
