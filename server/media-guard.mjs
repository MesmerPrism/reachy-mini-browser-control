import { AudioControlError } from './audio-control.mjs';

export function createMediaGuard(control) {
  return async action => {
    if (control.closed) throw new AudioControlError('Controller is closed');
    const { info, startedAt } = await control.readSnapshot();
    const cleanup = action === 'audio-stop' || action === 'audio-clear';
    // Cleanup may clear speech during a motion-only unknown-outcome latch, but
    // never bypass identity, daemon ownership or foreign-motion checks.
    const cleanupOnlyLatch = cleanup && control.adapter.uncertain && info.blockedReason === control.adapter.uncertain;
    if (!info.connected || (!info.ready && !cleanupOnlyLatch) || Date.now() - startedAt > 500)
      throw new AudioControlError(info.blockedReason || 'Audio requires fresh robot status');
    if (info.moves.some(move => !control.owned.has(move.uuid))) throw new AudioControlError('Another motion is running');
    if (['talk-start', 'speaker-test'].includes(action) && !info.awake) throw new AudioControlError('Wake Reachy before starting audio');
    return { ...info, ok: true };
  };
}
