// The loopback app admits only its own capture and XR context. Browser consent
// and the explicit XR session button still govern access; no iframe delegation.
export function localPageHeaders(mime, port) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid loopback port');
  return {
    'Content-Type': mime,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': 'camera=(self), microphone=(self), xr-spatial-tracking=(self)',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:" + port + ' ws://127.0.0.1:' + port + "; media-src 'self' blob:; img-src 'self' data:; frame-ancestors 'none'",
  };
}
