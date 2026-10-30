import { robotBrowserLinks } from './setup-guidance.mjs';

export function localSignalingUrl(host) {
  const links = robotBrowserLinks(host);
  if (!links) throw Error('Enter a private local IP or .local hostname without a scheme, port or path.');
  return `ws://${new URL(links.dashboard).hostname}:8443`;
}

// Audited against SDK 1.8.0 and daemon 1.10/1.11's GStreamer signaller.
// Only rendezvous changes: WebRTC, decoding, commands and telemetry admission
// continue through the pinned SDK and WirelessControl. No HTTP, HF or retries.
export function createLocalWirelessSDK(ReachyMini, { host, WebSocketImpl = globalThis.WebSocket, timeoutMs = 15000 } = {}) {
  const url = localSignalingUrl(host);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw Error('Local connection deadline must be at most 30000 ms.');
  return class LocalWirelessSDK extends ReachyMini {
    localSocket = null;
    localReject = null;
    constructor(options) {
      super(options);
      // The pinned SDK catches SDP/ICE failures inside an unawaited peer
      // handler. Its error event, rather than the outer Promise, closes LAN
      // admission. No background recovery or reconnection follows.
      this.addEventListener('error', () => { if (this.localSocket) this.disconnect(); });
    }
    async authenticate() { return true; }
    async connect(token) {
      if (token) throw Error('Local connection does not accept account tokens or credentials.');
      if (this.state !== 'disconnected' || this.localSocket) throw Error('Already connected');
      if (typeof WebSocketImpl !== 'function') throw Error('This browser does not support local WebSockets.');
      return new Promise((resolve, reject) => {
        let welcomed = false;
        const failure = () => Error('Local connection failed. Check the robot address, same-network access and browser local-network permission. This browser may block local WebSockets from HTTPS; account access remains available.');
        const timer = setTimeout(() => { this.disconnect(); }, timeoutMs);
        this.localReject = error => { clearTimeout(timer); reject(error || failure()); };
        let socket;
        try { socket = new WebSocketImpl(url); this.localSocket = socket; }
        catch { this.localReject(failure()); this.localReject = null; return; }
        socket.onmessage = event => {
          if (this.localSocket !== socket) return;
          if (typeof event.data !== 'string' || event.data.length > 262144) { this.disconnect(); return; }
          let message;
          try { message = JSON.parse(event.data); } catch { this.disconnect(); return; }
          if (!message || typeof message.type !== 'string') { this.disconnect(); return; }
          if (!welcomed) {
            if (message.type !== 'welcome' || typeof message.peerId !== 'string') { this.disconnect(); return; }
            welcomed = true;
            this._state = 'connected';
            void (async () => {
              await this._sendToServer({ type: 'setPeerStatus', roles: ['listener'], meta: { name: this._appName } });
              await this._sendToServer({ type: 'list' });
              if (this.localSocket !== socket) return;
              clearTimeout(timer); this.localReject = null;
              this._emit('connected', { peerId: message.peerId }); resolve();
            })().catch(() => this.disconnect());
            return;
          }
          if (message.type === 'error') {
            this._failSessionRejected({ reason: 'Local robot rejected the session' });
            this.disconnect(); return;
          }
          // Do not forward unbounded or malformed producer metadata to pickers.
          if (message.type === 'list') {
            if (!Array.isArray(message.producers) || message.producers.length > 32) { this.disconnect(); return; }
            message.producers = message.producers.filter(p => typeof p?.id === 'string' && p.id.length <= 128).map(p => ({ id: p.id, meta: { name: typeof p.meta?.name === 'string' ? p.meta.name.slice(0,128) : 'Local Reachy' } }));
          }
          Promise.resolve(this._handleSignalingMessage(message)).catch(() => this.disconnect());
        };
        socket.onerror = () => { if (this.localSocket === socket) this.disconnect(); };
        socket.onclose = () => { if (this.localSocket === socket) this.disconnect(); };
      });
    }

    async _sendToServer(message) {
      const socket = this.localSocket;
      if (!socket || socket.readyState !== 1) return null;
      if (!['setPeerStatus','list','startSession','endSession','peer'].includes(message?.type)) throw Error('Unsupported local signaling message');
      if (socket.bufferedAmount > 262144) { this.disconnect(); return null; }
      try { socket.send(JSON.stringify(message)); }
      catch { this.disconnect(); }
      return null; // GStreamer replies arrive as independent WebSocket frames.
    }

    async startSession(robotId) {
      const session = super.startSession(robotId);
      // LAN ICE candidates suffice. Do not contact the SDK's default STUN host.
      this._pc?.setConfiguration({ iceServers: [] });
      let timer;
      try {
        return await Promise.race([session, new Promise((_, reject) => {
          timer = setTimeout(() => { reject(Error('Local WebRTC session timed out; start a new connection explicitly.')); this.disconnect(); }, timeoutMs);
        })]);
      } finally { clearTimeout(timer); }
    }

    disconnect() {
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
