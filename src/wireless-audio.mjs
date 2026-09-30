import { createTalkLifecycle } from './talk-lifecycle.mjs';

// SDK 1.8.0's startSession source explicitly documents sender.replaceTrack()
// through _pc for app-supplied audio. Isolate that version-bound extension here.
export function createWirelessTalk({ sdk, allowed, capture, onState, onError }) {
  let peer = null;
  return createTalkLifecycle({
    capture,
    allowed,
    onState,
    onError,
    authorize: async () => {
      if (!allowed() || !sdk.micSupported || !sdk._pc) throw Error('Reachy audio sender is unavailable.');
      peer = sdk._pc;
    },
    attach: async track => {
      const current = sdk._pc;
      if (!current || (track && (peer !== current || !allowed()))) {
        if (track) throw Error('Audio session changed; press again after reconnecting.');
        return;
      }
      const sender = current.getSenders().find(item => item.track?.kind === 'audio') || current.getTransceivers().find(item => item.receiver?.track?.kind === 'audio')?.sender;
      if (!sender?.replaceTrack) { if (track) throw Error('This session has no audio sender.'); return; }
      await sender.replaceTrack(track);
      if (track && (current !== sdk._pc || !allowed())) { track.enabled = false; await sender.replaceTrack(null); }
    },
    clear: () => { if (sdk.state === 'streaming') sdk.clearIncomingAudio(); },
  });
}
