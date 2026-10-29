// Exact hosted Wireless protocol versions audited with the pinned SDK 1.8.0.
// The local bridge and motor experiment campaigns keep their own version gates.
export const WIRELESS_DAEMON_VERSIONS = Object.freeze(['1.10.0', '1.11.0']);
export const WIRELESS_VERSION_LABEL = WIRELESS_DAEMON_VERSIONS.join(' and ');
export const supportsWirelessVersion = version => WIRELESS_DAEMON_VERSIONS.includes(version);
