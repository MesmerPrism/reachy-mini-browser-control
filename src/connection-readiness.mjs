import { robotBrowserLinks, reportedRobotHost } from './setup-guidance.mjs';
import { supportsWirelessVersion, WIRELESS_VERSION_LABEL } from './daemon-compatibility.mjs';

export const CONNECTION_CHECK_MAX_AGE_MS = 120000;
const identity = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : null;
const boolean = value => typeof value === 'boolean' ? value : null;

export function bluetoothConnectionEvidence(observed, now = Date.now()) {
  const host = reportedRobotHost(observed?.network);
  return host ? { source: 'bluetooth', host, hardwareId: identity(observed.hardwareId), checkedAt: now } : null;
}

export function mergeConnectionEvidence(previous, next) {
  if (!next) return null;
  const { resetIdentity, ...value } = next;
  const sameHost = !!robotBrowserLinks(previous?.host) && robotBrowserLinks(previous.host).dashboard === robotBrowserLinks(next.host)?.dashboard;
  const oldIdentity = identity(previous?.expectedHardwareId) || (['live','bluetooth'].includes(previous?.source) ? identity(previous.hardwareId) : null);
  const selected = next.source === 'bluetooth' ? identity(next.hardwareId) : null;
  const pin = resetIdentity ? null : selected || (sameHost ? oldIdentity : null) || (next.source === 'live' ? identity(next.hardwareId) : null);
  return { ...value, expectedHardwareId: pin };
}

async function read(fetchImpl, url) {
  const response = await fetchImpl(url, { method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw Error('Unavailable robot check');
  const value = typeof response.text === 'function' ? JSON.parse(await response.text()) : await response.json();
  if (!value || Array.isArray(value) || typeof value !== 'object' || JSON.stringify(value).length > 16384) throw Error('Unsupported robot check');
  return value;
}

// Explicit invocation only. No discovery, write, credentials, redirect or storage.
export async function probeConnection(host, { fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  const links = robotBrowserLinks(host);
  if (!links) throw Error('Enter a private local IP or .local hostname, without a scheme, port or path.');
  let daemon;
  try { daemon = await read(fetchImpl, links.status); }
  catch { throw Error('The browser could not read Reachy. Check the address and network, and allow local-network access if prompted. You can also open its status page and check a copied response below.'); }
  const version = typeof daemon.version === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(daemon.version) ? daemon.version : null;
  const base = new URL(links.dashboard).origin;
  const optional = await Promise.allSettled(['/api/hf-auth/status', '/api/hf-auth/relay-status'].map(path => read(fetchImpl, base + path)));
  const auth = optional[0].status === 'fulfilled' ? optional[0].value : {};
  const relay = optional[1].status === 'fulfilled' ? optional[1].value : {};
  return { source: 'live', host: new URL(base).hostname, checkedAt: now(), reachable: true, version,
    hardwareId: identity(daemon.hardware_id), wireless: boolean(daemon.wireless_version),
    ready: daemon.state === 'running' && daemon.backend_status?.ready === true,
    hasError: daemon.error != null || daemon.backend_status?.error != null,
    loggedIn: boolean(auth.is_logged_in), relayConnected: boolean(relay.is_connected) };
}

export function connectionSteps({ evidence, status = {}, progress = 'idle', now = Date.now() } = {}) {
  const active = status.connected && !!status.hardwareId && supportsWirelessVersion(status.version);
  const age = evidence?.source === 'live' ? now - evidence.checkedAt : Infinity;
  const fresh = age >= 0 && age <= CONNECTION_CHECK_MAX_AGE_MS;
  const reached = active || fresh && evidence.reachable;
  const knownVersion = active ? status.version : evidence?.version;
  const accountViaSession = active || ['selecting', 'negotiating', 'verifying', 'connected'].includes(progress);
  const network = { id: 'network', title: 'Reach the robot', state: reached ? 'done' : 'unknown',
    detail: active ? 'The browser has a live connection to Reachy.' : fresh ? `Robot replied${evidence.hardwareId ? ` · identity ${evidence.hardwareId}` : ''}.` : evidence?.source === 'copied' ? 'Copied status cannot verify a current network connection. Check this robot when it is reachable.' : evidence?.source === 'bluetooth' ? 'Bluetooth identified Reachy and reported the address below. Check this robot to verify network access.' : 'Use Bluetooth setup to find its address, or enter an address below. A local check is optional for account-based remote access.' };
  const identityMatches = !evidence?.expectedHardwareId || evidence.hardwareId === evidence.expectedHardwareId;
  const compatible = active || supportsWirelessVersion(knownVersion) && evidence?.wireless === true && (evidence.source === 'copied' || fresh && evidence.hardwareId && identityMatches && evidence.ready && !evidence.hasError);
  const version = { id: 'version', title: 'Check compatibility', state: compatible ? 'done' : fresh || evidence?.source === 'copied' ? 'blocked' : 'unknown',
    detail: compatible ? `${active || fresh ? 'Verified' : 'Reported'} Wireless daemon ${knownVersion}.` : fresh && !identityMatches ? 'This address identifies a different robot from the one checked before. Select the intended robot again or correct its address.' : knownVersion && !supportsWirelessVersion(knownVersion) ? `Daemon ${knownVersion} is not supported. Browser control supports ${WIRELESS_VERSION_LABEL}. Use Reachy's own tools for this version.` : fresh ? 'A ready Wireless daemon and valid hardware identity are required. Inspect the robot in Reachy Mini Control.' : `Supports Wireless daemon ${WIRELESS_VERSION_LABEL}. The selected session checks its own identity and version again.` };
  const account = { id: 'account', title: 'Enable account access', state: accountViaSession || fresh && evidence.loggedIn === true && evidence.relayConnected === true ? 'done' : fresh && (evidence.loggedIn === false || evidence.relayConnected === false) ? 'blocked' : 'unknown',
    detail: accountViaSession ? 'Pollen’s service accepted the browser account and returned a robot.' : fresh && evidence.loggedIn === false ? 'Sign in to Hugging Face in Reachy Mini Control, then enable remote access for this robot.' : fresh && evidence.relayConnected === false ? 'The remote relay is not connected. Enable remote access and check sign-in and internet in Reachy Mini Control.' : fresh && evidence.loggedIn === true && evidence.relayConnected === true ? 'Reachy is signed in and its remote relay is connected. Use a read token from that same account.' : 'Use Reachy Mini Control to sign the robot into Hugging Face and enable remote access. The token below must belong to the same account. Missing local checks do not prevent remote connection.' };
  const session = { id: 'session', title: 'Connect this browser', state: status.ready && active ? 'done' : progress === 'failed' ? 'blocked' : 'unknown',
    detail: status.ready && active ? `Identity, daemon and fresh telemetry verified. ${status.awake ? 'Reachy is awake.' : 'Reachy is asleep. Wake is a separate action.'}` : active ? 'Session connected; waiting for fresh, complete robot telemetry.' : progress === 'failed' ? 'Connection did not complete. Use the error below to resolve the blocker, then start a new connection.' : 'Enter a read token, allow the Pollen connection, and select the intended robot. Connecting does not wake or move it.' };
  return [network, version, account, session];
}
