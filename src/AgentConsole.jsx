import { useEffect, useRef, useState } from 'react';
import { AGENT_HELP, createAgentSession, registerAgentTools } from './agent-console.mjs';
import './agent-console.css';

export default function AgentConsole({ snapshot, execute, sessionKey, disabled = false, onDisarm }) {
  const [input, setInput] = useState('status'), [output, setOutput] = useState('Run status to inspect the current connection.'),
    [writes, setWrites] = useState(false), [busy, setBusy] = useState(false);
  const current = useRef({});
  current.current = { snapshot, execute, disabled, sessionKey, onDisarm };
  const session = useRef(null);
  const makeSession = () => createAgentSession({
    context: () => ({ snapshot: current.current.snapshot, key: current.current.sessionKey, disabled: current.current.disabled, visible: !document.hidden }),
    execute: (command, epoch) => current.current.execute(command, epoch),
    onChange: setWrites,
    onDisarm: () => current.current.onDisarm?.(),
  });
  if (!session.current) session.current = makeSession();
  const run = async text => session.current.run(text);
  useEffect(() => { session.current.disarm(); }, [sessionKey, disabled]);
  useEffect(() => {
    session.current = makeSession();
    const mountedSession = session.current;
    const hide = () => { if (document.hidden) session.current.disarm(); };
    document.addEventListener('visibilitychange', hide);
    // The public API is deliberately bounded: no eval, shell, token, connect or
    // network-address command. Agents can explicitly arm without UI clicks.
    const api = Object.freeze({ version: 2, help: () => { mountedSession.isArmed(); return AGENT_HELP; }, status: () => mountedSession.run('status'),
      arm: () => mountedSession.arm(), disarm: () => mountedSession.disarm(), run: async text => mountedSession.run(text) });
    const previous = window.reachyAgent;
    window.reachyAgent = api;
    const unregister = registerAgentTools(document.modelContext || navigator.modelContext, api.run, { arm: api.arm, disarm: api.disarm });
    return () => { mountedSession.dispose(); unregister(); document.removeEventListener('visibilitychange', hide);
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
    <label className="agent-write-option"><input type="checkbox" disabled={disabled} checked={writes && !disabled} onChange={event => {
      try { if (event.target.checked) session.current.arm(); else session.current.disarm(); }
      catch (error) { setOutput(JSON.stringify({ ok: false, error: error.message }, null, 2)); }
    }} />Enable agent writes for this connection</label>
    <pre aria-live="polite" tabIndex={0}>{output}</pre>
    <details><summary>Commands and automation API</summary><code>help · status · capabilities · stop · wake · sleep</code><p><code>head yaw=2 pitch=-2</code><br /><code>antennas left=10 right=-10</code></p><p>Angles are degrees; head x/y/z use millimetres. Omitted axes keep their measured values. Agents can call <code>window.reachyAgent.arm()</code>, then <code>window.reachyAgent.run('wake')</code> or a bounded movement command without cursor clicks. <code>window.reachyAgent.disarm()</code> revokes writes and discards unsent targets; use <code>run('stop')</code> for a software Stop. Disarm does not stop physical movement.</p><p>Arming needs a fresh admitted connection in a visible tab, with tracking and XR stopped. Authorization resets when the connection or control context changes. Browsers supporting WebMCP expose help, status, capabilities, arm, disarm and command tools. No tool signs in or connects automatically.</p></details>
  </details>;
}
