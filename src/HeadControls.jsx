import { lazy, Suspense, useState, useRef } from 'react';
const WebXRControls = lazy(() => import('./WebXRControls.jsx'));
import { useHeadControl } from './useHeadControl';

import { OrientationPad, AngleControl, PrecisionField } from './SpatialControls';

export default function HeadControls({ control, onEngagementChange, videoElement }) {

  const [xrEngaged, setXrEngaged] = useState(false);
  const engagement = useRef({ manual: false, xr: false, epoch: null });
  const reportEngagement = (kind, value) => { engagement.current[kind] = value; onEngagementChange?.(engagement.current.manual || engagement.current.xr); };
  const head = useHeadControl(control, value => reportEngagement('manual', value));

  const bridgeRequired = control.session?.headManualPoseModes !== true;

  const position = (axis, label) => <div key={axis}><PrecisionField label={label} unit="mm" limit={head.limits[axis]} value={head.targets[axis]} disabled={head.disabled || xrEngaged} onChange={value => head.setAxis(axis, value)} /><p className="spatial-measured">Measured {Number.isFinite(head.measured[axis]) ? `${Number(head.measured[axis].toFixed(1))} mm` : "—"}</p></div>;

  return <section className="panel head-controls">

    <h2>Head</h2><p className="panel-caption">Point the gaze; drag the head to tilt.</p>

    <div className="spatial-orientation"><OrientationPad values={head.targets} measured={head.measured} limits={head.limits} disabled={head.disabled || xrEngaged} onChange={head.setPose} /><AngleControl label="Tilt" value={head.targets.roll} measured={head.measured.roll} limit={head.limits.roll} disabled={head.disabled || xrEngaged} onChange={value => head.setAxis('roll', value)} /></div>

    <details className="spatial-position"><summary>Head position  /  millimetres</summary><p className="panel-caption">Position is in Reachy’s frame: positive values move forward, left and up. Zero is the daemon’s neutral head origin.</p>

    <div className="spatial-position-fields">{position('x', 'Forward/back')}{position('y', 'Left/right')}{position('z', 'Up/down')}</div><button className="centre-button" disabled={head.disabled || xrEngaged} onClick={head.centrePosition}>Centre position</button></details>

    <div className="head-centre-actions"><button className="centre-button" disabled={head.disabled || xrEngaged} onClick={head.centreRotation}>Centre rotation</button></div>

    <p className="hold-caption">Targets hold when released. Centre rotation keeps position.</p>

    <details className="head-advanced"><summary>Head speed limits</summary><div className="antenna-speed"><label className="speed-toggle"><input type="checkbox" checked={head.limitSpeed} disabled={head.optionsDisabled} onChange={event => head.changeLimitSpeed(event.target.checked)} />Limit head speed</label><label className="speed-value"><input aria-label="Head speed limit in degrees per second" aria-describedby="head-speed-help" aria-invalid={head.invalidAngularSpeed || undefined} type="number" min="5" max="120" step="1" value={head.speedLimit} disabled={head.optionsDisabled || !head.limitSpeed} onChange={event => head.changeSpeedLimit(event.target.value === '' ? '' : Number(event.target.value))} /><span>deg/s</span></label><label className="speed-value position-speed"><input aria-label="Head position speed limit in millimetres per second" aria-describedby="head-speed-help" aria-invalid={head.invalidLinearSpeed || undefined} type="number" min="1" max="50" step="1" value={head.linearSpeedLimit} disabled={head.optionsDisabled || !head.limitSpeed} onChange={event => head.changeLinearSpeedLimit(event.target.value === '' ? '' : Number(event.target.value))} /><span>mm/s</span></label></div>

    <p className="speed-help" id="head-speed-help">{bridgeRequired ? 'Restart the updated bridge to enable all six head controls.' : control.session?.headTrackingMotion !== true ? 'Head movement awaits the mapping check.' : head.invalidSpeed ? 'Enter an angular speed from 5 to 120 deg/s and a position speed from 1 to 50 mm/s.' : head.limitSpeed ? 'Application speed caps; network delays can reduce speed. Changes apply to your next input.' : 'Off: direct control. Changes apply to your next input.'}</p></details>

    <details className="head-advanced"><summary>WebXR headset{xrEngaged ? ' — active' : ''}</summary><Suspense fallback={<p>Loading headset view…</p>}><WebXRControls snapshot={{ ...control.status, headAngles: head.measured }} requested={head.targets} limits={head.limits} allowed={!head.disabled} demo={control.session?.mode === 'demo'} onHeadChange={partial => { if(engagement.current.epoch !== control.getControlEpoch() || head.setPose(partial)!==true)throw Error('Head request was not accepted.'); }} onStop={() => { engagement.current.epoch=null; control.command('stop'); }} stopRevision={control.stopRevision} connectionKey={control.session?.token} videoElement={videoElement} onEngagementChange={value => { engagement.current.epoch=value ? control.getControlEpoch() : null;setXrEngaged(value);reportEngagement('xr', value); }} /></Suspense></details>
    {(bridgeRequired || control.session?.headTrackingMotion !== true || head.invalidSpeed) && <p className="speed-help">{bridgeRequired ? 'Restart the updated bridge to enable head controls.' : control.session?.headTrackingMotion !== true ? 'Head movement awaits the mapping check.' : 'Check the head speed limits before moving.'}</p>}
    {head.error && <p className="inline-error" role="alert">{head.error}</p>}

  </section>;

}
