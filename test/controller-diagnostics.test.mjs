import test from 'node:test';
import assert from 'node:assert/strict';
import { controllerDiagnostics } from '../src/controller-diagnostics.mjs';

function wireless(overrides = {}) {
  return { connected: true, ready: true, awake: true, version: '1.10.0', controlEpoch: 4,
    hardwareId: 'private-hardware', ownership: 'session-only', targetAcknowledgement: 'queued-only', uncertain: null,
    measured: { head: { yaw: 1, pitch: 2, roll: 3, x: 0, y: 0, z: 0 },
      antennas: { left: 0, right: 0 }, bodyYaw: 0, awake: true, running: false, receivedAt: 1000 }, ...overrides };
}

test('hosted diagnostics distinguish receipt freshness, identity obtained and intended identity match', () => {
  const summary = controllerDiagnostics(wireless(), { now: 2500, armed: false });
  assert.equal(summary.readOnly, true);
  assert.equal(summary.transport, 'wireless');
  assert.deepEqual(summary.telemetry, { receiptAgeMs: 1500, maxAgeMs: 1500, valid: true, fresh: true, sensorAgeKnown: false });
  assert.deepEqual(summary.admission, { identityVerified: true, expectedIdentityMatched: null, versionAdmitted: true, ownershipScope: 'session-only' });
  assert.deepEqual(summary.writes, { armed: false, targetAcknowledgement: 'queued-only', uncertainOutcome: false, recoveryRequired: null });
  assert.deepEqual(summary.blockedReasons, []);
  assert.equal(controllerDiagnostics(wireless(), { now: 2501 }).telemetry.fresh, false);
});

test('fresh receipt does not conceal incomplete telemetry, invalid time or an unsupported version', () => {
  const state = wireless({ ready: false, version: '1.11.0' });
  delete state.measured.head.z;
  let summary = controllerDiagnostics(state, { now: 1100, expectedIdentityMatched: false });
  assert.equal(summary.telemetry.valid, false);
  assert.equal(summary.telemetry.fresh, true);
  assert.ok(summary.blockedReasons.includes('telemetry-invalid'));
  assert.ok(summary.blockedReasons.includes('version-not-admitted'));
  assert.ok(summary.blockedReasons.includes('identity-mismatch'));
  summary = controllerDiagnostics(wireless(), { now: 999 });
  assert.equal(summary.telemetry.receiptAgeMs, null);
  assert.equal(summary.telemetry.fresh, false);
  assert.ok(summary.blockedReasons.includes('telemetry-clock-invalid'));
  summary = controllerDiagnostics(wireless(), { now: NaN });
  assert.equal(summary.telemetry.receiptAgeMs, null);
  assert.equal(summary.telemetry.fresh, null);
});

test('uncertain hosted outcome stays a bounded reason without implying bridge recovery', () => {
  const summary = controllerDiagnostics(wireless({ ready: false, uncertain: 'private token and endpoint in raw exception' }), { now: 1100 });
  assert.equal(summary.writes.uncertainOutcome, true);
  assert.equal(summary.writes.recoveryRequired, null);
  assert.ok(summary.blockedReasons.includes('uncertain-outcome'));
  assert.equal(JSON.stringify(summary).includes('private'), false);
});

test('stale and disconnected observations cannot imply asleep or resolve an unknown command outcome', () => {
  // WirelessControl gates snapshot.awake by freshness, so false can also mean
  // expired telemetry, even while the last measurement reported enabled motors.
  const stale = controllerDiagnostics(wireless({ awake: false, ready: false }), { now: 2501 });
  assert.equal(stale.awake, null);
  const asleepState = wireless({ awake: false });
  asleepState.measured.awake = false;
  assert.equal(controllerDiagnostics(asleepState, { now: 1200 }).awake, false);
  for (const transport of ['wireless', 'simulation']) {
    const disconnected = controllerDiagnostics({ connected: false }, { transport, now: 1200 });
    assert.equal(disconnected.awake, null);
    assert.equal(disconnected.writes.uncertainOutcome, null);
    const absent = controllerDiagnostics({}, { transport, now: 1200 });
    assert.equal(absent.awake, null);
    assert.equal(absent.writes.uncertainOutcome, null);
  }
  const disconnectedMeasured = controllerDiagnostics(wireless({ connected: false, awake: false }), { now: 1200 });
  assert.equal(disconnectedMeasured.awake, null);
  const malformed = wireless();
  delete malformed.measured.head.z;
  assert.equal(controllerDiagnostics(malformed, { now: 1200 }).awake, null);
  assert.equal(controllerDiagnostics(wireless({ uncertain: null }), { now: 1200 }).writes.uncertainOutcome, false);
});

test('local bridge uses batch start age and preserves recovery without assuming its absent version', () => {
  const snapshot = { connected: true, ready: false, awake: true, motorMode: 'enabled', moves: [],
    headAngles: { yaw: 1, pitch: 2, roll: 3 }, headPositionMm: { x: 0, y: 0, z: 0 },
    antennas: { left: 0, right: 0 }, bodyYaw: 0, diagnostics: { snapshot: { startedAt: 1000, startAgeMs: 10, readMs: 10 } },
    recoveryNeeded: { reason: 'private exception', automatic: true } };
  const summary = controllerDiagnostics(snapshot, { transport: 'local-bridge', now: 1501 });
  assert.deepEqual(summary.telemetry, { receiptAgeMs: 501, maxAgeMs: 500, valid: true, fresh: false, sensorAgeKnown: false });
  assert.equal(summary.version, null);
  assert.equal(summary.admission.versionAdmitted, null);
  assert.equal(summary.admission.expectedIdentityMatched, null);
  assert.equal(summary.admission.ownershipScope, 'bridge-checked');
  assert.equal(summary.writes.uncertainOutcome, null);
  assert.equal(summary.writes.recoveryRequired, true);
  assert.ok(summary.blockedReasons.includes('recovery-required'));
  assert.equal(JSON.stringify(summary).includes('private'), false);
  const admitted = controllerDiagnostics({ ...snapshot, ready: true, recoveryNeeded: null }, { transport: 'local-bridge', now: 1200 });
  assert.equal(admitted.admission.expectedIdentityMatched, true);
});

test('simulation is explicit and never claims real identity, ownership or acknowledged hardware targets', () => {
  const summary = controllerDiagnostics(wireless(), { transport: 'simulation', now: 1200 });
  assert.equal(summary.transport, 'simulation');
  assert.deepEqual(summary.admission, { identityVerified: null, expectedIdentityMatched: null, versionAdmitted: null, ownershipScope: 'simulated' });
  assert.equal(summary.writes.targetAcknowledgement, 'simulated');
});

test('missing snapshots remain unknown and all public scalars reject unbounded or private inputs', () => {
  for (const snapshot of [undefined, null, {}]) {
    const summary = controllerDiagnostics(snapshot, { now: 1200 });
    assert.equal(summary.transport, 'unknown');
    assert.equal(summary.connected, null);
    assert.equal(summary.admission.identityVerified, null);
    assert.equal(summary.telemetry.fresh, null);
  }
  const snapshot = wireless({ version: 'private.example/1.10.0', controlEpoch: Infinity,
    token: 'private', robotId: 'private', account: 'private', endpoint: 'private', message: 'private',
    diagnostics: { requestFailure: { reason: 'private' }, robotState: { timestamp: 'private', headJoints: ['private'] } } });
  snapshot.measured.head.yaw = Number.MAX_VALUE;
  snapshot.measured.receivedAt = -Infinity;
  snapshot.measured.head.token = 'private';
  const before = structuredClone(snapshot);
  const summary = controllerDiagnostics(snapshot, { transport: 'private', expectedIdentityMatched: 'private', armed: 'private', now: 1200 });
  assert.equal(summary.version, null);
  assert.equal(summary.controlEpoch, null);
  assert.equal(summary.telemetry.valid, false);
  assert.equal(summary.telemetry.receiptAgeMs, null);
  assert.equal(summary.writes.armed, null);
  assert.equal(JSON.stringify(summary).includes('private'), false);
  assert.deepEqual(snapshot, before);
});
