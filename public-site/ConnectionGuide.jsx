import { useEffect, useRef, useState } from 'react';
import { connectionSteps, probeConnection, mergeConnectionEvidence } from '../src/connection-readiness.mjs';
import { parseDaemonStatus, robotBrowserLinks } from '../src/setup-guidance.mjs';
import { WIRELESS_VERSION_LABEL, supportsWirelessVersion } from '../src/daemon-compatibility.mjs';

export default function ConnectionGuide({ evidence, onEvidence = () => {}, status = {}, progress = 'idle', busy = false, probe = probeConnection, now: sharedNow, method = 'account' }) {
  const [host, setHost] = useState(evidence?.host || 'reachy-mini.local');
  const [localEvidence, setLocalEvidence] = useState(evidence);
  const [checking, setChecking] = useState(false), [error, setError] = useState(''), [now, setNow] = useState(Date.now);
  const revision = useRef(0);
  useEffect(() => { const timer = sharedNow === undefined ? setInterval(() => setNow(Date.now()), 5000) : null; return () => { clearInterval(timer); revision.current++; }; }, []);
  const current = evidence ?? localEvidence;
  const record = next => { const result = mergeConnectionEvidence(current, next); setLocalEvidence(result); onEvidence(result); setNow(Date.now()); };
  const steps = connectionSteps({ evidence: current, status, progress, now: sharedNow ?? now, method });
  const next = steps.find(step => step.state === 'blocked') || steps.find(step => step.state !== 'done');
  const links = robotBrowserLinks(host);
  const locked = busy || checking || status.connected;
  async function check(event) {
    event.preventDefault(); const id = ++revision.current; setError(''); setChecking(true);
    try { const result = await probe(host); if (id === revision.current) record(result); }
    catch (failure) { if (id === revision.current) { record({ host, source: 'address' }); setError(failure.message); } }
    finally { if (id === revision.current) setChecking(false); }
  }
  return <section className="connection-journey" aria-label="Connection steps">
    <h2>Connect your Reachy</h2>
    <p>{method === 'local' ? 'Connect directly to Reachy on the same network. No Hugging Face account, laptop bridge or download is needed. Bluetooth helps find its current address.' : 'Reachy joins a network, then this page opens an account-based control session through Pollen’s service. Bluetooth helps with network setup.'} Browser control supports Wireless daemon {WIRELESS_VERSION_LABEL}.</p>
    <ol className="connection-steps">{steps.map((step, index) => <li key={step.id} data-state={step.state}>
      <h3>{index + 1}. {step.title} <span className="connection-step-state">{step.state === 'done' ? current?.source === 'copied' && step.id === 'version' ? 'Reported version supported' : 'Complete' : step.state === 'blocked' ? 'Needs attention' : 'Not verified'}</span></h3>
      <p>{step.detail}</p>
    </li>)}</ol>
    {next && <p className="connection-next" role="status"><strong>Next: {next.title}.</strong> {next.state === 'blocked' ? 'Resolve this step, then check again.' : 'Follow the steps below; unchecked local facts stay unverified.'}</p>}
    {!status.connected && <>
      <form className="connection-form connection-check" onSubmit={check}>
        <label htmlFor="connection-robot-host">Robot hostname or local IP address</label>
        <div className="connection-check-fields"><input id="connection-robot-host" value={host} maxLength={253} autoComplete="off" spellCheck={false} disabled={locked} onChange={event => { revision.current++; setHost(event.target.value); record({ source: 'address', host: event.target.value, resetIdentity: true }); setError(''); }} />
          <button disabled={locked || !links}>{checking ? 'Checking robot…' : 'Check this robot'}</button></div>
        <p>Optional read-only check. Use the current address from Bluetooth setup or Reachy Mini Control. Nothing connects, scans or moves automatically.</p>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {links && <div className="robot-links"><a href={links.dashboard} target="_blank" rel="noopener noreferrer">Open Reachy’s robot page</a><a href={links.status} target="_blank" rel="noopener noreferrer">Open daemon status</a>{method === 'account' && supportsWirelessVersion(current?.version) && <a href={links.oauth} target="_blank" rel="noopener noreferrer">Sign Reachy into Hugging Face</a>}</div>}
      {method === 'account' ? <><p>After signing in with Reachy Mini Control, enable remote access and close its active control session. Keep Reachy online.</p>
      <p><a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">Create a Hugging Face read token</a>. Review its permissions yourself. The token field clears when connection starts. The SDK keeps the token in memory for this session; disconnect or close the tab to clear it.</p></> : <p>Close competing control sessions first. Local connection uses Reachy’s existing WebRTC service. If this browser blocks local WebSockets from HTTPS, use a supported browser or switch to account access; do not disable browser security.</p>}
      <details><summary>Browser cannot read the local robot?</summary>
        <p>HTTPS browser protections or local-network permissions can block a local HTTP check. Open the daemon status link, copy its JSON, and check it here. Copied status is reported evidence; the control session must still verify identity, version and fresh telemetry. Remote access can work without a local check.</p>
        <form className="connection-form" onSubmit={event => {
          event.preventDefault(); setError('');
          try { const raw = new FormData(event.currentTarget).get('copied-connection-status'); const reported = parseDaemonStatus(raw); record({ ...reported, host, source: 'copied' }); event.currentTarget.reset(); }
          catch (failure) { record({ host, source: 'address' }); setError(failure.message); }
        }}>
          <label htmlFor="copied-connection-status">Copied daemon status JSON</label><textarea id="copied-connection-status" name="copied-connection-status" maxLength={16384} rows={4} disabled={locked} />
          <button disabled={locked}>Check copied status</button>
        </form>
      </details>
      <p>Still need a network or address? <a href="#setup">Find Reachy with Bluetooth or configure Wi-Fi</a>. Local checks are kept in this page’s memory, expire after two minutes, and reset when the address changes.</p>
    </>}
  </section>;
}
