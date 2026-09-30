// Transport contains only derived angles; webcam images stay in the browser.
export function createHeadFollow({ send, onChange = () => {}, onError = () => {}, now = () => performance.now(), getLimits = () => ({ yaw: 20, pitch: 15 }) }) {
  let generation = 0, session = null, sequence = 0, pending = null, flight = null, timer = null, active = false, startedAt = Infinity;
  const clear = () => { active = false; session = null; pending = null; clearTimeout(timer); timer = null; };
  const stop = async ({ notify = true } = {}) => {
    generation++; const hadWork = active || !!flight; clear(); onChange('idle');
    if (notify && hadWork) {
      try { await send({ action: 'head-stop' }); }
      catch (error) { onError(error.message); }
    }
  };
  const flush = async () => {
    timer = null;
    if (!active || !session || !pending || flight) return;
    const sample = pending; pending = null;
    const ageMs = sample.ageMs + now() - sample.receivedAt;
    if (ageMs > 250) { await stop(); return; }
    const gen = generation;
    const request = Promise.resolve().then(() => {
      if (!active || gen !== generation) return;
      const dispatchAge = sample.ageMs + now() - sample.receivedAt;
      if (dispatchAge > 250) return stop();
      const limits = getLimits();
      if (!Number.isFinite(limits?.yaw) || !Number.isFinite(limits?.pitch) || limits.yaw <= 0 || limits.yaw > 20 || limits.pitch <= 0 || limits.pitch > 15) throw Error('Head-follow limits are unavailable.');
      return send({ action: 'head-frame', headSession: session, sequence: ++sequence, ageMs: dispatchAge,
        yaw: Math.max(-limits.yaw, Math.min(limits.yaw, sample.yaw)), pitch: Math.max(-limits.pitch, Math.min(limits.pitch, sample.pitch)) });
    });
    flight = request;
    try { await request; }
    catch (error) { if (gen === generation) { onError(error.message); await stop(); } }
    finally {
      if (flight === request) flight = null;
      if (active && gen === generation && pending) timer = setTimeout(flush, 65);
    }
  };
  const start = async () => {
    if (active || flight) return;
    const gen = ++generation; active = true; onChange('starting');
    const request = Promise.resolve().then(() => send({ action: 'head-start' })); flight = request;
    try {
      const result = await request;
      if (gen !== generation) { await send({ action: 'head-stop' }); return; }
      if (!result?.headSession) throw Error('Head-follow session was not confirmed.');
      session = result.headSession; sequence = 0; startedAt = now(); onChange('following');
    } catch (error) { if (gen === generation) { clear(); onChange('idle'); onError(error.message); } }
    finally { if (flight === request) flight = null; if (active && session && pending) void flush(); }
  };
  const push = pose => {
    if (!active) return;
    if (!pose.tracked || !pose.calibrated || !Number.isFinite(pose.yaw) || !Number.isFinite(pose.pitch) || !Number.isFinite(pose.ageMs) || pose.ageMs < 0 || pose.ageMs > 250) { void stop(); return; }
    pending = { ...pose, receivedAt: now() };
    if (session && !flight && !timer) timer = setTimeout(flush, 0);
  };
  const observeStatus = (state, readStartedAt) => {
    // Ignore status reads begun before the start acknowledgement.
    if (active && session && readStartedAt >= startedAt &&
      (!state.headTrackingActive || state.headTrackingSession !== session)) void stop({ notify: false });
  };
  return { start, push, stop, observeStatus, get active() { return active; } };
}
