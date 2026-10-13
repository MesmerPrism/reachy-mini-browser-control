import { useId, useState } from 'react';
import { controllerDiagnostics } from '../src/controller-diagnostics.mjs';

const known = value => value === true ? 'Yes' : value === false ? 'No' : 'Unknown';
export default function ControllerDiagnostics({ snapshot, demo = false }) {
  const reportId = useId();
  const [report, setReport] = useState(''), [copyMessage, setCopyMessage] = useState('');
  const context = { transport: demo ? 'simulation' : 'wireless', now: Date.now() };
  const diagnostic = controllerDiagnostics(snapshot, context);
  const prepare = () => {
    const text = JSON.stringify(controllerDiagnostics(snapshot, { ...context, now: Date.now() }), null, 2);
    setReport(text); setCopyMessage('Summary prepared from this tab; no robot request was sent.');
    return text;
  };
  const copy = async () => {
    const text = prepare();
    try { await navigator.clipboard.writeText(text); setCopyMessage('Summary copied. It contains no robot identity, address or credentials.'); }
    catch { setCopyMessage('Clipboard access is unavailable. Select and copy the summary below.'); }
  };
  return <details className="control-section connection-details"><summary>Connection & diagnostics</summary>
    <p>{demo ? 'Simulation only: these values do not verify a physical robot.' : 'This reads the controller’s current snapshot. It does not connect, request new robot state or send commands.'}</p>
    {!demo && snapshot.connected && <p>Check the intended robot’s hardware ID: {snapshot.hardwareId || 'checking'}. This identity is omitted from the copied summary.</p>}
    <dl className="diagnostic-facts">
      <div><dt>Connection</dt><dd>{diagnostic.connected ? 'Connected' : 'Disconnected'}</dd></div>
      <div><dt>Fresh admitted state</dt><dd>{known(diagnostic.ready)}</dd></div>
      <div><dt>Motors awake</dt><dd>{known(diagnostic.awake)}</dd></div>
      <div><dt>Daemon version</dt><dd>{diagnostic.version || 'Unknown'}</dd></div>
      <div><dt>Telemetry received</dt><dd>{diagnostic.telemetry.receiptAgeMs === null ? 'No valid receipt time' : `${diagnostic.telemetry.receiptAgeMs} ms ago`}</dd></div>
      <div><dt>Receipt limit</dt><dd>{diagnostic.telemetry.maxAgeMs ?? 'Unknown'}{diagnostic.telemetry.maxAgeMs === null ? '' : ' ms'}</dd></div>
      <div><dt>Current session outcome lock</dt><dd>{known(diagnostic.writes.uncertainOutcome)}</dd></div>
      <div><dt>Controller ownership</dt><dd>{diagnostic.admission.ownershipScope === 'session-only' ? 'This WebRTC session only' : diagnostic.admission.ownershipScope}</dd></div>
    </dl>
    <p>Receipt age is time since this tab received telemetry; sensor age is unknown. Target frames and Stop are queued, with application unconfirmed. Compare measured feedback and watch Reachy. Session checks cannot independently exclude another robot app. <a href="#use">Transport limits</a>.</p>
    <p>Staged manual head and antenna targets expire after 15 seconds without a new control input. Enabled tracking has its own freshness gates. Expiry discards unsent requests; it does not stop physical movement. Use Stop explicitly when needed.</p>
    <div className="actions"><button type="button" onClick={prepare}>Prepare diagnostic summary</button><button type="button" onClick={() => void copy()}>Copy diagnostic summary</button><a href="#recover">Reconnection guide</a></div>
    {report && <><label className="diagnostic-report" htmlFor={reportId}>Diagnostic summary</label><textarea className="diagnostic-report-text" id={reportId} readOnly value={report} rows={9} spellCheck={false} onFocus={event => event.target.select()} /><p role="status">{copyMessage}</p></>}
  </details>;
}
