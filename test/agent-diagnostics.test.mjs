import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { parseArgs, statusReport, runAgent, errorReport, verifySite } from '../tools/Agent-Diagnostics.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const daemon = (version = '1.2.11', wireless = true) => JSON.stringify({ version, wireless_version: wireless, state: 'not_initialized',
  hardware_id: 'private-identity', token: 'private-token', robot_name: 'private-name', error: 'private-error' });
const errorCode = code => error => {
  const report = errorReport(error);
  assert.equal(report.ok, false); assert.equal(report.error.code, code);
  assert.doesNotMatch(JSON.stringify(report), /private-|secret|reflected/);
  return true;
};
const chunked = (...chunks) => new Response(new ReadableStream({ start(controller) {
  for (const chunk of chunks) controller.enqueue(Buffer.from(chunk)); controller.close();
} }));

function publication() {
  const files = new Map([
    ['index.html', Buffer.from('<html>Fixture</html>')],
    ['assets/main.js', Buffer.from('export const fixture = true;')],
    ['source/README.md', Buffer.from('Synthetic public source')],
    ['downloads/reachy-mini-controller-v0.1.0.zip', Buffer.from('synthetic archive bytes')],
  ]);
  const entry = name => ({ path: name, bytes: files.get(name).length, sha256: digest(files.get(name)) });
  const build = { version: '0.1.0', files: ['index.html', 'assets/main.js'].map(entry) };
  const source = { schema: 'reachy.public-source.v1', files: [{ ...entry('source/README.md'), path: 'README.md' }] };
  const release = { schema: 'reachy.public-artifacts.v1', sourceManifest: 'source/SOURCE_MANIFEST.json',
    archive: entry('downloads/reachy-mini-controller-v0.1.0.zip'), sourceFiles: 2 };
  const refresh = () => {
    for (const [name, value] of [['build-manifest.json', build], ['source/SOURCE_MANIFEST.json', source], ['PUBLIC_ARTIFACTS.json', release]]) files.set(name, Buffer.from(JSON.stringify(value)));
  };
  refresh(); return { files, build, source, release, refresh };
}
function mockSite(files, calls = []) {
  return async (url, options) => {
    calls.push({ url, options });
    const name = new URL(url).pathname.slice('/reachy-mini/'.length);
    return files.has(name) ? chunked(files.get(name)) : new Response('', { status: 404 });
  };
}
async function localPublication(t, fixture = publication()) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'reachy-agent-fixture-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  for (const [name, bytes] of fixture.files) {
    const target = path.join(directory, name); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, bytes);
  }
  return directory;
}

test('argument grammar requires one explicit input, rejects ambiguous and inherited command names', () => {
  assert.deepEqual(parseArgs(['--help']), { command: 'help' });
  assert.deepEqual(parseArgs(['guidance', '--stdin']), { command: 'guidance', '--stdin': true });
  assert.deepEqual(parseArgs(['validate-export']), { command: 'validate-export' });
  for (const args of [[], ['__proto__'], ['constructor'], ['status'], ['status', '--host'], ['status', '--host', '--stdin'],
    ['status', '--host', 'reachy-mini.local', '--host', 'reachy-mini.local'], ['status', '--yes'], ['guidance', '--stdin', '--status-file', 'fixture.json'],
    ['verify-site', '--url', 'https://site.invalid/reachy-mini/', '--site-dir', 'fixture'], ['validate-export', '--host', 'reachy-mini.local']]) {
    assert.throws(() => parseArgs(args), errorCode('arguments'));
  }
});

test('1.2.11 is useful setup guidance while controller compatibility stays gated', () => {
  const report = statusReport(daemon());
  assert.equal(report.guidance.kind, 'legacy'); assert.equal(report.guidance.settings, 'confirmed'); assert.equal(report.guidance.oauth, false);
  assert.equal(report.controllerSupported, false); assert.equal(report.bluetooth, 'not_observed'); assert.equal(report.identityVerified, false);
  assert.deepEqual(report.daemon, { version: '1.2.11', wireless: true, state: 'not_initialized', hasError: true });
  assert.doesNotMatch(JSON.stringify(report), /private-/);
  assert.equal(statusReport(daemon('1.10.0')).controllerSupported, true);
  assert.equal(statusReport(daemon('1.10.0', false)).controllerSupported, false);
  assert.equal(statusReport(daemon('1.11.0')).controllerSupported, false);
});

test('status sends one bounded GET and matches offline shared guidance', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return chunked(daemon().slice(0, 50), daemon().slice(50)); };
  const live = await runAgent({ argv: ['status', '--host', 'reachy-mini.local'], fetchImpl });
  const offline = await runAgent({ argv: ['guidance', '--stdin'], stdin: Readable.from([daemon()]), fetchImpl: () => { throw Error('unexpected request'); } });
  assert.deepEqual(live.result, offline.result); assert.equal(live.schema, 'reachy.agent-diagnostics.v1'); assert.equal(live.ok, true);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, 'http://reachy-mini.local:8000/api/daemon/status');
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.redirect, 'error');
  assert.ok(calls[0].options.signal instanceof AbortSignal); assert.equal(calls[0].options.signal.aborted, false);
  assert.equal(Object.hasOwn(calls[0].options, 'body'), false);
});

test('invalid hosts and invalid arguments make no request', async () => {
  let requests = 0; const fetchImpl = async () => { requests++; throw Error('unexpected'); };
  for (const host of ['https://reachy-mini.local', 'reachy-mini.local:8000', 'user:secret@reachy-mini.local', 'reachy-mini.local/path',
    'reachy-mini.local?secret', 'example.com', ['8', '8', '8', '8'].join('.'), 'reachy-mini.local#secret']) {
    await assert.rejects(runAgent({ argv: ['status', '--host', host], fetchImpl }), errorCode('host'));
  }
  await assert.rejects(runAgent({ argv: ['status', '--scan'], fetchImpl }), errorCode('arguments'));
  assert.equal(requests, 0);
});

test('status rejects redirects, HTTP failures, malformed UTF-8/JSON and reflected network errors safely', async () => {
  for (const [response, code] of [[new Response('', { status: 302 }), 'http'], [new Response('', { status: 503 }), 'http'],
    [chunked(Buffer.from([0xff])), 'status'], [chunked('private-secret'), 'status'], [chunked('null'), 'status']]) {
    await assert.rejects(runAgent({ argv: ['status', '--host', 'reachy-mini.local'], fetchImpl: async () => response }), errorCode(code));
  }
  for (const name of ['TypeError', 'TimeoutError']) {
    await assert.rejects(runAgent({ argv: ['status', '--host', 'reachy-mini.local'], fetchImpl: async () => { const error = Error('reflected private-secret'); error.name = name; throw error; } }), errorCode('network'));
  }
});

test('declared and streamed oversized status bodies fail and cancel their streams', async () => {
  for (const declared of [true, false]) {
    let cancelled = false;
    const stream = new ReadableStream({ pull(controller) { controller.enqueue(Buffer.alloc(9000, 120)); }, cancel() { cancelled = true; } });
    const response = new Response(stream, declared ? { headers: { 'content-length': '16385' } } : undefined);
    await assert.rejects(runAgent({ argv: ['status', '--host', 'reachy-mini.local'], fetchImpl: async () => response }), errorCode('size'));
    assert.equal(cancelled, true);
  }
});

test('status abort signal enforces its five-second deadline without retry', async () => {
  let requests = 0;
  const fetchImpl = (url, { signal }) => new Promise((resolve, reject) => {
    requests++;
    // Keep a mocked stalled operation alive, as a real socket would.
    const timer = setTimeout(() => reject(Error('private-secret deadline did not abort')), 6500);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
  await assert.rejects(runAgent({ argv: ['status', '--host', 'reachy-mini.local'], fetchImpl }), errorCode('network'));
  assert.equal(requests, 1);
});

test('offline input is bounded and errors are sanitized', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'reachy-agent-input-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'status.json'); await fs.writeFile(filename, daemon());
  const result = await runAgent({ argv: ['guidance', '--status-file', filename] }); assert.equal(result.result.guidance.kind, 'legacy');
  await fs.writeFile(filename, Buffer.alloc(16385));
  await assert.rejects(runAgent({ argv: ['guidance', '--status-file', filename] }), errorCode('input'));
  await assert.rejects(runAgent({ argv: ['guidance', '--status-file', directory] }), errorCode('input'));
  await assert.rejects(runAgent({ argv: ['guidance', '--status-file', path.join(directory, 'private-secret')] }), errorCode('input'));
  await assert.rejects(runAgent({ argv: ['guidance', '--stdin'], stdin: Readable.from([Buffer.alloc(16385)]) }), errorCode('input'));
  await assert.rejects(runAgent({ argv: ['guidance', '--stdin'], stdin: Readable.from([Buffer.from([0xff])]) }), errorCode('input'));
  await assert.rejects(runAgent({ argv: ['guidance', '--stdin'], stdin: Readable.from((async function* () { throw Error('private-secret'); })()) }), errorCode('input'));
});

test('verify-site accepts actual manifest shapes locally without network or writes', async t => {
  const fixture = publication(), directory = await localPublication(t, fixture);
  const result = await runAgent({ argv: ['verify-site', '--site-dir', directory], fetchImpl: () => { throw Error('unexpected network'); } });
  assert.equal(result.result.filesVerified, 4); assert.equal(result.result.sourceArchiveSha256, fixture.release.archive.sha256);
  assert.equal(result.result.browserTested, false); assert.equal(result.result.robotTested, false);
  for (const [name, bytes] of fixture.files) assert.deepEqual(await fs.readFile(path.join(directory, name)), bytes);
});

test('remote site verification uses only explicit bounded sequential GETs', async () => {
  const fixture = publication(), calls = [];
  const result = await verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(fixture.files, calls) });
  assert.equal(result.filesVerified, 4); assert.equal(calls.length, 7);
  assert.deepEqual(calls.slice(0, 3).map(call => new URL(call.url).pathname), ['/reachy-mini/build-manifest.json', '/reachy-mini/source/SOURCE_MANIFEST.json', '/reachy-mini/PUBLIC_ARTIFACTS.json']);
  for (const call of calls) { assert.equal(call.options.method, 'GET'); assert.equal(call.options.redirect, 'error'); assert.ok(call.options.signal instanceof AbortSignal); }
});

test('site verification uses explicit static paths while validating canonical source paths', async () => {
  const fixture = publication();
  const bytes = fixture.files.get('source/README.md');
  fixture.files.delete('source/README.md'); fixture.files.set('source/github/workflows/checks.yml', bytes);
  fixture.source.files[0].path = '.github/workflows/checks.yml';
  fixture.source.files[0].sitePath = 'github/workflows/checks.yml'; fixture.refresh();
  const calls = [];
  assert.equal((await verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(fixture.files, calls) })).filesVerified, 4);
  assert.ok(calls.some(call => new URL(call.url).pathname.endsWith('/source/github/workflows/checks.yml')));
  for (const [key, value] of [['sitePath', '../private-secret'], ['path', '../private-secret']]) {
    const previous = fixture.source.files[0][key]; fixture.source.files[0][key] = value; fixture.refresh();
    await assert.rejects(verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(fixture.files) }), errorCode('manifest'));
    fixture.source.files[0][key] = previous; fixture.refresh();
  }
});

test('site verification fails at the first declared byte/hash mismatch', async () => {
  for (const mutation of [fixture => fixture.files.set('index.html', Buffer.from('wrong')), fixture => { fixture.build.files[0].sha256 = '0'.repeat(64); fixture.refresh(); }]) {
    const fixture = publication(), calls = []; mutation(fixture);
    await assert.rejects(verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(fixture.files, calls) }), errorCode('integrity'));
    assert.equal(calls.length, 4);
  }
});

test('site inventory rejects traversal, duplicates, oversized budgets, bad manifests and archive paths before content reads', async () => {
  const changes = [fixture => { fixture.build.files[0].path = '../private-secret'; }, fixture => { fixture.source.files[0].path = '/escape'; },
    fixture => { fixture.source.files[0].path = 'a\\b'; }, fixture => { fixture.source.files[0].path = '%2e%2e/secret'; },
    fixture => { fixture.build.files.push(fixture.build.files[0]); }, fixture => { fixture.build.files[0].bytes = 12 * 1024 * 1024 + 1; },
    fixture => { fixture.build.files = Array.from({ length: 257 }, () => fixture.build.files[0]); },
    fixture => { fixture.build.files = Array.from({ length: 6 }, (_, index) => ({ ...fixture.build.files[0], path: `assets/budget-${index}.wasm`, bytes: 12 * 1024 * 1024 })); },
    fixture => { fixture.build.files[0].sha256 = 'private-secret'; }, fixture => { fixture.release.archive.path = 'source/archive.zip'; },
    fixture => { fixture.release.sourceManifest = '../private-secret'; }, fixture => { fixture.source.files = []; }];
  for (const change of changes) {
    const fixture = publication(), calls = []; change(fixture); fixture.refresh();
    await assert.rejects(verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(fixture.files, calls) }), errorCode('manifest'));
    assert.equal(calls.length, 3);
  }
  for (const invalid of ['null', '[]', 'private-secret', JSON.stringify({ files: 'secret' })]) {
    const fixture = publication(); fixture.files.set('build-manifest.json', Buffer.from(invalid));
    await assert.rejects(verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(fixture.files) }), errorCode('manifest'));
  }
});

test('site manifests and content responses enforce streaming size limits', async () => {
  const fixture = publication(); fixture.files.set('build-manifest.json', Buffer.alloc(131073, 120));
  await assert.rejects(verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(fixture.files) }), errorCode('size'));
  const content = publication(); content.files.set('index.html', Buffer.alloc(content.build.files[0].bytes + 1));
  await assert.rejects(verifySite({ url: 'https://site.invalid/reachy-mini/', fetchImpl: mockSite(content.files) }), errorCode('size'));
});

test('unsafe site URL options fail before a request', async () => {
  let requests = 0; const fetchImpl = () => { requests++; throw Error('unexpected'); };
  for (const url of ['http://site.invalid/reachy-mini/', 'https://user:secret@site.invalid/reachy-mini/', 'https://site.invalid/reachy-mini/?secret',
    'https://site.invalid/reachy-mini/#secret', 'https://site.invalid/reachy-mini', 'not a URL']) {
    await assert.rejects(verifySite({ url, fetchImpl }), errorCode('arguments'));
  }
  await assert.rejects(verifySite({ url: 'https://site.invalid/reachy-mini/', directory: 'fixture', fetchImpl }), errorCode('arguments'));
  assert.equal(requests, 0);
});

test('local manifest cannot escape selected directory through a symlink', async t => {
  const fixture = publication(), directory = await localPublication(t, fixture);
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'reachy-agent-outside-'));
  t.after(() => fs.rm(outside, { recursive: true, force: true }));
  await fs.writeFile(path.join(outside, 'main.js'), fixture.files.get('assets/main.js'));
  await fs.rm(path.join(directory, 'assets'), { recursive: true, force: true });
  // A junction is available on Windows without symbolic-link privilege.
  await fs.symlink(outside, path.join(directory, 'assets'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(verifySite({ directory }), errorCode('manifest'));
});
