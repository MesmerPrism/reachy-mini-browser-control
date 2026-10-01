import { AngleControl } from './SpatialControls';

export default function Antennas({ targets, measured, disabled, optionsDisabled, bridgeUpdateRequired, setAngle, centre, limitSpeed, speedLimit, changeLimitSpeed, changeSpeedLimit, invalidSpeed }) {

  return <section className="panel antennas"><h2>Antennas</h2><p className="panel-caption">Drag each antenna tip to its angle. Left and right are Reachy's own.</p>

    <div className="spatial-antenna-pair"><AngleControl label="Left antenna" kind="antenna" value={targets.left} measured={measured?.left} disabled={disabled} onChange={v => setAngle('left', v)} /><AngleControl label="Right antenna" kind="antenna" value={targets.right} measured={measured?.right} disabled={disabled} onChange={v => setAngle('right', v)} /></div>

    <div className="antenna-speed"><label className="speed-toggle"><input type="checkbox" checked={limitSpeed} disabled={optionsDisabled} onChange={e => changeLimitSpeed(e.target.checked)} />Limit antenna speed</label><label className="speed-value"><input aria-label="Antenna speed limit in degrees per second" aria-describedby="antenna-speed-help" aria-invalid={invalidSpeed || undefined} type="number" min="5" max="120" step="1" value={speedLimit} disabled={optionsDisabled || !limitSpeed} onChange={e => changeSpeedLimit(e.target.value === '' ? '' : Number(e.target.value))} /><span>deg/s</span></label></div>

    <p className="speed-help" id="antenna-speed-help">{bridgeUpdateRequired ? 'Bridge update required — restart the updated bridge to enable antenna controls.' : invalidSpeed ? 'Enter a speed from 5 to 120 deg/s.' : limitSpeed ? 'Application speed cap; network delays can reduce speed. Changes apply to your next input.' : 'Off: direct control. Changes apply to your next input.'}</p>

    <button className="centre-button" disabled={disabled} onClick={centre}>Centre both</button><p className="hold-caption">Angles hold when released.</p>

  </section>;

}
