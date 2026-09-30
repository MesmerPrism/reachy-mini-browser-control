export class AudioControlError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}

const VOLUME_MIN = 0;
const VOLUME_MAX = 100;
const DEFAULT_TIMEOUT_MS = 3000;

function validateAdapter(adapter) {
  if (!adapter || typeof adapter.snapshot !== 'function') throw new TypeError('AudioControl requires an adapter with snapshot()');
  const origin = adapter.origin;
  if (typeof origin !== 'string') throw new TypeError('AudioControl requires the adapter origin');
  const url = new URL(origin);
  if (url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/') throw new TypeError('AudioControl requires a plain HTTP adapter origin');
  return url.origin;
}
function volumeFrom(response) {
  if (!response || !Number.isInteger(response.volume) || response.volume < VOLUME_MIN || response.volume > VOLUME_MAX) throw new AudioControlError('Daemon returned an invalid speaker volume', 502);
  return response.volume;
}
const readableError = error => error?.message || String(error);

// Audio intentionally bypasses ReachyAdapter.request(): an audio-only failure
// must never set the motion adapter's unknown-outcome latch. The injected
// transport receives fixed route data only and exists solely for unit tests.
export class AudioControl {
  constructor({ adapter, demo = false, transport = null, guard = null, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    this.adapter = adapter; this.demo = demo === true; this.transport = transport; this.guard = guard;
    this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
    this.origin = this.demo ? null : validateAdapter(adapter);
    this.speakerVolume = 50; this.lastError = null; this.volumeRead = null; this.commandBarrier = Promise.resolve();
    this.testCount = 0; this.stopCount = 0; this.clearCount = 0;
  }
  async status() {
    if (this.demo) return { available: true, speakerVolume: this.speakerVolume };
    if (!this.volumeRead) this.volumeRead = (async () => {
      await this.#guard('status');
      const volume = await this.#getVolume(); this.speakerVolume = volume; this.lastError = null;
      return { available: true, speakerVolume: volume };
    })().catch(error => {
      const message = readableError(error); this.lastError = message;
      return { available: false, speakerVolume: this.speakerVolume, error: message };
    }).finally(() => { this.volumeRead = null; });
    return this.volumeRead;
  }
  async command(input) {
    if (!input || typeof input !== 'object') throw new AudioControlError('Invalid audio command', 400);
    const action = input.action;
    if (!['speaker-volume', 'speaker-test', 'talk-start', 'audio-stop', 'audio-clear'].includes(action)) throw new AudioControlError('Unknown audio command', 400);
    if (action === 'speaker-volume' && (!Number.isInteger(input.volume) || input.volume < VOLUME_MIN || input.volume > VOLUME_MAX)) throw new AudioControlError('Speaker volume must be an integer from 0 to 100', 400);
    // Do not abort accepted mutations: HTTP cancellation cannot retract a
    // daemon effect. The serial drain makes Stop follow every earlier accepted
    // volume/test request, then issue its ordered stop-and-clear pair.
    const run = () => this.#runCommand(action, input);
    const result = this.commandBarrier.then(run, run);
    this.commandBarrier = result.catch(() => {});
    return result;
  }
  async #runCommand(action, input) {
    await this.#guard(action);
    try {
      if (action === 'talk-start') return { ok: true };
      if (this.demo) return this.#demo(action, input);
      if (action === 'speaker-volume') {
        this.speakerVolume = volumeFrom(await this.#request('/api/volume/set', 'POST', { volume: input.volume })); this.lastError = null;
        return { ok: true, speakerVolume: this.speakerVolume };
      }
      if (action === 'speaker-test') {
        const result = await this.#request('/api/volume/test-sound', 'POST');
        if (!['ok', 'busy'].includes(result?.status)) throw new AudioControlError('Daemon returned an invalid speaker test result', 502);
        this.lastError = result.status === 'busy' ? result.message || 'Speaker is busy' : null;
        return { ok: result.status === 'ok', speakerVolume: this.speakerVolume, status: result.status, message: result.message };
      }
      if (action === 'audio-stop') { await this.#request('/api/media/stop_sound', 'POST'); this.stopCount++; }
      await this.#request('/api/media/clear_incoming_audio', 'POST'); this.clearCount++; this.lastError = null;
      return { ok: true, speakerVolume: this.speakerVolume };
    } catch (error) { this.lastError = readableError(error); throw error; }
  }
  #demo(action, input) {
    if (action === 'speaker-volume') { this.speakerVolume = input.volume; this.testCount++; }
    if (action === 'speaker-test') this.testCount++;
    if (action === 'audio-stop') this.stopCount++;
    if (action === 'audio-stop' || action === 'audio-clear') this.clearCount++;
    this.lastError = null;
    return { ok: true, speakerVolume: this.speakerVolume, ...(action === 'speaker-test' ? { status: 'ok' } : {}) };
  }
  async #getVolume() { return volumeFrom(await this.#request('/api/volume/current', 'GET')); }
  async #guard(action) {
    if (this.demo) return;
    // The integrating controller owns the authoritative, coalesced snapshot
    // and may intentionally permit cleanup during its motion-recovery lock.
    if (typeof this.guard === 'function') {
      const result = await this.guard(action);
      if (result === true || result?.ok === true) return;
      throw new AudioControlError(typeof result === 'string' ? result : result?.error || 'Audio controls require exclusive robot ownership', 409);
    }
    let snapshot;
    try { snapshot = await this.adapter.snapshot(); } catch (error) { throw new AudioControlError(`Audio controls require a fresh robot status: ${readableError(error)}`, 502); }
    if (!snapshot?.connected || !snapshot.ready) throw new AudioControlError(snapshot?.blockedReason || 'Audio controls require a ready, owned robot', 409);
    if ((action === 'speaker-test' || action === 'talk-start') && !snapshot.awake) throw new AudioControlError('Wake Reachy before starting audio', 409);
    if (!Array.isArray(snapshot.moves) || snapshot.moves.length) throw new AudioControlError('Audio controls require no running motion', 409);
  }
  async #request(path, method, body) {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (this.transport) return await this.transport({ path, method, body, signal: controller.signal });
      const response = await fetch(this.origin + path, { method, signal: controller.signal, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
      let data; try { data = await response.json(); } catch { throw new AudioControlError(`Audio daemon returned invalid JSON for ${path}`, 502); }
      if (!response.ok) throw new AudioControlError(data?.detail || data?.error || `Audio daemon returned HTTP ${response.status}`, response.status >= 500 ? 502 : response.status);
      return data;
    } catch (error) {
      if (error instanceof AudioControlError) throw error;
      if (error?.name === 'AbortError') throw new AudioControlError(`Audio request timed out for ${path}`, 504);
      throw new AudioControlError(`Audio request failed for ${path}: ${readableError(error)}`, 502);
    } finally { clearTimeout(timeout); }
  }
}