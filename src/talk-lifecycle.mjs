// No browser storage or recording. Generation checks cover permission, sender
// replacement and release races; disabling an existing track is synchronous.
export function createTalkLifecycle({ capture, attach, clear, authorize = async () => {}, allowed, onState = () => {}, onError = () => {} }) {
  let stream = null, track = null, captureFlight = null, held = false, generation = 0, captureGeneration = 0;
  let replacements = Promise.resolve();
  const replace = next => {
    const result = replacements.then(() => attach(next));
    replacements = result.catch(() => {}); return result;
  };
  const release = ({ keepalive = false, notify = true } = {}) => {
    const hadCapture = held || !!track || !!captureFlight;
    held = false; generation++; captureGeneration++;
    if (track) track.enabled = false;
    captureFlight = null;
    if (notify) onState(track ? 'ready' : 'off', false);
    void replace(null).catch(() => {});
    if (hadCapture) void Promise.resolve(clear(keepalive)).catch(error => { if (notify) onError(error); });
  };
  const enable = async () => {
    if (track?.readyState !== 'ended' && track) return track;
    if (captureFlight) return captureFlight;
    const gen = ++captureGeneration;
    onState('enabling', false);
    let timer;
    const requested = Promise.resolve().then(capture).then(captured => {
      captured.getAudioTracks().forEach(t => { t.enabled = false; });
      if (gen !== captureGeneration) { captured.getTracks().forEach(t => t.stop()); return null; }
      const next = captured.getAudioTracks()[0];
      if (!next) { captured.getTracks().forEach(t => t.stop()); throw new Error('Microphone returned no audio track.'); }
      stream = captured; track = next;
      next.onended = () => { if (track === next) { disable(); onError(new Error('Microphone capture ended.')); } };
      onState('ready', false); return track;
    });
    const flight = Promise.race([requested, new Promise((_, reject) => {
      timer = setTimeout(() => { reject(new Error('Microphone permission timed out.')); }, 20000);
    })]).catch(error => { if (gen === captureGeneration) { captureGeneration++; onState('off', false); onError(error); } return null; })
      .finally(() => { clearTimeout(timer); if (captureFlight === flight) captureFlight = null; });
    captureFlight = flight; return flight;
  };
  const press = async () => {
    if (held || !allowed()) return;
    held = true; const gen = ++generation;
    try {
      await authorize();
      if (!held || gen !== generation || !allowed()) return;
      const microphone = await enable();
      if (!microphone || !held || gen !== generation || !allowed()) return;
      await replace(microphone);
      if (held && gen === generation && allowed() && microphone === track && microphone.readyState !== 'ended') {
        microphone.enabled = true; onState('ready', true);
      } else { microphone.enabled = false; }
    } catch (error) { if (gen === generation) { release(); onError(error); } }
  };
  const disable = (options = {}) => {
    release(options); stream?.getTracks().forEach(t => t.stop()); stream = null; track = null;
    if (options.notify !== false) onState('off', false);
  };
  return { enable, press, release, disable, get held() { return held; } };
}
