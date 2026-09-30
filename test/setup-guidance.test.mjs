import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDaemonStatus, daemonGuidance, robotBrowserLinks, reportedRobotHost } from '../src/setup-guidance.mjs';

test('daemon status parser selects bounded facts and discards raw credentials, identity and errors', () => {
  const result = parseDaemonStatus(JSON.stringify({ version: '1.2.11', wireless_version: true, state: 'not_initialized', error: 'raw-secret', robot_name: 'private-name', token: 'private-token', wlan_ip: 'private-address' }));
  assert.deepEqual(result, { version: '1.2.11', wireless: true, state: 'not_initialized', hasError: true });
  assert.doesNotMatch(JSON.stringify(result), /raw-secret|private-/);
  assert.equal(daemonGuidance(result).settings, 'confirmed');
  assert.equal(daemonGuidance(result).oauth, false);
});

test('invalid, oversized and reflected status fields fail without displaying their raw contents', () => {
  for (const text of ['bad raw-secret', 'x'.repeat(16385), 'null', '[]', JSON.stringify({ version: '<raw-secret>', wireless_version: true }), JSON.stringify({ version: '1.2.11', wireless_version: 'true' })]) {
    assert.throws(() => parseDaemonStatus(text), error => { assert.doesNotMatch(error.message, /raw-secret|<|private/); return true; });
  }
  assert.equal(parseDaemonStatus(JSON.stringify({ version: '1.99.0', wireless_version: true, state: 'raw-secret' })).state, null);
});

test('unknown and future versions remain candidate browser routes, not inferred BLE capabilities', () => {
  for (const daemon of [null, { version: '1.99.0', wireless: true }, { version: '1.2.12', wireless: true }]) {
    const guidance = daemonGuidance(daemon);
    assert.equal(guidance.kind, 'unknown'); assert.equal(guidance.settings, 'candidate'); assert.equal(guidance.oauth, false);
    assert.ok(!Object.hasOwn(guidance, 'ready'));
  }
  for (const version of ['1.10.0', '1.11.0']) {
    const guidance = daemonGuidance({ version, wireless: true });
    assert.equal(guidance.kind, 'modern'); assert.equal(guidance.oauth, true); assert.match(guidance.text, /Bluetooth service can differ/);
  }
  assert.equal(daemonGuidance({ version: '1.10.0', wireless: false }).kind, 'lite');
});

test('browser links allow explicit local navigation and reject arbitrary URLs, credentials and escaped paths', () => {
  const host = ['10', '42', '0', '1'].join('.');
  const links = robotBrowserLinks(host);
  assert.deepEqual(links, { dashboard: `http://${host}:8000/`, settings: `http://${host}:8000/settings`, status: `http://${host}:8000/api/daemon/status`, oauth: `http://${host}:8000/api/hf-auth/oauth/begin` });
  assert.equal(robotBrowserLinks('  Reachy-Mini.local  ').settings, 'http://reachy-mini.local:8000/settings');
  for (const invalid of ['javascript:alert(1)', 'example.com', 'http://reachy-mini.local', 'reachy-mini.local:8000', 'user:secret@reachy-mini.local', 'reachy-mini.local/path', 'reachy-mini.local?token=secret', 'reachy-mini.local#fragment', 'reachy-mini.local.evil.invalid', 'reachy_mini.local', [999, 1, 1, 1].join('.'), [8, 8, 8, 8].join('.'), `0${host}`, 'reachy-mini.local\n/evil']) assert.equal(robotBrowserLinks(invalid), null);
});

test('only observed bounded address-report formats produce an untrusted navigation suggestion', () => {
  const host = ['10', '42', '0', '1'].join('.');
  assert.equal(reportedRobotHost(`HOTSPOT [wlan0] ${host}`), host);
  assert.equal(reportedRobotHost('CONNECTED [wlan0] reachy-mini.local'), 'reachy-mini.local');
  for (const value of ['https://evil.invalid/credentials', `OTHER [wlan0] ${host}`, `HOTSPOT [wlan0] ${host}/evil`, 'CONNECTED [wlan0] evil.invalid', 'x'.repeat(513), null]) assert.equal(reportedRobotHost(value), null);
});
