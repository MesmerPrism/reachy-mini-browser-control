import { Octagon, Power } from 'lucide-react';
import { useControl } from './useControl.js';
import Camera from './Camera.jsx';
import Antennas from './Antennas.jsx';
import Emotes from './Emotes.jsx';
import HeadTracking from './HeadTracking.jsx';
import HeadControls from './HeadControls.jsx';
import AudioControls from './AudioControls.jsx';
import { useReachyMedia } from './useReachyMedia.js';
import { Component, lazy, Suspense, useState } from 'react';

const RobotModel = lazy(() => import('./RobotModel.jsx'));
class ModelBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <section className="panel robot-model"><h2>Reachy in 3D</h2><p role="alert">The 3D view could not load. Reload to retry.</p></section> : this.props.children; }
}

export default function App() {
  const control = useControl();
  const { session, status, command, disabled } = control;
  const media = useReachyMedia({ session, status });
  const [manualHeadEngaged, setManualHeadEngaged] = useState(false);
  const otherControlBusy = !!status.headTrackingActive || !!status.headManualActive || manualHeadEngaged;
  const stopMotion = () => { media.stopTalk(); command('stop'); };
  const power = () => { if (status.awake) media.disableMicrophone(); command(status.awake ? 'sleep' : 'wake'); };
  return <main className="desktop-control">
    <header className="header">
      <div className="brand"><h1>Reachy Mini</h1><p>Desktop control</p></div>
      <div className="header-actions">
        {session?.mode === 'demo' && <strong className="demo-label">Demo — no robot</strong>}
        <span className="connection"><i className={status.connected ? 'connected' : ''} />{status.recoveryNeeded?.automatic ? 'Recovering' : status.connected ? 'Connected' : 'Disconnected'}</span>
        <button disabled={disabled || otherControlBusy} onClick={power}><Power size={17} />{status.awake ? 'Sleep' : 'Wake'}</button>
        <button className="stop-button" disabled={!session || !status.connected} onClick={stopMotion}><Octagon size={17} />Stop motion</button>
      </div>
    </header>
    {control.error && <p className="error-banner" role="alert">{control.error}</p>}
    <div className="control-grid">
      <Camera media={media} token={session?.token} demo={session?.mode === 'demo'} connected={status.connected} mediaReady={status.mediaReady} />
      <ModelBoundary><Suspense fallback={<section className="panel robot-model"><h2>Reachy in 3D</h2><p>Loading model…</p></section>}><RobotModel control={control} schematic={import.meta.env.VITE_REACHY_MODEL !== 'private-cad'} /></Suspense></ModelBoundary>
    </div>
    <Antennas targets={control.targets} measured={status.antennas} disabled={disabled || otherControlBusy || !status.awake || session?.antennaModes !== true || control.invalidSpeed} optionsDisabled={disabled || otherControlBusy || session?.antennaModes !== true} bridgeUpdateRequired={!!session && session.antennaModes !== true} setAngle={control.setAngle} centre={control.centre} limitSpeed={control.limitSpeed} speedLimit={control.speedLimit} changeLimitSpeed={control.changeLimitSpeed} changeSpeedLimit={control.changeSpeedLimit} invalidSpeed={control.invalidSpeed} />
    <AudioControls control={control} media={media} />
    <HeadControls control={control} videoElement={media.videoRef.current} onEngagementChange={value => { if (value) control.cancelAntennaQueue(); setManualHeadEngaged(value); }} />
    <HeadTracking control={{ ...control, disabled: disabled || !!status.headManualActive || manualHeadEngaged }} />
    <Emotes emotes={control.emotes} error={control.catalogError} disabled={disabled || otherControlBusy || !status.awake} onPlay={id => command('emote', { id })} />
    <footer className="activity">
      <span aria-live="polite">{status.blockedReason || (status.activity ? status.message : !status.awake ? 'Asleep — press Wake to use the controls and expose the camera.' : status.message || 'Ready')}</span>
      <div className="activity-actions" aria-label="Motion controls">
        <button disabled={disabled || otherControlBusy} title={otherControlBusy ? 'Stop head movement before sleeping' : undefined} onClick={power}><Power size={17} />{status.awake ? 'Sleep' : 'Wake'}</button>
        <button className="stop-button" disabled={!session || !status.connected} onClick={stopMotion}><Octagon size={17} />Stop motion</button>
      </div>
    </footer>
  </main>;
}
