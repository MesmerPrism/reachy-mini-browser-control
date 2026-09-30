import { useEffect, useRef, useState } from 'react';
import { startReachyMedia } from './media.js';
import { createTalkLifecycle } from './talk-lifecycle.mjs';

export function useReachyMedia({ session, status }) {
  const videoRef = useRef(null), audioRef = useRef(null), transport = useRef(null), talk = useRef(null);
  const latest = useRef({ session, status }); latest.current = { session, status };
  const alive = useRef(true);
  const [state, setState] = useState('off'), [error, setError] = useState('');
  const [videoLive, setVideoLive] = useState(false), [audioAvailable, setAudioAvailable] = useState(false);
  const [listening, setListeningState] = useState(false), [localVolume, setLocalVolumeState] = useState(50);
  const listeningRef = useRef(false), volumeRef = useRef(50);
  const [microphoneState, setMicrophoneState] = useState('off'), [talking, setTalking] = useState(false);
  const audioCommand = async (action, keepalive = false) => {
    const token = latest.current.session?.token;
    if (!token) return;
    const response = await fetch('/api/audio/command', { method: 'POST', keepalive,
      headers: { 'Content-Type': 'application/json', 'X-Control-Token': token }, body: JSON.stringify({ action }) });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.error || 'Audio command failed.');
    return result;
  };
  const canUse = () => {
    const c = latest.current;
    return c.session?.mode !== 'demo' && !!c.session?.token && c.status.connected && c.status.ready && c.status.awake && c.status.mediaReady !== false && !document.hidden;
  };
  const canTalk = () => canUse() && latest.current.session?.audioModes === true;
  const syncListening = () => {
    const element = audioRef.current;
    if (!element) return;
    element.volume = volumeRef.current / 100; element.muted = !listeningRef.current;
    if (listeningRef.current && element.srcObject) void element.play().catch(() => { if (alive.current) { setError('Computer audio playback was blocked. Switch listening off and on to retry.'); setListening(false); } });
    else if (!listeningRef.current) element.pause();
  };
  const setListening = value => { const enabled = !!value && canTalk(); listeningRef.current = enabled; setListeningState(enabled); if (enabled) start(); syncListening(); };
  const setLocalVolume = value => { if (Number.isFinite(value)) { volumeRef.current = Math.max(0, Math.min(100, value)); setLocalVolumeState(volumeRef.current); syncListening(); } };
  const start = () => {
    if (transport.current || !canUse()) return transport.current;
    setError('');
    const current = startReachyMedia({ token: latest.current.session.token, video: videoRef.current, audio: audioRef.current, enableAudio: latest.current.session.audioModes === true,
      onState: next => { if (alive.current) setState(next); if (next === 'off') {
        transport.current = null; talk.current?.disable({ notify: alive.current });
        listeningRef.current = false; if (alive.current) setListeningState(false);
      } },
      onError: message => { if (alive.current) setError(message); },
      onVideoLive: value => { if (alive.current) setVideoLive(value); },
      onAudioAvailable: value => { if (alive.current) setAudioAvailable(value); if (value) syncListening(); },
    });
    transport.current = current; return current;
  };
  if (!talk.current) talk.current = createTalkLifecycle({
    capture: () => {
      if (!canTalk() || !navigator.mediaDevices?.getUserMedia) throw new Error('Microphone capture is unavailable.');
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    },
    attach: async track => {
      if (!track) { const current = transport.current; if (current) await current.setMicrophoneTrack(null); return; }
      const current = start(); if (!current) throw new Error('Robot media is unavailable.');
      await current.setMicrophoneTrack(track);
    },
    clear: keepalive => audioCommand('audio-clear', keepalive), authorize: () => audioCommand('talk-start'), allowed: canTalk,
    onState: (next, active) => { if (alive.current) { setMicrophoneState(next); setTalking(active); } },
    onError: problem => { if (alive.current) setError(problem.message || 'Microphone failed.'); },
  });
  const stopTalk = options => talk.current.release(options);
  const disableMicrophone = () => talk.current.disable();
  const stop = () => {
    talk.current.disable(); setListening(false);
    const current = transport.current; transport.current = null; current?.close();
  };
  const stopAudio = async () => { stopTalk(); setListening(false); try { await audioCommand('audio-stop'); } catch (e) { if (alive.current) setError(e.message); } };
  useEffect(() => {
    if (!status.connected || !status.ready || !status.awake) stop();
  }, [status.connected, status.ready, status.awake]);
  useEffect(() => {
    alive.current = true;
    const hide = () => { if (document.hidden) stop(); };
    const exit = () => { talk.current.disable({ keepalive: true, notify: alive.current }); const current = transport.current; transport.current = null; current?.close(); };
    const blur = () => stopTalk();
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', exit); window.addEventListener('blur', blur);
    return () => { alive.current = false; exit(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', exit); window.removeEventListener('blur', blur); };
  }, []);
  return { videoRef, audioRef, state, error, videoLive, audioAvailable, listening, localVolume, microphoneState, talking,
    startReady: canUse(), listeningReady: canTalk(),
    start, stop, stopTalk, stopAudio, enableMicrophone: () => talk.current.enable(), disableMicrophone,
    startTalk: () => talk.current.press(), setListening, setLocalVolume };
}
