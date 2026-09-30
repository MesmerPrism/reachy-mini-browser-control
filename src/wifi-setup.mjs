// Original MIT browser adapter for the audited stock 1.2.11 Wi-Fi API.
// Requests occur only through these explicit UI methods. There is no polling.
import { robotBrowserLinks, parseDaemonStatus } from './setup-guidance.mjs';

const encoder = new TextEncoder();
const messages = {
  host: 'Enter one private robot address or local hostname.',
  disposed: 'This Wi-Fi setup session has ended.',
  busy: 'Wait for the current Wi-Fi check to finish.',
  pending: 'Check the requested network before submitting another connection.',
  unsupported: 'Use the robot Settings page for this daemon version.',
  guard: 'Keep the daemon OFF and wait for Wi-Fi to finish its current operation.',
  input: 'Use a network name of 1–32 UTF-8 bytes and a password of 8–63 UTF-8 bytes.',
  transport: 'The robot could not be reached. Check the network and browser local-network permission.',
  protocol: 'The robot returned an unsupported response.',
  rejected: 'The robot rejected the Wi-Fi request.',
};
export class WifiSetupError extends Error {
  constructor(code) { super(messages[code]); this.name = 'WifiSetupError'; this.code = code; }
}
const fail = code => new WifiSetupError(code);
const ssidValid = s => typeof s === 'string' && encoder.encode(s).length >= 1 && encoder.encode(s).length <= 32 && !/[\u0000-\u001f\u007f]/u.test(s) && !/[\ud800-\udfff]/u.test(s.replace(/[\ud800-\udbff][\udc00-\udfff]/g, ''));
function networks(value) {
  if (!Array.isArray(value) || value.length > 128 || !value.every(s => s === '' || ssidValid(s))) throw fail('protocol');
  return [...new Set(value.filter(Boolean))];
}
function wifiStatus(value) {
  if (!value || Array.isArray(value) || !['hotspot', 'wlan', 'disconnected', 'busy'].includes(value.mode)
    || !(value.connected_network === null || ssidValid(value.connected_network))) throw fail('protocol');
  networks(value.known_networks);
  return { mode: value.mode, connected: value.connected_network, error: false };
}
export function createWifiSetupClient(options = {}) { return new WifiSetupClient(options); }
class WifiSetupClient {
  constructor({ host, fetchImpl = (...args) => globalThis.fetch(...args), setTimer = (...args) => globalThis.setTimeout(...args), clearTimer = (...args) => globalThis.clearTimeout(...args), pendingNetwork = null, onChange = () => {} } = {}) {
    const local = typeof host === 'string' && ['localhost', '127.0.0.1'].includes(host.trim().toLowerCase());
    this.links = local ? { dashboard: `http://${host.trim().toLowerCase()}:8000/`, settings: `http://${host.trim().toLowerCase()}:8000/settings`, status: `http://${host.trim().toLowerCase()}:8000/api/daemon/status` } : robotBrowserLinks(host);
    if (!this.links || typeof fetchImpl !== 'function') throw fail('host');
    if (pendingNetwork === '') pendingNetwork = null;
    if (pendingNetwork !== null && !ssidValid(pendingNetwork)) throw fail('input');
    this.base = new URL(this.links.dashboard).origin;
    // Native browser methods need their Window receiver; injected functions
    // receive no accidental adapter receiver.
    this.fetchImpl = (...args) => fetchImpl(...args); this.setTimer = (...args) => setTimer(...args); this.clearTimer = (...args) => clearTimer(...args); this.onChange = onChange;
    this.pendingNetwork = pendingNetwork; this.phase = pendingNetwork ? 'unknown' : 'idle';
    this.daemon = null; this.wifi = null; this.supported = false; this.active = false; this.disposed = false; this.controllers = new Set(); this.failureCode = null;
  }
  snapshot() {
    return { daemon: this.daemon ? { ...this.daemon } : null, wifi: this.wifi ? { ...this.wifi } : null,
      supported: this.supported, ready: !this.disposed && this.supported && !this.pendingNetwork && !this.active && this.safe(),
      phase: this.phase, pendingNetwork: this.pendingNetwork, failureCode: this.failureCode, links: { ...this.links } };
  }
  emit() { try { this.onChange(this.snapshot()); } catch { /* Feedback cannot change a request. */ } }
  safe() { return this.daemon && !this.daemon.hasError && ['stopped', 'not_initialized'].includes(this.daemon.state) && this.wifi && this.wifi.mode !== 'busy'; }
  alive() { if (this.disposed) throw fail('disposed'); }
  async operation(action) {
    this.alive(); if (this.active) throw fail('busy');
    this.active = true; this.failureCode = null; this.emit();
    try { return await action(); }
    catch (error) { const safe = error instanceof WifiSetupError ? error : fail('transport'); if (!this.disposed) this.failureCode = safe.code; throw safe; }
    finally { this.active = false; this.emit(); }
  }
  async request(path, method = 'GET', { rejectionKnown = false } = {}) {
    this.alive();
    const controller = new AbortController(); this.controllers.add(controller);
    let timer, reader;
    const cancelReader = () => { try { Promise.resolve(reader?.cancel()).catch(() => {}); } catch { /* Reader already released. */ } };
    const interrupted = new Promise((_, reject) => {
      controller.signal.addEventListener('abort', () => { cancelReader(); reject(fail(this.disposed ? 'disposed' : 'transport')); }, { once: true });
      timer = this.setTimer(() => controller.abort(), 5000);
    });
    const work = async () => {
      const response = await this.fetchImpl(`${this.base}${path}`, { method, signal: controller.signal, mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } });
      if (controller.signal.aborted || this.disposed) { try { Promise.resolve(response.body?.cancel()).catch(() => {}); } catch { /* Late response already closed. */ } }
      this.alive(); if (controller.signal.aborted) throw fail('transport');
      if (response.redirected || response.type === 'opaqueredirect') throw fail('protocol');
      if (!response.ok) {
        // Audited guards reject before spawning the connection worker.
        if (rejectionKnown && [409, 422].includes(response.status)) { const error = fail('rejected'); error.definiteRejection = true; throw error; }
        throw fail('transport');
      }
      if (!response.body?.getReader) throw fail('protocol');
      reader = response.body.getReader(); let length = 0; const chunks = [];
      try {
        while (true) {
          const chunk = await Promise.race([reader.read(), interrupted]); this.alive(); if (controller.signal.aborted) throw fail('transport');
          if (chunk.done) break;
          length += chunk.value.byteLength; if (length > 16384) throw fail('protocol'); chunks.push(chunk.value);
        }
      } finally { cancelReader(); }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw fail('protocol'); }
    };
    try { return await Promise.race([work(), interrupted]); }
    catch (error) { throw error instanceof WifiSetupError ? error : fail('transport'); }
    finally { this.clearTimer(timer); this.controllers.delete(controller); }
  }
  async inspect() {
    // Earlier observations expire before contacting the robot again. Publish
    // supported facts only after the complete fresh check succeeds.
    this.daemon = null; this.wifi = null; this.supported = false;
    if (!this.pendingNetwork) this.phase = 'checking';
    this.emit();
    const daemon = parseDaemonStatus(JSON.stringify(await this.request('/api/daemon/status')));
    this.alive();
    if (!daemon.wireless || daemon.version !== '1.2.11') { this.daemon = daemon; if (!this.pendingNetwork) this.phase = 'unsupported'; return null; }
    const status = wifiStatus(await this.request('/wifi/status')); this.alive();
    this.daemon = daemon; this.wifi = status; this.supported = true;
    if (this.pendingNetwork && status.mode === 'wlan' && status.connected === this.pendingNetwork) { this.pendingNetwork = null; this.phase = 'joined'; }
    else if (!this.pendingNetwork) this.phase = 'ready';
    return { ...status };
  }
  probe() { return this.operation(async () => { await this.inspect(); return this.snapshot(); }); }
  readStatus() { return this.operation(async () => { const status = await this.inspect(); if (!status) throw fail('unsupported'); return status; }); }
  scan() { return this.operation(async () => {
    if (this.pendingNetwork) throw fail('pending');
    await this.inspect(); this.alive(); if (!this.supported) throw fail('unsupported'); if (!this.safe()) throw fail('guard');
    return networks(await this.request('/wifi/scan_and_list', 'POST'));
  }); }
  connect({ ssid, password } = {}) { return this.operation(async () => {
    if (this.pendingNetwork) throw fail('pending');
    if (!ssidValid(ssid) || typeof password !== 'string' || encoder.encode(password).length < 8 || encoder.encode(password).length > 63 || /[\u0000-\u001f\u007f\ud800-\udfff]/u.test(password.replace(/[\ud800-\udbff][\udc00-\udfff]/g, ''))) throw fail('input');
    await this.inspect(); this.alive(); if (!this.supported) throw fail('unsupported'); if (!this.safe()) throw fail('guard');
    // Stock 1.2.11 takes credentials in this query; the UI must explain this.
    const path = `/wifi/connect?ssid=${encodeURIComponent(ssid)}&password=${encodeURIComponent(password)}`;
    password = null;
    this.pendingNetwork = ssid; this.phase = 'unknown'; this.emit(); this.alive();
    try {
      const result = await this.request(path, 'POST', { rejectionKnown: true }); this.alive();
      if (result !== null) throw fail('protocol');
      this.phase = 'queued'; return { accepted: true, confirmed: false, outcome: 'queued' };
    } catch (error) {
      if (!this.disposed && error.definiteRejection) { this.pendingNetwork = null; this.phase = 'failed'; throw error; }
      if (!this.disposed) this.phase = 'unknown';
      return { accepted: false, confirmed: false, outcome: 'unknown' };
    }
  }); }
  dispose() { this.disposed = true; this.phase = this.pendingNetwork ? 'unknown' : 'disposed'; for (const controller of this.controllers) controller.abort(); this.emit(); }
}
