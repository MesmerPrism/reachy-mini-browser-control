import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseDaemonStatus, daemonGuidance, robotBrowserLinks } from '../src/setup-guidance.mjs';
import { collectPublicSource } from './Export-Public.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const STATUS_LIMIT = 16384;
const errors = {
  arguments: 'Use --help for the supported commands and options.',
  host: 'Specify a private IPv4 address or a local hostname without a scheme, port or path.',
  input: 'Could not read a bounded UTF-8 daemon status document.',
  status: 'The response is not a supported daemon status document.',
  network: 'The requested endpoint was unreachable, redirected, or exceeded the deadline.',
  http: 'The requested endpoint returned an unsuccessful HTTP status.',
  size: 'The response exceeded the diagnostics size limit.',
  manifest: 'The publication manifest is invalid or exceeds the inventory limit.',
  integrity: 'A published file does not match its declared size or SHA-256.',
  export: 'The source export did not pass the existing publication audit.',
};
class DiagnosticError extends Error {
  constructor(code) { super(errors[code]); this.code = code; }
}
const fail = code => new DiagnosticError(code);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const HELP = `Reachy browser agent diagnostics — read-only, JSON output

npm run agent -- status --host reachy-mini.local
npm run agent -- guidance --status-file local/daemon-status.json
npm run agent -- guidance --stdin
npm run agent -- validate-export
npm run agent -- verify-site --url https://mesmerprism.com/reachy-mini/
npm run agent -- verify-site --site-dir <website-root>/reachy-mini

status requests only GET /api/daemon/status, once, with a five-second deadline.
guidance uses the same sanitized facts and version guidance as the setup page.
validate-export audits the source allowlist without creating or changing files.
verify-site checks build/source manifest files and the source ZIP against their
declared hashes. This checks publication consistency, not browser or robot health.

No automatic network scan, Bluetooth selection, credential use, Wi-Fi change,
motion, media, authorization, configuration write, update or deployment.
Browser first pairing and account authorization still require explicit actions.
The CLI is an optional developer tool; hosted users do not need to install it.
Exit codes: 0 = completed; 2 = failed. Errors are sanitized JSON.
Use node tools/Agent-Diagnostics.mjs directly for stdout containing JSON only.
`;

export function parseArgs(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { command: 'help' };
  const command = argv[0];
  const commands = { status: ['--host'], guidance: ['--status-file', '--stdin'], 'validate-export': [], 'verify-site': ['--url', '--site-dir'] };
  if (!Object.hasOwn(commands, command)) throw fail('arguments');
  const allowed = commands[command];
  const result = { command };
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (!allowed.includes(flag) || Object.hasOwn(result, flag)) throw fail('arguments');
    if (flag === '--stdin') result[flag] = true;
    else { const value = argv[++i]; if (!value || value.startsWith('--')) throw fail('arguments'); result[flag] = value; }
  }
  const count = Object.keys(result).length - 1;
  if (command !== 'validate-export' && count !== 1) throw fail('arguments');
  return result;
}

export function statusReport(text) {
  let daemon;
  try { daemon = parseDaemonStatus(text); } catch { throw fail('status'); }
  return { daemon, guidance: daemonGuidance(daemon), controllerSupported: daemon.wireless && daemon.version === '1.10.0',
    bluetooth: 'not_observed', identityVerified: false };
}

async function boundedBody(response, limit) {
  const declared = response.headers.get('content-length');
  if (declared && Number(declared) > limit) { await response.body?.cancel().catch(() => {}); throw fail('size'); }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw fail('size');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, length);
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

async function request(url, limit, fetchImpl) {
  try {
    const response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(5000) });
    if (!response.ok || response.status < 200 || response.status >= 300) throw fail('http');
    return await boundedBody(response, limit);
  } catch (error) { throw error instanceof DiagnosticError ? error : fail('network'); }
}

function utf8(bytes, code) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw fail(code); }
}
async function readInput(filename) {
  let handle;
  try {
    handle = await fs.open(filename, 'r');
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > STATUS_LIMIT) throw fail('input');
    // Bound even if the file grows after stat.
    const buffer = Buffer.alloc(STATUS_LIMIT + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > STATUS_LIMIT) throw fail('input');
    return utf8(buffer.subarray(0, length), 'input');
  } catch (error) { throw error instanceof DiagnosticError ? error : fail('input'); }
  finally { await handle?.close(); }
}
async function readStdin(stream) {
  const chunks = []; let length = 0;
  try { for await (const chunk of stream) {
      const bytes = Buffer.from(chunk); length += bytes.length;
      if (length > STATUS_LIMIT) throw fail('input');
      chunks.push(bytes);
    }
  } catch { throw fail('input'); }
  return utf8(Buffer.concat(chunks), 'input');
}

function safePath(name) {
  if (typeof name !== 'string' || name.length > 180 || !/^[A-Za-z0-9_./-]+$/.test(name)
    || name.split('/').some(part => !part || part === '.' || part === '..')) throw fail('manifest');
  return name;
}
function entries(value, prefix = '') {
  if (!Array.isArray(value) || !value.length || value.length > 256) throw fail('manifest');
  return value.map(file => {
    if (!file || typeof file !== 'object' || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 12 * 1024 * 1024
      || typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) throw fail('manifest');
    return { path: prefix + safePath(file.path), bytes: file.bytes, sha256: file.sha256 };
  });
}
function document(bytes) {
  try {
    const value = JSON.parse(utf8(bytes, 'manifest'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('manifest');
    return value;
  } catch { throw fail('manifest'); }
}

export async function verifySite({ url, directory, fetchImpl = globalThis.fetch } = {}) {
  let base;
  if (url) {
    try { base = new URL(url); } catch { throw fail('arguments'); }
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) throw fail('arguments');
  }
  if (!!url === !!directory) throw fail('arguments');
  const read = async (name, limit) => {
    safePath(name);
    if (base) return request(new URL(name, base).href, limit, fetchImpl);
    // The manifest may not escape the explicitly selected directory via symlinks.
    let handle;
    try {
      const resolvedRoot = await fs.realpath(directory), target = await fs.realpath(path.join(resolvedRoot, name));
      if (!target.startsWith(resolvedRoot + path.sep)) throw fail('manifest');
      handle = await fs.open(target, 'r');
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > limit) throw fail('size');
      const buffer = Buffer.alloc(limit + 1); let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
        if (!bytesRead) break;
        length += bytesRead;
      }
      if (length > limit) throw fail('size');
      return buffer.subarray(0, length);
    } catch (error) { throw error instanceof DiagnosticError ? error : fail('integrity'); }
    finally { await handle?.close(); }
  };
  const build = document(await read('build-manifest.json', 131072));
  const source = document(await read('source/SOURCE_MANIFEST.json', 131072));
  const release = document(await read('PUBLIC_ARTIFACTS.json', 16384));
  if (!release.archive || release.sourceManifest !== 'source/SOURCE_MANIFEST.json'
    || typeof release.archive.path !== 'string' || !/^downloads\/[A-Za-z0-9_.-]+\.zip$/.test(release.archive.path)) throw fail('manifest');
  const inventory = [...entries(build.files), ...entries(source.files, 'source/'), ...entries([release.archive])];
  if (!inventory.some(file => file.path === 'index.html') || new Set(inventory.map(file => file.path)).size !== inventory.length
    || inventory.reduce((sum, file) => sum + file.bytes, 0) > 64 * 1024 * 1024) throw fail('manifest');
  // Sequential bounded reads keep load predictable and stop at first mismatch.
  for (const file of inventory) {
    const bytes = await read(file.path, Math.max(file.bytes, 1));
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw fail('integrity');
  }
  return { filesVerified: inventory.length, sourceArchiveSha256: release.archive.sha256,
    scope: 'build manifest, source manifest and source archive', browserTested: false, robotTested: false };
}

export async function runAgent({ argv = [], fetchImpl = globalThis.fetch, stdin = process.stdin, appRoot = root } = {}) {
  const options = parseArgs(argv), command = options.command;
  if (command === 'help') return { help: HELP };
  let result;
  if (command === 'guidance') result = statusReport(options['--stdin'] ? await readStdin(stdin) : await readInput(options['--status-file']));
  else if (command === 'status') {
    const links = robotBrowserLinks(options['--host']);
    if (!links) throw fail('host');
    result = statusReport(utf8(await request(links.status, STATUS_LIMIT, fetchImpl), 'status'));
  } else if (command === 'validate-export') {
    let files;
    try { files = await collectPublicSource(appRoot); } catch { throw fail('export'); }
    result = { sourceFilesAudited: files.length, files: files.map(file => ({ path: file.name, bytes: file.bytes.length, sha256: hash(file.bytes) })) };
  } else result = await verifySite({ url: options['--url'], directory: options['--site-dir'], fetchImpl });
  return { schema: 'reachy.agent-diagnostics.v1', ok: true, command, result };
}
export function errorReport(error) {
  const code = error instanceof DiagnosticError ? error.code : 'arguments';
  return { schema: 'reachy.agent-diagnostics.v1', ok: false, error: { code, message: errors[code] } };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const result = await runAgent({ argv: process.argv.slice(2) }); console.log(result.help || JSON.stringify(result)); }
  catch (error) { console.log(JSON.stringify(errorReport(error))); process.exitCode = 2; }
}
