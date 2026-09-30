import { useRef, useState } from 'react';
import { Camera as CameraIcon, Maximize } from 'lucide-react';

export default function Camera({ media, token, demo, connected, mediaReady }) {
  const frame = useRef(null);
  const [resolution, setResolution] = useState(''), [error, setError] = useState('');
  const { videoRef, state, videoLive, start, stop } = media;
  return <section className="panel camera"><div className="camera-heading"><h2>Camera</h2><span className="camera-state"><i className={videoLive ? 'connected' : ''} />{videoLive ? 'Live' : state === 'connecting' ? 'Connecting' : 'Off'}</span></div>
    <div className="camera-frame" ref={frame}>
      <video ref={videoRef} autoPlay playsInline muted hidden={!videoLive} onLoadedMetadata={() => setResolution(`${videoRef.current.videoWidth} × ${videoRef.current.videoHeight}`)} />
      {!videoLive && <div className="camera-empty"><CameraIcon size={38} strokeWidth={1.3} /><strong>{demo ? 'Demo — no live camera' : state === 'connecting' ? 'Connecting camera…' : 'Camera is off'}</strong><p>{demo ? 'Controls are simulated. No robot is connected.' : 'Start the camera to see Reachy’s view.'}</p></div>}
      <div className="camera-toolbar"><button disabled={demo || !token || !connected || mediaReady === false || (state === 'off' && !media.startReady)} onClick={state === 'off' ? start : stop}>{state === 'off' ? 'Start camera' : 'Stop camera'}</button><span>{videoLive ? resolution : demo ? 'Demo' : 'Shared camera/audio'}</span><button className="fullscreen" aria-label="Fullscreen camera" onClick={() => frame.current?.requestFullscreen?.().catch(() => setError('Fullscreen is unavailable.'))}><Maximize size={20} /></button></div>
    </div>
    <div className="camera-listening">
      <label><input type="checkbox" checked={media.listening} disabled={!media.listeningReady} onChange={event => media.setListening(event.target.checked)} />Listen to Reachy’s microphone</label>
      <span aria-live="polite">{demo ? 'Unavailable in simulation' : media.listening ? media.audioAvailable ? 'Listening' : 'Waiting for microphone stream…' : media.audioAvailable ? 'Stream ready · listening off' : 'Listening off'}</span>
      <label>Volume <input aria-label="Reachy microphone listening volume" type="range" min="0" max="100" step="1" value={media.localVolume} disabled={!media.listening} onChange={event => media.setLocalVolume(Number(event.target.value))} /><output>{media.localVolume}%</output></label>
    </div>
    <p className="model-caption">Listen on this computer while watching Reachy’s camera. This does not enable your computer microphone.</p>
    {(error || media.error) && <p className="inline-error" role="alert">{error || media.error}</p>}
  </section>;
}
