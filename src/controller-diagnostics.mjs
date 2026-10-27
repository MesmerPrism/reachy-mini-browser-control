// A bounded projection of already available state. This module never calls an
// adapter, refreshes telemetry, changes admission, or includes raw error text.
const transports = ['wireless', 'local-bridge', 'simulation'];
const bool = value => typeof value === 'boolean' ? value : null;
const number = value => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? value : null;
const nonnegative = value => number(value) !== null && value >= 0 ? value : null;
const version = value => typeof value === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value) ? value : null;
const pick = (value, allowed, fallback = 'unknown') => allowed.includes(value) ? value : fallback;
const axes = ['yaw', 'pitch', 'roll', 'x', 'y', 'z'];

export function controllerDiagnostics(snapshot = {}, context = {}) {
  const state = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const options = context && typeof context === 'object' ? context : {};
  const inferred = state.ownership === 'session-only' && state.targetAcknowledgement === 'queued-only' ? 'wireless' : 'unknown';
  const transport = pick(options.transport, transports, inferred);
  const wireless = transport === 'wireless';
  const bridge = transport === 'local-bridge';
  const simulation = transport === 'simulation';
  const measured = state.measured;
  const bridgeSnapshot = bridge || (simulation && !measured && !!state.diagnostics?.snapshot);
  const now = options.now === undefined ? Date.now() : nonnegative(options.now);
  const receivedAt = nonnegative(bridgeSnapshot ? state.diagnostics?.snapshot?.startedAt : measured?.receivedAt);
  const age = now !== null && receivedAt !== null ? number(now - receivedAt) : null;
  const receiptAgeMs = age !== null && age >= 0 ? age : null;
  const maxAgeMs = bridgeSnapshot ? 500 : wireless || simulation ? 1500 : null;
  const head = bridgeSnapshot ? { ...state.headAngles, ...state.headPositionMm } : measured?.head;
  const antennas = bridgeSnapshot ? state.antennas : measured?.antennas;
  const running = bridgeSnapshot ? Array.isArray(state.moves) ? state.moves.length > 0 : null : bool(measured?.running);
  const bodyYaw = bridgeSnapshot ? state.bodyYaw : measured?.bodyYaw;
  const present = bridgeSnapshot ? !!state.headAngles || !!state.antennas : !!measured;
  const valid = present ? axes.every(axis => number(head?.[axis]) !== null)
    && ['left', 'right'].every(side => number(antennas?.[side]) !== null)
    && number(bodyYaw) !== null && running !== null
    && (bridgeSnapshot ? ['enabled', 'disabled', 'gravity_compensation'].includes(state.motorMode) : bool(measured?.awake) !== null) : false;
  const fresh = age === null || maxAgeMs === null ? null : age >= 0 && age <= maxAgeMs;
  const connected = bool(state.connected), ready = bool(state.ready);
  const identityVerified = simulation ? null : wireless ? connected === true && typeof state.hardwareId === 'string' && state.hardwareId.length > 0
    : bridge && connected === true && ready === true ? true : null;
  const expectedIdentityMatched = simulation ? null : bool(options.expectedIdentityMatched) ?? (bridge && ready === true && connected === true ? true : null);
  const daemonVersion = version(state.version);
  const versionAdmitted = simulation ? null : daemonVersion !== null ? daemonVersion === '1.10.0' : bridge && ready === true && connected === true ? true : null;
  // The bridge exposes recovery and retained write/fault outcomes, but does not
  // always expose its adapter uncertainty latch. A historical fault alone does
  // not prove a current latch. Unknown remains unknown when not admitted.
  const uncertainOutcome = Object.hasOwn(state, 'uncertain') ? !!state.uncertain
    : bridgeSnapshot && ready === true ? false : null;
  const recoveryRequired = bridgeSnapshot ? Object.hasOwn(state, 'recoveryNeeded') ? !!state.recoveryNeeded : null : null;
  const blockedReasons = [];
  if (connected === false) blockedReasons.push('disconnected');
  if (!present) blockedReasons.push('telemetry-unavailable');
  else if (!valid) blockedReasons.push('telemetry-invalid');
  if (age === null) blockedReasons.push('telemetry-age-unknown');
  else if (age < 0) blockedReasons.push('telemetry-clock-invalid');
  else if (fresh === false) blockedReasons.push('telemetry-stale');
  if (identityVerified === false) blockedReasons.push('identity-unverified');
  if (expectedIdentityMatched === false) blockedReasons.push('identity-mismatch');
  if (versionAdmitted === false) blockedReasons.push('version-not-admitted');
  if (uncertainOutcome === true) blockedReasons.push('uncertain-outcome');
  if (recoveryRequired === true) blockedReasons.push('recovery-required');
  if (running === true) blockedReasons.push('running-move');
  if (ready === false) blockedReasons.push('controller-not-ready');
  return {
    schemaVersion: 1, readOnly: true, transport, connected, ready,
    awake: connected === true && valid && fresh === true ? bool(state.awake) : null, running, version: daemonVersion,
    controlEpoch: Number.isSafeInteger(state.controlEpoch) && state.controlEpoch >= 0 ? state.controlEpoch : null,
    telemetry: { receiptAgeMs, maxAgeMs, valid, fresh, sensorAgeKnown: false },
    admission: { identityVerified, expectedIdentityMatched, versionAdmitted,
      ownershipScope: simulation ? 'simulated' : wireless ? 'session-only' : bridge ? 'bridge-checked' : 'unknown' },
    writes: { armed: bool(options.armed),
      targetAcknowledgement: simulation ? 'simulated' : wireless ? 'queued-only' : 'adapter-dependent',
      uncertainOutcome, recoveryRequired },
    // An HTTP/queue acknowledgement and even measured convergence do not expose
    // the daemon's computed joints, serial result or per-motor goal acceptance.
    // Native pose and joint cache are fetched separately by daemon 1.10.0.
    motionEvidence: {
      headPoseSource: simulation ? 'simulated' : bridge && state.diagnostics?.robotState?.timestampMeaning === 'response-created'
        ? 'joint-forward-kinematics' : 'unknown',
      poseJointSampleCorrelation: simulation ? 'not-applicable' : 'unknown',
      daemonComputedJointTargets: simulation ? 'not-applicable' : 'unavailable',
      serialWriteOutcome: simulation ? 'not-applicable' : 'unknown',
      motorGoalAcceptance: simulation ? 'not-applicable' : 'unknown',
    },
    blockedReasons,
  };
}
