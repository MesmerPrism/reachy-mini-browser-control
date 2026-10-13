import { useEffect, useRef, useState } from 'react';
import { BLUETOOTH_BROWSER_HELP, inspectBrowserBluetooth } from '../src/browser-bluetooth.mjs';
import { parseDaemonStatus, robotBrowserLinks } from '../src/setup-guidance.mjs';

export default function RecoveryGuide({ inspectBluetooth = inspectBrowserBluetooth } = {}) {
  const [host, setHost] = useState('reachy-mini.local');
  const [observation, setObservation] = useState('unchecked');
  const [comparison, setComparison] = useState('unchecked');
  const [daemon, setDaemon] = useState(null), [statusError, setStatusError] = useState('');
  const [bluetooth, setBluetooth] = useState(null), [checking, setChecking] = useState(false);
  const generation = useRef(0);
  const links = robotBrowserLinks(host);
  useEffect(() => () => { generation.current++; }, []);
  const checkBluetooth = async () => {
    const request = ++generation.current; setChecking(true);
    try { const result = await inspectBluetooth(); if (request === generation.current) setBluetooth(result); }
    catch { if (request === generation.current) setBluetooth({ kind: 'unknown', message: 'The browser check could not finish. Use a supported browser or Reachy Mini Control.' }); }
    finally { if (request === generation.current) setChecking(false); }
  };
  return <section className="recovery-guide" aria-labelledby="recovery-title">
    <h2 id="recovery-title">Reconnect an unresponsive Reachy</h2>
    <p>If Reachy still moves or breathes but the controller cannot reconnect, check its connection before repeating commands. A raised head, a saved router entry or Bluetooth’s “CONNECTED” label does not prove the daemon is reachable.</p>
    <ol className="recovery-steps">
      <li><h3>Check the current address</h3>
        <p>Keep Reachy powered and put this device on the same Wi-Fi. Check your router’s currently connected devices for its address. Close competing controllers and robot apps.</p>
        <label htmlFor="recovery-host">Robot hostname or private local IP</label>
        <input id="recovery-host" value={host} onChange={event => { setHost(event.target.value); setObservation('unchecked'); setComparison('unchecked'); setDaemon(null); setStatusError(''); }} autoComplete="off" spellCheck={false} maxLength={253} aria-describedby="recovery-host-help" />
        <p id="recovery-host-help">Enter just the host, such as <code>reachy-mini.local</code>. This creates read-only status links; it does not scan or contact the robot.</p>
        {links ? <div className="robot-links"><a href={links.status} target="_blank" rel="noopener noreferrer">Open robot status</a><a href={links.dashboard} target="_blank" rel="noopener noreferrer">Open robot page</a></div> : <p className="error" role="alert">Use a private local IP or .local hostname, without a scheme, port or path.</p>}
        <fieldset><legend>What happens in the robot status tab?</legend>
          {[['unchecked', 'I have not checked yet'], ['responds', 'JSON appears'], ['unreachable', 'It times out or fails']].map(([value, label]) => <label className="checkbox" key={value}><input type="radio" name="recovery-observation" value={value} checked={observation === value} onChange={() => { setObservation(value); setComparison('unchecked'); setDaemon(null); setStatusError(''); }} />{label}</label>)}
        </fieldset>
        {observation === 'responds' && <div className="recovery-result" role="status"><p>The local daemon answered. If this hosted controller still fails, check the account, read token, remote-access setting and other sessions in Reachy Mini Control. Hosted WebRTC and the local status page are separate connections.</p>
          <details><summary>Check the daemon version from that response</summary><form className="connection-form" onSubmit={event => {
            event.preventDefault(); const text = new FormData(event.currentTarget).get('recovery-status'); event.currentTarget.reset();
            try { setDaemon(parseDaemonStatus(text)); setStatusError(''); } catch (error) { setDaemon(null); setStatusError(error.message); }
          }}><label htmlFor="recovery-status">Copy fresh daemon status JSON</label><textarea id="recovery-status" name="recovery-status" rows={4} maxLength={16384} required autoComplete="off" spellCheck={false} /><button>Check copied status</button></form>
          <p>Only version, model type and the status summary stay in this tab. This copied response does not admit motion or verify identity.</p>
          {statusError && <p className="error" role="alert">{statusError}</p>}
          {daemon && <p role="status">Daemon {daemon.version}, {daemon.wireless ? 'Wireless' : 'Lite / non-wireless'}, state {daemon.state || 'unknown'}.{daemon.hasError ? ' The robot reports an error; inspect it in its own tools.' : ''} {daemon.wireless && daemon.version === '1.10.0' ? 'The version is admitted, but a new connection still needs identity and fresh telemetry checks.' : 'This robot is not admitted for hosted control. Keep using robot-owned tools; updating firmware is a separate decision.'}</p>}
          </details></div>}
        {observation === 'unreachable' && <div className="recovery-result">
          <p>If <code>reachy-mini.local</code> fails, try the router’s current numeric address. Open the same status address on another device using the same Wi-Fi, with mobile data and VPN routing disabled for that check. A timeout alone cannot distinguish a daemon failure from a network problem.</p>
          <fieldset><legend>Does that current address answer on another device?</legend>
            {[['unchecked', 'Not checked / no second device'], ['responds', 'JSON appears on the other device'], ['unreachable', 'The other device also cannot reach it']].map(([value, label]) => <label className="checkbox" key={value}><input type="radio" name="recovery-comparison" value={value} checked={comparison === value} onChange={() => setComparison(value)} />{label}</label>)}
          </fieldset>
          <p role="status">{comparison === 'responds' ? 'The daemon answers from another device. Check this device’s Wi-Fi, VPN and browser local-network permission; open the robot page directly. Keep browser security enabled. Restarting the robot is not the first step for a device-specific failure.' : comparison === 'unreachable' ? 'Both devices fail to reach the current address. Check the router’s live connection entry and use a recovery option below. Wi-Fi can remain connected while the robot’s local network route is broken; these observations alone do not diagnose that fault.' : 'The cause is still unknown. You can use an attended recovery option below, then recheck the current status address.'}</p>
        </div>}
      </li>
      <li><h3>Choose a recovery option</h3>
        <p>Stay beside Reachy during recovery: a daemon restart or power cycle may produce Sleep/Wake motion. These are separate from the controller’s software Stop.</p>
        <details className="recovery-option"><summary>Restart the daemon over Bluetooth</summary>
          <p>{BLUETOOTH_BROWSER_HELP} You can keep this computer on its current Wi-Fi. Browser-only motion control itself does not require Web Bluetooth.</p>
          <button type="button" onClick={() => void checkBluetooth()} disabled={checking}>{checking ? 'Checking browser…' : 'Check this browser’s Bluetooth'}</button>
          {bluetooth && <p className="status" role="status" aria-live="polite" data-bluetooth-result={bluetooth.kind}>{bluetooth.message}</p>}
          <p>In a supported browser, open Pollen’s <a href="https://pollen-robotics.github.io/reachy_mini/" target="_blank" rel="noopener noreferrer">official Bluetooth console</a>. This check does not open a chooser or send robot commands.</p>
          <ol><li>Select the Reachy in front of you and check its reported identity.</li><li>Enter its PIN in that official console: the last five digits of the robot’s serial number, keeping leading zeros. A “Contains FCC ID” label is not its serial number.</li><li>While watching Reachy, explicitly choose <strong>Restart daemon</strong> once. A lost or failed reply may occur after the restart has already run. Wait for it to return, then check the robot status tab before deciding on another action.</li></ol>
          <p>If Bluetooth is blocked, use Reachy Mini Control on your computer: <strong>First time WiFi setup → Try the Bluetooth Console</strong>. Some versions call the first link “First time connecting to your WiFi…”. A missing Bluetooth advertisement or a failed connection can also prevent this recovery route.</p>
          <p>A daemon restart can run successfully while the robot’s OS networking remains broken. In our investigated routing failure it did not restore access. If status stays unreachable, use the physical restart option or seek network diagnostics; repeated daemon restarts are not a repair for that condition.</p>
          <p>Wi-Fi reset, software reset and firmware update are different operations and are not needed just to retry a connection.</p>
        </details>
        <details className="recovery-option"><summary>Power-cycle the robot</summary>
          <ol><li>Use Reachy’s power OFF control so its embedded computer restarts; an ordinary Sleep/Wake action is not a power cycle.</li><li>Wait at least <strong>five seconds</strong>, then power it ON.</li><li>Allow time to boot while observing the robot, then open its current status address again. Startup can take longer than a minute; a delayed reply is not a reason to restart repeatedly. Recheck the router if the address changed.</li></ol>
          <p>A previous attended session recovered connectivity after a physical power cycle. A recurring networking fault still needs diagnosis; this does not mean every Sleep needs a reboot.</p>
        </details>
        <details className="recovery-option"><summary>Wi-Fi is connected, but status still fails</summary>
          <p>In an October 13 investigation, Reachy retained its Wi-Fi connection and address but lost the OS route needed to talk to devices on the local IPv4 network. NetworkManager reported an address-conflict state. Controlled route changes restored access, while restarting the daemon did not repair that network state.</p>
          <p>The original conflict trigger is still unknown. The conflict report alone does not prove another device used the same address. A timeout or Bluetooth “CONNECTED” label cannot identify this fault from the browser.</p>
          <p>A network-specific persistent route workaround survived one verified reboot. It can also bypass protection during a real address conflict, so it needs an operator’s network diagnosis and rollback plan. Do not copy another robot’s route settings or disable conflict detection.</p>
          <p>A candidate NetworkManager recovery patch passed isolated Linux tests and has not been installed on the robot. The lasting repair belongs in the robot’s networking software. This page provides guidance; it cannot change OS routes or install that patch. Read the <a href="./source/docs/RECOVERY.md">network recovery findings and limits</a> before considering maintenance.</p>
        </details>
      </li>
      <li><h3>Reconnect with fresh checks</h3>
        <p><a href="#connect">Return to Controls</a>, select the intended robot and verify its identity and current daemon version. Existing freshness and session checks still apply. Connect explicitly, then press Wake when you are ready. Previous head targets and agent write authorization are not restored.</p>
      </li>
      <li><h3>If connection loss returns</h3>
        <p>We have observed healthy reads after Stop and after Sleep before a later loss. Their timing alone does not establish either as the cause. Keep a short support summary before repeating recovery:</p>
        <ul><li>Your browser and operating system, and the daemon version only if freshly verified.</li><li>Whether the hostname and current numeric address behave differently, and whether another device can reach status.</li><li>When status last worked, the recent action sequence, and what changed after a daemon restart or physical power cycle.</li></ul>
        <p>Keep PINs, passwords, tokens, serial numbers, addresses, Wi-Fi names and full logs private. Share a redacted summary with <a href="https://github.com/pollen-robotics/reachy_mini/issues" target="_blank" rel="noopener noreferrer">Reachy’s maintainers</a>. The <a href="./source/docs/RECOVERY.md">technical recovery notes</a> describe the evidence needed to investigate OS networking.</p>
      </li>
    </ol>
    <p className="recovery-references">Official instructions: <a href="https://huggingface.co/docs/reachy_mini/en/platforms/reachy_mini/reset" target="_blank" rel="noopener noreferrer">Bluetooth recovery</a> · <a href="https://huggingface.co/docs/reachy_mini/en/troubleshooting" target="_blank" rel="noopener noreferrer">Power and network troubleshooting</a> · <a href="./source/docs/STATUS.md">Verification limits</a>.</p>
  </section>;
}
