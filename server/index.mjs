import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { RobotControl, ReachyAdapter, DemoAdapter } from './control.mjs';
import { AudioControl } from './audio-control.mjs';
import { createMediaGuard } from './media-guard.mjs';
import { localPageHeaders } from './security-headers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = process.argv.includes('--demo');
const configFile = process.env.REACHY_CONFIG || path.join(root, 'local', 'config.json');
const config = demo ? {} : JSON.parse(fs.readFileSync(configFile, 'utf8'));
const outcomeFile = path.join(path.dirname(configFile), 'unknown-outcome.json');
if (!demo) config.onUncertain = message => {
  fs.writeFileSync(outcomeFile, JSON.stringify({ at: new Date().toISOString(), message }, null, 2));
};
const port = Number(process.env.PORT || config.port || 18750);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid loopback port');
const control = new RobotControl(demo ? new DemoAdapter() : new ReachyAdapter(config));
if (!demo && fs.existsSync(outcomeFile)) control.adapter.uncertain = JSON.parse(fs.readFileSync(outcomeFile, 'utf8')).message;
const robotMediaGuard = createMediaGuard(control);
const audio = new AudioControl({ adapter: control.adapter, demo, guard: robotMediaGuard });
const token = crypto.randomBytes(24).toString('hex');
const peers = new Set();
const allowedOrigin = value => [`http://localhost:${port}`, `http://127.0.0.1:${port}`].includes(value);
const validHost = value => [`localhost:${port}`, `127.0.0.1:${port}`].includes(value);
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
async function body(req) {
  let bytes = 0; const chunks = [];
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 4096) throw Object.assign(Error('Request too large'), { status: 413 }); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw Object.assign(Error('Invalid JSON'), { status: 400 }); }
}
let catalogPromise = null;
const catalog = () => catalogPromise ||= control.emotes().finally(() => { catalogPromise = null; });
const server = http.createServer(async (req, res) => {
  try {
    if (!validHost(req.headers.host) || (req.headers.origin && !allowedOrigin(req.headers.origin))) return json(res, 403, { error: 'Use the local app address' });
    const url = new URL(req.url, `http://localhost:${port}`);
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { token, mode: demo ? 'demo' : 'robot', controlEpoch: control.epoch, audioModes: true, antennaModes: true, headManualModes: true, headManualPoseModes: true, headManualLimits: control.adapter.headManualLimits, headTrackingModes: true, headTrackingMotion: control.adapter.headTrackingEnabled === true, headTrackingLimits: control.adapter.headTrackingLimits || { yaw: 20, pitch: 15, pilot: false } });
    if (req.method === 'GET' && url.pathname === '/api/status') return json(res, 200, await control.status());
    if (req.method === 'GET' && url.pathname === '/api/audio/status') return json(res, 200, await audio.status());
    if (req.method === 'GET' && url.pathname === '/api/emotes') {
      return json(res, 200, control.catalog.length ? { emotes: control.catalog } : await catalog());
    }
    if (req.method === 'POST' && url.pathname === '/api/command') {
      if (req.headers['x-control-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return json(res, 403, { error: 'Control session is not valid' });
      return json(res, 200, await control.command(await body(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/audio/command') {
      if (req.headers['x-control-token'] !== token || !req.headers['content-type']?.startsWith('application/json')) return json(res, 403, { error: 'Control session is not valid' });
      return json(res, 200, await audio.command(await body(req)));
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    let name;
    try { name = decodeURIComponent(url.pathname); } catch { return json(res, 400, { error: 'Invalid path' }); }
    const file = path.resolve(root, 'dist', name === '/' ? 'index.html' : '.' + name);
    if (!file.startsWith(path.join(root, 'dist') + path.sep)) return json(res, 404, { error: 'Not found' });
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: 'Not found; build the app with npm run build' });
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.glb': 'model/gltf-binary', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, localPageHeaders(mime, port));
    fs.createReadStream(file).pipe(res);
  } catch (e) { if (!res.headersSent) json(res, e.status || 502, { ok: false, error: e.message, controlEpoch: control.epoch }); else res.destroy(); }
});

// Fixed local signaling proxy avoids mixed-content/CORS issues. It carries
// GStreamer listener negotiation; motion always goes through the typed API.
const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (demo || !validHost(req.headers.host) || !allowedOrigin(req.headers.origin) || url.pathname !== '/signal' || url.searchParams.get('token') !== token) throw Error('Invalid media session');
    const state = await robotMediaGuard('media');
    if (!state.mediaReady) throw Error('Camera is unavailable');
    wss.handleUpgrade(req, socket, head, client => {
      const remote = new WebSocket(control.adapter.signalUrl, { maxPayload: 256 * 1024 });
      const pair = { client, remote }; peers.add(pair);
      const cleanup = () => { peers.delete(pair); client.close(); remote.close(); };
      client.on('error', cleanup); remote.on('error', cleanup);
      client.on('close', cleanup); remote.on('close', cleanup);
      remote.on('message', data => { if (client.readyState === WebSocket.OPEN) client.send(data.toString()); });
      client.on('message', data => {
        try {
          const message = JSON.parse(data.toString());
          if (!['setPeerStatus', 'list', 'startSession', 'peer', 'endSession'].includes(message.type)) throw Error('Unexpected signal');
          if (message.type === 'setPeerStatus' && (JSON.stringify(message.roles) !== '["listener"]')) throw Error('Listener role required');
          if (remote.readyState === WebSocket.OPEN) remote.send(JSON.stringify(message));
        } catch { cleanup(); }
      });
    });
  } catch { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Reachy Mini ${demo ? 'demo' : 'desktop control'}: http://localhost:${port}`));
let stopping = false;
async function shutdown() {
  if (stopping) return; stopping = true;
  for (const { client, remote } of peers) { client.close(); remote.close(); }
  const deadline = setTimeout(() => process.exit(1), 12000); deadline.unref();
  await control.close().catch(e => console.error('Cleanup:', e.message));
  server.close(); server.closeAllConnections(); wss.close();
  process.exitCode = 0;
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
// Bounded local session matches the coordination wrapper's two-hour leases.
setTimeout(shutdown, Number(process.env.REACHY_SESSION_MINUTES || 115) * 60000).unref();
