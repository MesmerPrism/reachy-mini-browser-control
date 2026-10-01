import { useEffect, useRef, useState } from 'react';
import { AGENT_HELP, registerAgentTools, runAgentCommand } from './agent-console.mjs';
import './agent-console.css';

export default function AgentConsole({ snapshot, execute, sessionKey, disabled = false }) {
  const [input, setInput] = useState('status'), [output, setOutput] = useState('Run status to inspect the current connection.'),
    [writes, setWrites] = useState(false), [busy, setBusy] = useState(false);
  const current = useRef({});
  current.current = { snapshot, execute, writes: writes && !disabled, sessionKey };
  const run = async text => {
    const c = current.current;
    return runAgentCommand(text, { snapshot: c.snapshot, writesAllowed: c.writes && !document.hidden, execute: c.execute });
  };
  useEffect(() => { setWrites(false); }, [sessionKey, disabled]);
  useEffect(() => {
    const hide = () => { if (document.hidden) { current.current.writes = false; setWrites(false); } };
    document.addEventListener('visibilitychange', hide);
    // The public API is deliberately bounded: no eval, shell, token, connect or
    // network-address command. Write authorization belongs to this tab's UI.
    const api = Object.freeze({ version: 1, help: () => AGENT_HELP, status: () => run('status'), run: text => run(text) });
    const previous = window.reachyAgent;
    window.reachyAgent = api;
    const unregister = registerAgentTools(document.modelContext || navigator.modelContext, text => run(text));
    return () => { current.current.writes = false; unregister(); document.removeEventListener('visibilitychange', hide);
      if (window.reachyAgent === api) { if (previous) window.reachyAgent = previous; else delete window.reachyAgent; } };
  }, []);
  const submit = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true);
    try { const result = await run(input); setOutput(JSON.stringify(result, null, 2)); }
    catch (error) { setOutput(JSON.stringify({ ok: false, error: error.message }, null, 2)); }
    finally { setBusy(false); }
  };
  return <details className="agent-console"><summary>Agent console</summary>
    <p>Run bounded commands in this page. Status is read-only. This is a controller console, not a computer shell.</p>
    <form onSubmit={submit}><label htmlFor="reachy-agent-command">Command</label><div className="agent-command-line"><input id="reachy-agent-command" autoComplete="off" spellCheck={false} value={input} maxLength={512} onChange={event => setInput(event.target.value)} /><button disabled={busy} type="submit">{busy ? 'Running…' : 'Run'}</button></div></form>
    <label className="agent-write-option"><input type="checkbox" disabled={disabled} checked={writes && !disabled} onChange={event => setWrites(event.target.checked)} />Enable agent writes for this connection</label>
    <pre aria-live="polite" tabIndex={0}>{output}</pre>
    <details><summary>Commands and automation API</summary><code>help · status · capabilities · stop · wake · sleep</code><p><code>head yaw=2 pitch=-2</code><br /><code>antennas left=10 right=-10</code></p><p>Angles are degrees; head x/y/z use millimetres. Omitted axes keep their measured values. Automation can use <code>window.reachyAgent.run('status')</code>. Browsers supporting WebMCP also expose read-only help, status and capabilities.</p></details>
  </details>;
}
