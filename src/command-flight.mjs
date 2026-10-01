// Stop can interrupt unsent motion while all outstanding asynchronous mutations
// remain accounted for. Reconnection invalidates every old lease.
export function createCommandFlight() {
  let generation = 0;
  const active = new Set();
  return {
    get busy() { return active.size > 0; },
    clear() { generation++; active.clear(); },
    begin(priority = false) {
      if (active.size && !priority) throw Error('Another command is in progress.');
      const token = Symbol(), context = generation;
      active.add(token);
      return { current: () => context === generation && active.has(token),
        release: () => { if (context === generation) active.delete(token); } };
    },
  };
}
