import test from 'node:test';
import assert from 'node:assert/strict';
import { createWifiSetupClient } from '../src/wifi-setup.mjs';

const daemon = { version: '1.2.11', wireless_version: true, state: 'stopped', error: null };
const wifi = { mode: 'hotspot', known_networks: [], connected_network: 'Hotspot' };
const response = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const address = (...octets) => octets.join('.');
function fixture(values, options = {}) {
  const calls = [];
  const client = createWifiSetupClient({ host: 'reachy-mini.local', fetchImpl: async (url, init) => {
    calls.push({ url, init }); const value = values.shift(); if (value instanceof Error) throw value; return value instanceof Response ? value : response(value);
  }, ...options });
  return { client, calls };
}
test('only explicit probe uses audited endpoints and fixed privacy options', async () => {
  const { client, calls } = fixture([daemon, wifi]); assert.equal(calls.length, 0);
  const state = await client.probe(); assert.equal(state.supported, true); assert.equal(client.snapshot().ready, true);
  assert.deepEqual(calls.map(c => new URL(c.url).pathname), ['/api/daemon/status', '/wifi/status']);
  for (const { init } of calls) {
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit');
    assert.equal(init.cache, 'no-store'); assert.equal(init.referrerPolicy, 'no-referrer');
  }
});
test('other versions and Lite cannot call any Wi-Fi endpoint', async () => {
  for (const modification of [{ version: '1.11.0' }, { wireless_version: false }]) {
    const { client, calls } = fixture([{ ...daemon, ...modification }, { ...daemon, ...modification }]);
    assert.equal((await client.probe()).supported, false);
    await assert.rejects(client.connect({ ssid: 'network', password: 'password' }), { code: 'unsupported' });
    assert.equal(calls.length, 2); assert.ok(calls.every(c => c.url.endsWith('/api/daemon/status')));
  }
});
test('unsafe and noncanonical targets are refused before fetch', () => {
  for (const host of ['example.com', 'https://reachy-mini.local', `${address(192, 168, 1, 1)}:8000`, address(127, 0, 0, 2), address(192, 168, '001', 1), 'reachy-mini.local/path', 'reachy-mini.local@evil.com', address(8, 8, 8, 8)]) {
    assert.throws(() => createWifiSetupClient({ host }), { code: 'host' });
  }
  for (const host of ['localhost', '127.0.0.1', address(192, 168, 1, 1)]) assert.doesNotThrow(() => createWifiSetupClient({ host }));
});
test('scan is single bounded POST after fresh guards', async () => {
  const { client, calls } = fixture([daemon, wifi, ['network', 'network', '', 'second']]);
  assert.deepEqual(await client.scan(), ['network', 'second']);
  assert.equal(calls.at(-1).init.method, 'POST'); assert.ok(calls.at(-1).url.endsWith('/wifi/scan_and_list'));
});
test('busy Wi-Fi and active or errored daemon prevent writes', async () => {
  for (const [d, w] of [[{ ...daemon, state: 'running' }, wifi], [{ ...daemon, error: 'secret' }, wifi], [daemon, { ...wifi, mode: 'busy' }]]) {
    const { client, calls } = fixture([d, w]);
    await assert.rejects(client.connect({ ssid: 'network', password: 'password' }), { code: 'guard' });
    assert.ok(calls.every(c => c.init.method === 'GET')); assert.equal(JSON.stringify(client.snapshot()).includes('secret'), false);
  }
});
test('connect queues exactly one query write and matching WLAN alone confirms it', async () => {
  const { client, calls } = fixture([daemon, wifi, null, daemon, { ...wifi, mode: 'wlan', connected_network: 'other' }, daemon, { ...wifi, mode: 'wlan', connected_network: 'network & more' }]);
  assert.deepEqual(await client.connect({ ssid: 'network & more', password: 'password&=' }), { accepted: true, confirmed: false, outcome: 'queued' });
  assert.equal(new URL(calls[2].url).searchParams.get('password'), 'password&=');
  assert.equal(JSON.stringify(client.snapshot()).includes('password'), false);
  await assert.rejects(client.connect({ ssid: 'another', password: 'password' }), { code: 'pending' });
  await client.readStatus(); assert.equal(client.snapshot().pendingNetwork, 'network & more');
  await client.readStatus(); assert.equal(client.snapshot().phase, 'joined'); assert.equal(client.snapshot().pendingNetwork, null);
  assert.equal(calls.filter(c => c.init.method === 'POST').length, 1);
});
test('network loss remains unknown and carries across a new host client', async () => {
  const { client } = fixture([daemon, wifi, Error('raw password leakage')]);
  assert.equal((await client.connect({ ssid: 'network', password: 'password' })).outcome, 'unknown');
  client.dispose(); assert.equal(client.snapshot().pendingNetwork, 'network');
  const next = fixture([daemon, { ...wifi, mode: 'wlan', connected_network: 'network' }], { host: address(192, 168, 1, 10), pendingNetwork: client.snapshot().pendingNetwork });
  await assert.rejects(next.client.connect({ ssid: 'network', password: 'password' }), { code: 'pending' });
  await next.client.probe(); assert.equal(next.client.snapshot().phase, 'joined');
});
test('audited pre-worker rejection can unlock while server errors remain uncertain', async () => {
  for (const status of [409, 422, 500]) {
    const { client } = fixture([daemon, wifi, new Response('secret', { status })]);
    if (status === 500) { assert.equal((await client.connect({ ssid: 'network', password: 'password' })).outcome, 'unknown'); assert.equal(client.snapshot().pendingNetwork, 'network'); }
    else { await assert.rejects(client.connect({ ssid: 'network', password: 'password' }), { code: 'rejected' }); assert.equal(client.snapshot().pendingNetwork, null); }
  }
});
test('UTF-8 byte bounds reject before requests and not_initialized permits setup', async () => {
  const { client, calls } = fixture([{ ...daemon, state: 'not_initialized' }, wifi, null]);
  for (const input of [{ ssid: 'é'.repeat(17), password: 'password' }, { ssid: 'network', password: 'é'.repeat(32) }, { ssid: 'network', password: 'short' }]) await assert.rejects(client.connect(input), { code: 'input' });
  assert.equal(calls.length, 0);
  assert.equal((await client.connect({ ssid: 'network', password: 'password' })).outcome, 'queued');
});
test('dispose during fresh guards prevents late mutation despite fetch ignoring abort', async () => {
  let release; const calls = [];
  const client = createWifiSetupClient({ host: 'reachy-mini.local', fetchImpl: async (url) => { calls.push(url); return await new Promise(resolve => { release = resolve; }); } });
  const pending = client.connect({ ssid: 'network', password: 'password' });
  client.dispose(); release(response(daemon)); await assert.rejects(pending, { code: 'disposed' });
  assert.equal(calls.length, 1); assert.equal(client.snapshot().daemon, null); assert.equal(client.snapshot().ready, false);
});
test('one deadline covers body reading and errors expose only fixed text', async () => {
  let expire;
  const client = createWifiSetupClient({ host: 'reachy-mini.local', setTimer: fn => { expire = fn; return 1; }, clearTimer: () => {}, fetchImpl: async () => new Response(new ReadableStream({ start() {} })) });
  const pending = client.probe(); expire(); await assert.rejects(pending, { code: 'transport' });
});
test('stream cap and malformed schema never become supported Wi-Fi facts', async () => {
  const { client } = fixture([daemon, { ...wifi, known_networks: ['x'.repeat(17000)] }]);
  await assert.rejects(client.probe(), { code: 'protocol' }); assert.equal(client.snapshot().wifi, null);
  const malformed = fixture([daemon, { mode: 'wlan', known_networks: [], connected_network: 42 }]);
  await assert.rejects(malformed.client.probe(), { code: 'protocol' });
});
test('overlapping clicks cannot duplicate writes and abort after submission stays unknown', async () => {
  let release; const calls = [];
  const client = createWifiSetupClient({ host: 'reachy-mini.local', fetchImpl: async (url, init) => {
    calls.push({ url, init });
    if (url.includes('/wifi/connect')) return await new Promise(resolve => { release = resolve; });
    return response(url.includes('/api/daemon/status') ? daemon : wifi);
  } });
  const pending = client.connect({ ssid: 'network', password: 'password' });
  await assert.rejects(client.connect({ ssid: 'other', password: 'password' }), { code: 'busy' });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  client.dispose(); release(response(null));
  assert.equal((await pending).outcome, 'unknown');
  assert.equal(client.snapshot().pendingNetwork, 'network'); assert.equal(client.snapshot().phase, 'unknown');
  assert.equal(calls.filter(c => c.init.method === 'POST').length, 1);
});
test('failed re-probe expires prior ready observations at either fresh GET', async () => {
  for (const failure of [[Error('offline')], [daemon, Error('offline')]]) {
    const { client } = fixture([daemon, wifi, ...failure]);
    await client.probe(); assert.equal(client.snapshot().ready, true);
    await assert.rejects(client.probe(), { code: 'transport' });
    assert.equal(client.snapshot().ready, false); assert.equal(client.snapshot().supported, false);
    assert.equal(client.snapshot().daemon, null); assert.equal(client.snapshot().wifi, null);
  }
  const pending = fixture([daemon, wifi, null, Error('offline')]);
  await pending.client.connect({ ssid: 'network', password: 'password' });
  await assert.rejects(pending.client.readStatus(), { code: 'transport' });
  assert.equal(pending.client.snapshot().pendingNetwork, 'network'); assert.equal(pending.client.snapshot().phase, 'queued');
});
test('deadline and disposal cancel a stalled body reader without awaiting producer cleanup', async () => {
  for (const end of ['deadline', 'dispose']) {
    let expire, cancelled = 0;
    const body = new ReadableStream({ cancel() { cancelled++; return new Promise(() => {}); } });
    const client = createWifiSetupClient({ host: 'reachy-mini.local', setTimer: fn => { expire = fn; return 1; }, clearTimer: () => {}, fetchImpl: async () => new Response(body) });
    const pending = client.probe();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(body.locked, true);
    if (end === 'dispose') client.dispose(); else expire();
    await assert.rejects(pending, { code: end === 'dispose' ? 'disposed' : 'transport' });
    assert.equal(cancelled, 1); assert.equal(client.snapshot().ready, false);
  }
});
test('injected browser-style functions never receive the adapter as receiver', async () => {
  const values = [daemon, wifi];
  const client = createWifiSetupClient({ host: 'reachy-mini.local',
    fetchImpl: async function () { assert.equal(this, undefined); return response(values.shift()); },
    setTimer: function (fn, ms) { assert.equal(this, undefined); return setTimeout(fn, ms); },
    clearTimer: function (timer) { assert.equal(this, undefined); clearTimeout(timer); },
  });
  await client.probe(); assert.equal(client.snapshot().ready, true);
});
