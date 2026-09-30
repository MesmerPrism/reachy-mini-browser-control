// Mutation requests are never aborted: cancelling fetch does not cancel robot work.
// A generation discards unsent work and ignores late results while retaining the
// in-flight lock until the original request settles.
export function createHeadManualQueue({ send, eligible, onError = () => {}, onAcknowledged = () => {},
  now = () => performance.now(), setTimer = setTimeout, clearTimer = clearTimeout }) {
  let pending = null, flight = null, timer = null, generation = 0, lastSent = -Infinity;
  const schedule = () => {
    if (pending && !flight && timer === null) timer = setTimer(flush, Math.max(0, 100 - (now() - lastSent)));
  };
  const discard = () => { generation++; pending = null; if (timer !== null) clearTimer(timer); timer = null; };
  const flush = async () => {
    timer = null;
    if (!pending || flight) return;
    if (!eligible()) { discard(); return; }
    const body = pending, gen = generation, marker = {};
    pending = null; flight = marker; lastSent = now();
    try {
      const response = await send({ action: 'head-target', ...body });
      if (gen === generation) onAcknowledged(response, lastSent);
    } catch (error) {
      if (gen === generation) { pending = null; onError(error); }
    } finally {
      if (flight === marker) { flight = null; schedule(); }
    }
  };
  return {
    enqueue(target) {
      if (!eligible()) return false;
      pending = { ...pending, ...target }; schedule(); return true;
    },
    discard,
    get outstanding() { return !!pending || !!flight; },
  };
}
