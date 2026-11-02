import { robotBrowserLinks } from './setup-guidance.mjs';

export function localSignalingUrl(host) {
  const links = robotBrowserLinks(host);
  if (!links) throw Error('Enter a private local IP or .local hostname without a scheme, port or path.');
  return `ws://${new URL(links.dashboard).hostname}:8443`;
}

const issues = Object.freeze({
  'ice-interrupted': 'Local WebRTC connectivity was interrupted. Controls are paused while this session checks for recovery.',
  'ice-timeout': 'Local WebRTC connectivity did not recover within the short recovery window. Connect again explicitly.',
  'ice-failed': 'Local WebRTC ICE connectivity failed. Check the robot address and network, then connect again explicitly.',
  'webrtc-error': 'Local WebRTC negotiation failed. Connect again explicitly.',
  'robot-error': 'Reachy reported a command error. Control is locked; telemetry remains available. Do not repeat an uncertain command.',
  'socket-closed': 'The local signaling WebSocket closed. Connect again explicitly.',
  'socket-error': 'The local signaling WebSocket failed. Check same-network access and browser permission.',
  'signaling-error': 'Reachy rejected or could not process the local signaling request.',
  'protocol-error': 'The local signaling service returned an invalid message.',
  'session-timeout': 'Local WebRTC session setup timed out. Connect again explicitly.',
  'welcome-timeout': 'Reachy did not finish opening its local signaling connection in time.',
  'local-closed': 'The local control session was closed.',
});

// Audited against SDK 1.8.0 and daemon 1.10/1.11's GStreamer signaller.
// Only rendezvous changes: WebRTC, decoding, commands and telemetry admission
// continue through the pinned SDK and WirelessControl. No HTTP, HF or retries.
export function createLocalWirelessSDK(ReachyMini, { host, WebSocketImpl = globalThis.WebSocket, timeoutMs = 15000, iceRecoveryMs = 3000 } = {}) {
  const url = localSignalingUrl(host);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw Error('Local connection deadline must be at most 30000 ms.');
  if (!Number.isFinite(iceRecoveryMs) || iceRecoveryMs < 1 || iceRecoveryMs > 5000) throw Error('ICE recovery window must be from 1 to 5000 ms.');
  return class LocalWirelessSDK extends ReachyMini {
    localSocket = null;
    localReject = null;
    transportReady = true;
    connectionIssue = null;
    #iceTimer = null;
    #icePeer = null;
    #iceListener = null;
    constructor(options) {
      super(options);
      // SDK 1.8 emits a generic error for both transient ICE loss and terminal
      // faults. Keep same-peer recovery separate from a fresh connection.
      this.addEventListener('error', event => {
        if (!this.localSocket) return;
        const { source, error } = event.detail || {};
        if (source === 'robot') { this.#clearIce(); this.#transport(false, 'robot-error', error); return; }
        if (source === 'webrtc' && error?.message === 'ICE disconnected' && this._pc?.iceConnectionState === 'disconnected') {
          if (this.connectionIssue?.code !== 'robot-error') this.#waitForIce();
          return;
        }
        this.#fail(source === 'webrtc' ? this._pc?.iceConnectionState === 'failed' ? 'ice-failed' : 'webrtc-error' : 'signaling-error');
      });
    }
    #transport(ready, code = null, detail = null) {
      this.transportReady = ready;
      // Only a bounded daemon command error is shown in this private tab;
      // signaling/SDP payloads are not reflected or added to copied summaries.
      const suffix = code === 'robot-error' && typeof detail === 'string' ? ` ${detail.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 240)}` : '';
      this.connectionIssue = code ? { code, message: issues[code] + suffix } : null;
      this._emit('transportState', { ready });
    }
    #clearIce() {
      clearTimeout(this.#iceTimer); this.#iceTimer = null;
      this.#icePeer?.removeEventListener?.('iceconnectionstatechange', this.#iceListener);
      this.#icePeer = this.#iceListener = null;
    }
    #waitForIce() {
      if (this.#iceTimer) return; // repeated events cannot restart the budget
      const peer = this._pc;
      this.#transport(false, 'ice-interrupted');
      this.#icePeer = peer;
      this.#iceListener = () => {
        if (this._pc !== peer) return;
        if (['connected', 'completed'].includes(peer.iceConnectionState)) {
          this.#clearIce(); this.#transport(true); this.requestState();
        } else if (['failed', 'closed'].includes(peer.iceConnectionState)) this.#fail('ice-failed');
      };
      peer.addEventListener?.('iceconnectionstatechange', this.#iceListener);
      this.#iceTimer = setTimeout(() => { if (this._pc === peer) this.#fail('ice-timeout'); }, iceRecoveryMs);
    }
    #fail(code) { this.#clearIce(); this.#transport(false, code); this.disconnect(); }
    async authenticate() { return true; }
    async connect(token) {
      if (token) throw Error('Local connection does not accept account tokens or credentials.');
      if (this.state !== 'disconnected' || this.localSocket) throw Error('Already connected');
      if (typeof WebSocketImpl !== 'function') throw Error('This browser does not support local WebSockets.');
      this.connectionIssue = null; this.transportReady = true;
      return new Promise((resolve, reject) => {
        let welcomed = false;
        const failure = () => Error('Local connection failed. Check the robot address, same-network access and browser local-network permission. This browser may block local WebSockets from HTTPS; account access remains available.');
        const timer = setTimeout(() => { this.#fail('welcome-timeout'); }, timeoutMs);
        this.localReject = error => { clearTimeout(timer); reject(error || failure()); };
        let socket;
        try { socket = new WebSocketImpl(url); this.localSocket = socket; }
        catch { this.localReject(failure()); this.localReject = null; return; }
        socket.onmessage = event => {
          if (this.localSocket !== socket) return;
          if (typeof event.data !== 'string' || event.data.length > 262144) { this.#fail('protocol-error'); return; }
          let message;
          try { message = JSON.parse(event.data); } catch { this.#fail('protocol-error'); return; }
          if (!message || typeof message.type !== 'string') { this.#fail('protocol-error'); return; }
          if (!welcomed) {
            if (message.type !== 'welcome' || typeof message.peerId !== 'string') { this.#fail('protocol-error'); return; }
            welcomed = true;
            this._state = 'connected';
            void (async () => {
              await this._sendToServer({ type: 'setPeerStatus', roles: ['listener'], meta: { name: this._appName } });
              await this._sendToServer({ type: 'list' });
              if (this.localSocket !== socket) return;
              clearTimeout(timer); this.localReject = null;
              this._emit('connected', { peerId: message.peerId }); resolve();
            })().catch(() => this.#fail('signaling-error'));
            return;
          }
          if (message.type === 'error') {
            this._failSessionRejected({ reason: 'Local robot rejected the session' });
            this.#fail('signaling-error'); return;
          }
          // Do not forward unbounded or malformed producer metadata to pickers.
          if (message.type === 'list') {
            if (!Array.isArray(message.producers) || message.producers.length > 32) { this.#fail('protocol-error'); return; }
            message.producers = message.producers.filter(p => typeof p?.id === 'string' && p.id.length <= 128).map(p => ({ id: p.id, meta: { name: typeof p.meta?.name === 'string' ? p.meta.name.slice(0,128) : 'Local Reachy' } }));
          }
          Promise.resolve(this._handleSignalingMessage(message)).catch(() => this.#fail('signaling-error'));
        };
        socket.onerror = () => { if (this.localSocket === socket) this.#fail('socket-error'); };
        socket.onclose = () => { if (this.localSocket === socket) this.#fail('socket-closed'); };
      });
    }

    async _sendToServer(message) {
      const socket = this.localSocket;
      if (!socket || socket.readyState !== 1) return null;
      if (!['setPeerStatus','list','startSession','endSession','peer'].includes(message?.type)) throw Error('Unsupported local signaling message');
      if (socket.bufferedAmount > 262144) { this.#fail('socket-error'); return null; }
      try { socket.send(JSON.stringify(message)); }
      catch { this.#fail('socket-error'); }
      return null; // GStreamer replies arrive as independent WebSocket frames.
    }

    async startSession(robotId) {
      const session = super.startSession(robotId);
      // LAN ICE candidates suffice. Do not contact the SDK's default STUN host.
      this._pc?.setConfiguration({ iceServers: [] });
      let timer;
      try {
        return await Promise.race([session, new Promise((_, reject) => {
          timer = setTimeout(() => { reject(Error(issues['session-timeout'])); this.#fail('session-timeout'); }, timeoutMs);
        })]);
      } finally { clearTimeout(timer); }
    }

    disconnect() {
      this.#clearIce(); this.transportReady = false;
      if (!this.connectionIssue) this.connectionIssue = { code: 'local-closed', message: issues['local-closed'] };
      const socket = this.localSocket; this.localSocket = null;
      const reject = this.localReject; this.localReject = null;
      if (socket) {
        socket.onmessage = socket.onerror = socket.onclose = null;
        if (socket.readyState === 1 && this._sessionId) {
          try { socket.send(JSON.stringify({ type: 'endSession', sessionId: this._sessionId })); } catch { /* local teardown continues */ }
        }
        socket.close();
      }
      reject?.();
      const streaming = this.state === 'streaming';
      super.disconnect();
      if (streaming) this._emit('sessionStopped', { reason: 'local_disconnect' });
    }
  };
}
