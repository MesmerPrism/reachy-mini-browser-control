// Browser capability inspection only. Never opens a chooser or contacts a robot.
export const BLUETOOTH_BROWSER_HELP = 'Use desktop Chrome or Edge, or Chrome on Android. Brave commonly blocks Web Bluetooth on desktop; Safari, Firefox and iPhone browsers usually do not expose it. Availability also depends on your operating system, adapter and browser policy.';

function bounded(operation, timeoutMs) {
  let timer;
  return Promise.race([
    Promise.resolve().then(operation),
    new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Capability check timed out')), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
}

export async function inspectBrowserBluetooth({ navigator = globalThis.navigator, secureContext = globalThis.isSecureContext, timeoutMs = 1500 } = {}) {
  if (!secureContext) return { kind: 'insecure', message: 'Bluetooth needs HTTPS or localhost. Open the hosted page directly in a supported browser.', brave: false };
  let bluetooth;
  try { bluetooth = navigator?.bluetooth; } catch { /* Browser policy can hide the API. */ }
  let brave = false;
  try { if (typeof navigator?.brave?.isBrave === 'function') brave = await bounded(() => navigator.brave.isBrave(), timeoutMs) === true; } catch { /* A brand hint is not a capability gate. */ }
  if (typeof bluetooth?.requestDevice !== 'function') return { kind: 'unsupported', brave, message: brave ? 'Brave is not exposing Web Bluetooth here. Open this recovery page in desktop Chrome or Edge, or use Reachy Mini Control.' : 'This browser does not expose Web Bluetooth. Use a supported browser or Reachy Mini Control.' };
  if (typeof bluetooth.getAvailability !== 'function') return { kind: 'unknown', brave, message: 'The browser exposes a Bluetooth chooser, but adapter availability cannot be checked. Discovery and robot compatibility remain unverified.' };
  try {
    const available = await bounded(() => bluetooth.getAvailability(), timeoutMs);
    if (available === false) return { kind: 'unavailable', brave, message: brave ? 'Brave reports Bluetooth unavailable. Its policy may block access; try desktop Chrome or Edge, or Reachy Mini Control.' : 'The browser reports Bluetooth unavailable. Check the adapter and OS Bluetooth setting, or use Reachy Mini Control.' };
    if (available !== true) return { kind: 'unknown', brave, message: 'The browser did not report a definite Bluetooth availability result. Use the official console to check discovery explicitly.' };
    return { kind: 'available', brave, message: 'The browser reports Bluetooth available. This does not verify discovery, the selected robot or its restart service. The official console opens its chooser only when you choose to connect.' };
  } catch {
    return { kind: 'unknown', brave, message: 'Bluetooth availability could not be checked. Browser permissions or policy may block it. Try a supported browser or Reachy Mini Control.' };
  }
}
