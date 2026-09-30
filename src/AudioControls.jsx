import { useEffect, useRef, useState } from 'react';

export default function AudioControls({ control, media }) {
  const [speakerVolume, setSpeakerVolume] = useState(null), [volume, setVolume] = useState(50);
  const [available, setAvailable] = useState(false), [error, setError] = useState(''), [statusError, setStatusError] = useState(''), [pending, setPending] = useState(false);
  const restore = useRef(50), active = useRef(true), volumeEdited = useRef(false), flight = useRef(false), latest = useRef(control);
  latest.current = control;
  const enabled = control.session?.audioModes === true;
  const settingsReady = enabled && control.status.connected && control.status.ready;
  const robotReady = settingsReady && control.status.awake;
  const request = async (action, extra = {}) => {
    if (flight.current || !latest.current.session?.token) return;
    flight.current = true; setPending(true); setError('');
    try {
      const response = await fetch('/api/audio/command', { method: 'POST', headers: {
        'Content-Type': 'application/json', 'X-Control-Token': latest.current.session.token,
      }, body: JSON.stringify({ action, ...extra }) });
      const result = await response.json();
      if (!response.ok || result.ok === false) throw new Error(result.error || 'Audio command failed.');
      if (active.current && Number.isFinite(result.speakerVolume)) { setSpeakerVolume(result.speakerVolume); setVolume(result.speakerVolume); volumeEdited.current = false; }
    } catch (e) { if (active.current) setError(e.message); }
    finally { flight.current = false; if (active.current) setPending(false); }
  };
  useEffect(() => {
    active.current = true;
    if (!enabled) return () => { active.current = false; };
    let timer, disposed = false;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const response = await fetch('/api/audio/status', { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Audio status unavailable.');
        if (!disposed) {
          setAvailable(result.available === true);
          if (Number.isFinite(result.speakerVolume)) {
            setSpeakerVolume(result.speakerVolume);
            if (result.speakerVolume > 0) restore.current = result.speakerVolume;
            if (!volumeEdited.current && !flight.current) setVolume(result.speakerVolume);
          }
          setStatusError(result.error || '');
        }
      } catch (e) { if (!disposed) { setAvailable(false); setStatusError(e.message); } }
      if (!disposed) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { disposed = true; active.current = false; controller.abort(); clearTimeout(timer); };
  }, [enabled]);
  // Stop bypasses an outstanding volume/test mutation; aborting those HTTP
  // requests would not stop daemon work and must never delay local mic silence.
  const stopAudio = () => { void media.stopAudio(); };
  const disabled = !settingsReady || !available || pending;
  return <section className="panel audio-controls">
    <h2>Audio</h2><p className="panel-caption">Reachy microphone listening, computer push-to-talk and robot speaker.</p>
    <audio ref={media.audioRef} playsInline muted={!media.listening} />
    <div className="audio-microphone">
      <button disabled={!robotReady || control.session?.mode === 'demo'} onClick={media.microphoneState === 'off' ? media.enableMicrophone : media.disableMicrophone}>{media.microphoneState === 'off' ? 'Enable computer microphone' : media.microphoneState === 'enabling' ? 'Cancel computer microphone' : 'Disable computer microphone'}</button>
      <button className="push-to-talk" aria-pressed={media.talking} disabled={!robotReady || control.session?.mode === 'demo' || control.status.mediaReady === false}
        onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); void media.startTalk(); }}
        onPointerUp={() => media.stopTalk()} onPointerCancel={() => media.stopTalk()} onLostPointerCapture={() => media.stopTalk()} onBlur={() => media.stopTalk()}
        onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); void media.startTalk(); } }}
        onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); media.stopTalk(); } }}>
        {media.talking ? 'Talking — release to stop' : 'Hold to talk'}
      </button><span aria-live="polite">{media.microphoneState === 'enabling' ? 'Waiting for computer microphone permission…' : media.talking ? 'Computer microphone transmitting' : media.microphoneState === 'ready' ? 'Computer microphone ready, not transmitting' : 'Computer microphone off'}</span>
    </div>
    <p className="speed-help">Hold the button or Space/Enter to send your live microphone to Reachy. Release stops transmission and clears queued speech. No recording or file upload is used.</p>
    <div className="audio-listening"><label><input type="checkbox" checked={media.listening} disabled={!media.listeningReady} onChange={event => media.setListening(event.target.checked)} />Listen to Reachy’s microphone on this computer</label><label>Computer volume <input aria-label="Computer listening volume" type="range" min="0" max="100" step="1" value={media.localVolume} disabled={!media.listening} onChange={event => media.setLocalVolume(Number(event.target.value))} /><output>{media.localVolume}%</output></label></div>
    <div className="audio-speaker"><label>Robot speaker <input aria-label="Robot speaker volume" type="range" min="0" max="100" step="1" value={volume} disabled={disabled} onChange={event => { volumeEdited.current = true; setVolume(Number(event.target.value)); }} /><output>{volume}% target · {Number.isFinite(speakerVolume) ? `${speakerVolume}% measured` : 'measured unavailable'}</output></label>
      <div className="audio-actions"><button disabled={disabled} onClick={() => { if (volume > 0) restore.current = volume; void request('speaker-volume', { volume }); }}>Apply speaker volume</button><button disabled={disabled} onClick={() => { if (speakerVolume > 0) restore.current = speakerVolume; void request('speaker-volume', { volume: speakerVolume === 0 ? restore.current : 0 }); }}>{speakerVolume === 0 ? 'Restore speaker' : 'Mute speaker'}</button><button disabled={disabled || !robotReady} onClick={() => void request('speaker-test')}>Test speaker</button><button disabled={!enabled} onClick={stopAudio}>Stop audio</button></div>
    </div>
    <p className="speed-help">Applying or restoring speaker volume plays the daemon’s test tone. Stop audio clears speech and stops recorded sound. Camera and audio share one connection; stopping the camera also stops microphone and listening.</p>
    {!enabled && <p className="speed-help">Restart the updated bridge to enable audio controls.</p>}
    {(error || statusError || media.error) && <p className="inline-error" role="alert">{error || statusError || media.error}</p>}
  </section>;
}
