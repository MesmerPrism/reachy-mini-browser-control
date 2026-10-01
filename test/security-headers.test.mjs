import test from 'node:test';
import assert from 'node:assert/strict';
import { localPageHeaders } from '../server/security-headers.mjs';

test('loopback page permits its own explicit XR session and capture without cross-origin delegation', () => {
  const headers = localPageHeaders('text/html', 18750);
  const permissions = Object.fromEntries(headers['Permissions-Policy'].split(', ').map(entry => entry.split('=')));
  for (const feature of ['camera', 'microphone', 'xr-spatial-tracking']) assert.equal(permissions[feature], '(self)');
  const csp = Object.fromEntries(headers['Content-Security-Policy'].split(';').map(entry => { const [directive, ...values] = entry.trim().split(/\s+/); return [directive, values]; }));
  assert.deepEqual(csp['connect-src'], ["'self'", 'ws://localhost:18750', 'ws://127.0.0.1:18750']);
  assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
  assert.deepEqual(csp['worker-src'], ["'self'"]);
  assert.equal(headers['Content-Type'], 'text/html');
  assert.equal(headers['Cache-Control'], 'no-store');
});

test('loopback page keeps signaling restricted to the configured port and rejects header injection', () => {
  const headers = localPageHeaders('application/javascript', 18761);
  assert.ok(headers['Content-Security-Policy'].includes('ws://localhost:18761 ws://127.0.0.1:18761'));
  for (const port of [0, 80, 65536, NaN, '18750; connect-src *']) assert.throws(() => localPageHeaders('text/html', port), /Invalid loopback port/);
});
