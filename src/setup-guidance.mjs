// Browser navigation only. No fetch, storage, credential handling, or robot commands.
const statusStates = new Set(['not_initialized', 'starting', 'running', 'stopping', 'stopped', 'error']);
export function parseDaemonStatus(text) {
  if (typeof text !== 'string' || text.length > 16384) throw Error('Paste the JSON from the robot’s daemon status page (up to 16 KB).');
  let value;
  try { value = JSON.parse(text); } catch { throw Error('The status must be valid JSON. Copy the full response from the robot’s status page.'); }
  if (!value || Array.isArray(value) || typeof value !== 'object'
    || typeof value.version !== 'string' || !/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:[-+][A-Za-z0-9.-]{1,32})?$/.test(value.version)
    || typeof value.wireless_version !== 'boolean') throw Error('This response needs a daemon version and a boolean wireless_version field.');
  // Pick only bounded public facts; never retain names, addresses, raw errors,
  // tokens, or unrelated fields from a pasted robot response.
  return { version: value.version, wireless: value.wireless_version,
    state: statusStates.has(value.state) ? value.state : null, hasError: value.error != null };
}

export function daemonGuidance(daemon) {
  if (!daemon) return { kind: 'unknown', settings: 'candidate', oauth: false,
    text: 'Daemon version unknown. Try the robot’s Settings page, then its dashboard if Settings has no Wi-Fi controls.' };
  if (!daemon.wireless) return { kind: 'lite', settings: 'unavailable', oauth: false,
    text: 'This response identifies a Lite or non-wireless daemon. Use the local controller for USB setup.' };
  if (daemon.version === '1.2.11') return { kind: 'legacy', settings: 'confirmed', oauth: false,
    text: 'Stock daemon 1.2.11 includes robot-hosted Wi-Fi Settings. Its bundled Bluetooth source predates encrypted provisioning; the installed Bluetooth service can differ. Its sign-in flow also differs from the current browser controller.' };
  if (['1.10.0', '1.11.0'].includes(daemon.version)) return { kind: 'modern', settings: 'candidate', oauth: true,
    text: `Daemon ${daemon.version} source includes encrypted provisioning and browser sign-in. The installed Bluetooth service can differ; use the observed checks to decide whether Bluetooth setup works.` };
  return { kind: 'unknown', settings: 'candidate', oauth: false,
    text: `Daemon ${daemon.version} has not been checked for this setup helper. Try the robot’s own browser pages; a timeout does not establish which setup commands it supports.` };
}

export function robotBrowserLinks(host) {
  if (typeof host !== 'string') return null;
  const clean = host.trim().toLowerCase();
  const octets = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(clean) ? clean.split('.').map(Number) : null;
  const privateIp = octets && octets.every(n => n >= 0 && n <= 255)
    && (octets[0] === 10 || (octets[0] === 192 && octets[1] === 168)
      || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
      || (octets[0] === 169 && octets[1] === 254))
    && clean === octets.join('.');
  const localName = clean.length <= 253 && clean.endsWith('.local')
    && clean.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
  if (!privateIp && !localName) return null;
  const base = `http://${clean}:8000`;
  return { dashboard: `${base}/`, settings: `${base}/settings`, status: `${base}/api/daemon/status`, oauth: `${base}/api/hf-auth/oauth/begin` };
}

export function reportedRobotHost(network) {
  if (typeof network !== 'string' || network.length > 512) return null;
  // Address is a navigation suggestion, not trusted robot identity. Restrict
  // extraction to the observed status format, never arbitrary URLs or schemes.
  const match = /^(?:HOTSPOT|CONNECTED) \[[\w.-]+\] ([\w.-]+)$/.exec(network.trim());
  return match && robotBrowserLinks(match[1]) ? match[1] : null;
}
