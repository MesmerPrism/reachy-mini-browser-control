import { useEffect, useRef, useState } from 'react';
import { createRobotUpdateClient, RobotUpdateError } from '../src/robot-update.mjs';

const descriptions = {
  idle: 'Check Reachy’s software before continuing to browser control.', checking: 'Checking Reachy and available software…',
  unavailable: 'The software check did not complete. Use Reachy’s status page to check its current version, or try this read-only check again.',
  offered: 'A stable update is available. Keep Reachy powered and connected to the internet.', current: 'Reachy reports no newer stable update.',
  unsupported: 'This page cannot start an update for the reported software or robot state. Use Reachy’s own settings if an update is needed.',
  submitted: 'Update requested. Keep Reachy powered. Use the buttons below to check progress and verify its version afterwards.',
  updating: 'Reachy reports that the update is in progress.', failed: 'Reachy reports a failed update. Use its settings or official Control app for recovery.',
  unconfirmed: 'Installation is not confirmed. Check Reachy’s software version after it restarts.',
  unknown: 'The update outcome is unknown. It will not be requested again. Check Reachy after its restart.',
  confirmed: 'Reachy now reports the offered software version and a healthy status. Browser control compatibility is checked separately.',
  reported: 'The pasted status reports the offered version and a healthy status. This is your reported result; browser control is checked separately.',
};
export default function RobotUpdate({ host, attempt = null, onAttempt = () => {}, onDaemon = () => {}, createClient = createRobotUpdateClient }) {
  const [state,setState]=useState({phase:'idle'}),[error,setError]=useState(''),[acknowledged,setAcknowledged]=useState(false);
  const client=useRef(null),epoch=useRef(0),receipt=useRef(attempt),callbacks=useRef({onAttempt,onDaemon});
  callbacks.current={onAttempt,onDaemon}; if(attempt)receipt.current=attempt;
  useEffect(()=>{const id=++epoch.current;setError('');setAcknowledged(false);
    try {const selected=createClient({host,attempt:receipt.current,onChange:next=>{if(epoch.current!==id)return;setState(next);if(next.attempt){receipt.current=next.attempt;callbacks.current.onAttempt(next.attempt);}if(next.daemon)callbacks.current.onDaemon(next.daemon);}});client.current=selected;setState(selected.snapshot());}
    catch(failure){client.current=null;setState({phase:'idle'});setError(failure instanceof RobotUpdateError?failure.message:'The update check could not be prepared.');}
    return()=>{if(epoch.current===id)epoch.current++;client.current?.dispose();client.current=null;};
  },[host,createClient]);
  async function run(action){const selected=client.current,id=epoch.current;if(!selected || selected.snapshot().active)return;setError('');try{await action(selected);}catch(failure){if(epoch.current===id)setError(failure instanceof RobotUpdateError?failure.message:'The update check did not complete.');}}
  return <div className="connection-form">
    <h4>Update Reachy’s software</h4>
    <p>Newer software enables Reachy’s current sign-in and browser connection. Keep Reachy powered with internet access. Stop the motion daemon before checking for an update. Keep this setup tab loaded so its update receipt is retained.</p>
    <p className="status" role="status" aria-live="polite">{descriptions[state.phase] || descriptions.unknown}</p>
    {state.daemon && <p>Reported software: {state.daemon.version} · {state.daemon.state || 'unknown state'}.</p>}
    {!state.attempted && <button type="button" disabled={!client.current || state.active} onClick={()=>run(selected=>selected.check())}>Check for software update</button>}
    {state.offer && !state.attempted && <>
      <p>Offered stable version: <strong>{state.offer}</strong>. Reachy’s older updater installs the latest stable version available when installation begins; it cannot pin this version.</p>
      <label><input type="checkbox" checked={acknowledged} disabled={state.active} onChange={event=>setAcknowledged(event.target.checked)} /> I am ready to update this Reachy and keep it powered during its restart.</label>
      <button type="button" className="primary" disabled={!state.ready || !acknowledged} onClick={()=>{setAcknowledged(false);run(selected=>selected.start());}}>Start software update</button>
    </>}
    {state.attempted && <>
      <div className="actions">{state.attempt?.jobId && <button type="button" disabled={state.active || ['confirmed','reported'].includes(state.phase)} onClick={()=>run(selected=>selected.checkProgress())}>Check update progress</button>}<button type="button" disabled={state.active} onClick={()=>run(selected=>selected.verify())}>Verify installed software</button></div>
      {state.addressChanged && <p>This check uses the new address you provided. Confirm it belongs to your Reachy; an address and version alone do not verify robot identity.</p>}
      <p>A completed update task alone does not confirm installation. Reachy may restart and its newer software may prevent this page from reading its status.</p>
      <form onSubmit={event=>{event.preventDefault();const text=new FormData(event.currentTarget).get('update-status');event.currentTarget.reset();run(selected=>selected.verifyPasted(text));}}>
        <label htmlFor="update-status">If automatic verification fails, open Reachy’s status page and paste its JSON here</label>
        <textarea id="update-status" name="update-status" rows={4} maxLength={16384} required autoComplete="off" spellCheck={false} disabled={state.active} />
        <button disabled={state.active}>Check pasted software status</button>
      </form>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
    {state.links && <div className="actions"><a href={state.links.status} target="_blank" rel="noreferrer">Open Reachy status</a><a href={state.links.settings} target="_blank" rel="noreferrer">Open Reachy Settings</a></div>}
    <p>For an unsuccessful update or a robot that does not return, use the official Reachy Mini Control app and <a href="https://huggingface.co/docs/reachy_mini/troubleshooting" target="_blank" rel="noreferrer">recovery guidance</a>. This step does not sign in to Hugging Face or enable motion.</p>
  </div>;
}
