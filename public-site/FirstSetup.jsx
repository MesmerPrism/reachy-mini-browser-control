import { useEffect, useRef, useState } from 'react';
import { createFirstSetupClient, cryptoPreflight, FirstSetupError, SETUP_CHECKS } from '../src/first-setup.mjs';
import { parseDaemonStatus, daemonGuidance, robotBrowserLinks, reportedRobotHost } from '../src/setup-guidance.mjs';
import WifiSetup from './WifiSetup.jsx';
import RobotUpdate from './RobotUpdate.jsx';

const steps = ['Choose a route', 'Check compatibility', 'Connect Wi-Fi', 'Browser control'];
const outcomes = { checking: 'Checking…', passed: 'Passed', unsupported: 'Not supported', inconclusive: 'Inconclusive', skipped: 'Not run' };
const emptyChecks = () => SETUP_CHECKS.map(check => ({ ...check, outcome: 'skipped' }));

function DaemonStatusForm({ onResult }) {
  const [error, setError] = useState('');
  return <form className="connection-form" onSubmit={event => {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get('daemon-status');
    event.currentTarget.reset();
    try { const daemon = parseDaemonStatus(text); setError(''); onResult(daemon); }
    catch (failure) { onResult(null); setError(failure.message); }
  }}>
    <label htmlFor="daemon-status">Paste the JSON from Reachy’s daemon status page</label>
    <textarea id="daemon-status" name="daemon-status" rows={4} maxLength={16384} required autoComplete="off" spellCheck={false} />
    <p>Only the version, model type and status summary are retained in this tab. Pasted status does not enable Bluetooth credentials.</p>
    <button>Check daemon version</button>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}

function statusText(status) {
  if (!status) return 'No Wi-Fi status read yet.';
  const modes = { hotspot: 'Robot access point', wlan: 'Joined a Wi-Fi network', busy: 'Changing network', disconnected: 'Disconnected' };
  return `${modes[status.mode] || 'Unknown network state'}${status.connected ? `: ${status.connected}` : ''}${status.error ? '. The robot reports a network error.' : ''}`;
}

const hasBrowserBluetooth = () => window.isSecureContext && Boolean(navigator.bluetooth?.requestDevice);
export default function FirstSetup({ createClient = createFirstSetupClient, browserSupported = hasBrowserBluetooth, createWifiClient, createUpdateClient } = {}) {
  const [capability, setCapability] = useState('checking');
  const [identity, setIdentity] = useState(null);
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Checking this browser…');
  const [joined, setJoined] = useState(false);
  const [step, setStep] = useState(0);
  const [route, setRoute] = useState(null);
  const [checks, setChecks] = useState(emptyChecks);
  const [access, setAccess] = useState('skipped');
  const [daemon, setDaemon] = useState(null);
  const [host, setHost] = useState('reachy-mini.local');
  const [browserPage, setBrowserPage] = useState(0);
  const [pageFound, setPageFound] = useState(false);
  const [manualJoined, setManualJoined] = useState(false);
  const [pendingWifi, setPendingWifi] = useState('');
  const [updateAttempt, setUpdateAttempt] = useState(null);
  const probing = useRef(null);
  const stepHeading = useRef(null);
  const client = useRef(null);
  const pin = useRef('');
  const requestedNetwork = useRef('');
  const operation = useRef(0);
  const progress = useRef('');
  const mounted = useRef(true);
  const wifiForm = useRef(null);
  const pinForm = useRef(null);
  const links = robotBrowserLinks(host);
  const guidance = daemonGuidance(daemon);

  useEffect(() => { stepHeading.current?.focus(); }, [step]);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    async function check() {
      if (!browserSupported()) {
        setCapability('unsupported');
        setMessage('Bluetooth setup needs a browser with Web Bluetooth, such as desktop Chrome or Edge, or Chrome on Android. Open this page there; no helper download is needed.');
        return;
      }
      try {
        await cryptoPreflight();
        // Availability is advisory: it does not prove permission, discovery, or
        // robot compatibility. Never open a chooser outside the Select click.
        let available;
        if (typeof navigator.bluetooth.getAvailability === 'function') {
          let timer;
          try {
            available = await Promise.race([
              navigator.bluetooth.getAvailability(),
              new Promise(resolve => { timer = setTimeout(resolve, 1500); }),
            ]);
          } catch { /* The explicit chooser will report policy failures. */ }
          finally { clearTimeout(timer); }
        }
        if (!cancelled) {
          setCapability('ready');
          setMessage(available === false
            ? 'Encryption check passed, but the browser currently reports Bluetooth unavailable. Check that Bluetooth is on. Select Reachy to test the chooser; browser policy or adapter support may still prevent access.'
            : 'Encryption check passed. Select Reachy to test Bluetooth access and find your robot. This check does not verify discovery or robot compatibility. You can keep this computer connected to the internet during Bluetooth setup.');
        }
      } catch {
        if (!cancelled) { setCapability('unsupported'); setMessage('This browser could not complete the encryption check. Try an up-to-date Chrome or Edge browser.'); }
      }
    }
    check();
    return () => { cancelled = true; mounted.current = false; operation.current++; pin.current = ''; client.current?.disconnect(); };
  }, []);

  function clearSecrets() {
    pin.current = '';
    pinForm.current?.reset();
    if (wifiForm.current) wifiForm.current.elements.password.value = '';
    setAuthenticated(false);
  }

  function disconnect() {
    operation.current++;
    client.current?.disconnect();
    client.current = null;
    clearSecrets();
    setConnected(false); setBusy(false); setError('');
    setMessage('Bluetooth disconnected. No Wi-Fi request will be repeated automatically.');
  }

  function errorText(failure) {
    const safe = failure instanceof FirstSetupError ? failure.message : 'The browser operation failed. Check Bluetooth and try selecting Reachy again.';
    // Progress labels come from the client's fixed vocabulary, never replies,
    // device names, network names, credentials, or browser exception messages.
    return progress.current ? `${safe} Last step: ${progress.current}` : safe;
  }

  async function run(label, action) {
    const id = ++operation.current;
    setBusy(true); setError(''); setMessage(label);
    try { await action(id); }
    catch (failure) {
      if (mounted.current && operation.current === id) {
        // Protocol errors are fixed public messages; never display raw browser
        // exceptions or a credential-bearing command/robot response.
        setError(errorText(failure));
        clearSecrets();
        if (!client.current?.connected) setConnected(false);
        setMessage('Setup stopped. Check the last observed status before trying again.');
      }
    } finally { if (mounted.current && operation.current === id) setBusy(false); }
  }

  function select() {
    if (pendingWifi) { setError('A Wi-Fi request is unconfirmed. Check the same robot through Wi-Fi before submitting through Bluetooth.'); return; }
    client.current?.disconnect();
    progress.current = '';
    setStep(1); setRoute('bluetooth'); setAccess('checking'); setChecks(emptyChecks());
    setDaemon(null); setHost('reachy-mini.local'); setManualJoined(false); setPageFound(false); setBrowserPage(0);
    clearSecrets(); setJoined(false); setStatus(null); setIdentity(null); setConnected(false);
    const selectedClient = createClient({ onProgress: label => {
      if (client.current !== selectedClient || !mounted.current) return;
      progress.current = label;
      setMessage(label);
    }, onDisconnect: reason => {
      if (client.current !== selectedClient || !mounted.current) return;
      if (probing.current === selectedClient) {
        // Terminal probe failures close transport. Let the discovery result
        // settle so its evidence is not erased by the disconnect callback.
        clearSecrets(); setConnected(false); return;
      }
      operation.current++; clearSecrets(); setConnected(false); setBusy(false);
      if (reason instanceof FirstSetupError && reason.code !== 'disconnected') setError(errorText(reason));
      setMessage(requestedNetwork.current
        ? 'Bluetooth disconnected. A Wi-Fi request may still be running on Reachy. Select the same robot and read its status before submitting again.'
        : 'Bluetooth disconnected during setup checks. No Wi-Fi details were submitted. Check the error’s last step before selecting Reachy again.');
    } });
    client.current = selectedClient;
    probing.current = selectedClient;
    // Start requestDevice in this click's activation, before any async preflight.
    const selection = selectedClient.selectAndConnect();
    run('Select your powered-on Reachy in the browser chooser…', async id => {
      try {
        let observed;
        try { observed = await selection; }
        catch (failure) { if (operation.current === id) setAccess('inconclusive'); throw failure; }
        if (operation.current !== id) return;
        setIdentity(observed); setAccess('passed');
        const reported = reportedRobotHost(observed.network);
        if (reported) setHost(reported);
        const inspected = await selectedClient.probeCapabilities({ onCheck: next => {
          if (mounted.current && operation.current === id) setChecks(next);
        } });
        if (operation.current !== id) return;
        setChecks(inspected.checks); setStatus(inspected.status); setConnected(inspected.ready && selectedClient.connected);
        setJoined(Boolean(inspected.ready && requestedNetwork.current && inspected.status.mode === 'wlan' && inspected.status.connected === requestedNetwork.current && !inspected.status.error));
        setMessage(inspected.ready
          ? 'All Bluetooth checks passed. Compare the reported identity with your robot, then continue to Wi-Fi.'
          : inspected.checks.some(check => check.outcome === 'unsupported')
            ? 'Reachy explicitly does not support one of these Bluetooth commands. Continue using its browser pages. No credentials were submitted.'
            : 'Bluetooth checks were inconclusive. You can inspect the robot’s browser pages or explicitly try Bluetooth again when it is nearby. No credentials were submitted.');
      } finally { if (probing.current === selectedClient) probing.current = null; }
    });
  }

  function useBrowser() {
    disconnect(); setRoute('browser'); setStep(1);
    setDaemon(null); setBrowserPage(0); setPageFound(false); setManualJoined(false);
    setMessage('Join Reachy’s access point using your device’s Wi-Fi controls, then open its status page in a separate tab. Keep this setup tab loaded.');
  }

  function useWifi() {
    disconnect(); setRoute('wifi'); setStep(1); setDaemon(null); setJoined(false);
    setBrowserPage(0); setPageFound(false); setManualJoined(false);
  }

  function changeHost(value) {
    setHost(value); setDaemon(null); setBrowserPage(0); setPageFound(false); setManualJoined(false);
  }

  function authenticate(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('pin');
    event.currentTarget.reset();
    run('Verifying the setup PIN…', async id => {
      await client.current.authenticate(value);
      if (operation.current !== id) return;
      pin.current = value; setAuthenticated(true);
      setMessage('PIN accepted. Enter the temporary network Reachy should join.');
    });
  }

  async function observe(id, wanted) {
    const next = await client.current.getWifiStatus();
    if (operation.current !== id) return false;
    setStatus(next);
    const matched = next.mode === 'wlan' && next.connected === wanted && !next.error;
    if (matched) {
      const observed = await client.current.readIdentity();
      if (operation.current !== id) return false;
      setIdentity(observed); setJoined(true);
      setMessage('Reachy reports joining the requested Wi-Fi network. Next, put this computer on that network and check the robot’s browser status page.');
    }
    return matched;
  }

  function connectWifi(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ssid = data.get('ssid'); let password = data.get('password'); let setupPin = pin.current;
    data.delete('password');
    const encode = value => new TextEncoder().encode(value).length;
    if (encode(ssid) > 32 || encode(password) > 63) {
      setError('Network names must fit 32 UTF-8 bytes and this form’s Wi-Fi passwords must fit 8–63 UTF-8 bytes. Shorten the temporary network name or password.');
      return;
    }
    requestedNetwork.current = ssid;
    clearSecrets(); setJoined(false);
    run('Checking complete Bluetooth writes, then sending the encrypted Wi-Fi request…', async id => {
      try { await client.current.connectWifi({ ssid, password, pin: setupPin }); }
      finally { password = ''; setupPin = ''; }
      if (operation.current !== id) return;
      setMessage('Reachy accepted the request. Waiting for its network status; this is not yet proof of a connection.');
      const end = Date.now() + 60000;
      while (Date.now() < end && operation.current === id) {
        if (await observe(id, ssid)) return;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      if (operation.current === id) setMessage('The requested network was not confirmed within a minute. Read status again; do not assume the request failed or resend it yet.');
    });
  }

  function refresh() {
    run('Reading Reachy’s network status…', async id => {
      const next = await client.current.getWifiStatus();
      const observed = await client.current.readIdentity();
      if (operation.current !== id) return;
      setStatus(next); setIdentity(observed);
      setJoined(Boolean(requestedNetwork.current && next.mode === 'wlan' && next.connected === requestedNetwork.current && !next.error));
      setMessage('Network status updated. “Joined a Wi-Fi network” does not by itself verify internet or remote access.');
    });
  }

  return <div className="first-setup">
    <nav className="setup-steps" aria-label="Setup progress"><ol>{steps.map((name, index) => <li key={name} aria-current={step === index ? 'step' : undefined}>{index + 1}. {name}</li>)}</ol></nav>
    <h3 ref={stepHeading} tabIndex={-1}>Step {step + 1}: {steps[step]}</h3>
    {step === 0 && <>
      <p>Choose how to reach your Wireless Mini. Both routes check support before accepting network credentials.</p>
      <p>Keep the robot nearby and powered on. Use a personal Wi-Fi network or phone hotspot with internet. The current setup forms do not configure eduroam’s university sign-in.</p>
      <p className="status" role="status" aria-live="polite">{message}</p>
      <div className="start-options"><div><h4>Bluetooth</h4><p>Keep this computer online while selecting Reachy. The helper checks the installed Bluetooth service’s setup commands.</p><button type="button" className="primary" onClick={select} disabled={capability !== 'ready' || busy || Boolean(pendingWifi)}>Check with Bluetooth</button></div><div><h4>Wi-Fi</h4><p>Join Reachy’s access point or share its network. Allow browser local-network access to use the supported Wi-Fi API directly from this page.</p><button type="button" className="primary" onClick={useWifi} disabled={busy}>Set up over Wi-Fi</button></div></div>
      {pendingWifi && <p className="notice">A Wi-Fi request remains unconfirmed. Choose Wi-Fi and check the same robot’s current network before another submission.</p>}
      <div className="actions"><button type="button" onClick={useBrowser} disabled={busy}>Use Reachy’s browser pages</button></div>
      <p>Using a Lite over USB? Follow the <a href="#local">local controller setup</a>. Already connected your Wireless Mini to Wi-Fi and remote access? <a href="#connect">Open the controls</a>.</p>
    </>}
    {step > 0 && route === 'bluetooth' && <p className="status" role="status" aria-live="polite">{message}</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {route === 'browser' && requestedNetwork.current && !joined && !manualJoined && <p className="notice">A previous Wi-Fi request has not been confirmed. Inspect the robot’s current network status before submitting another connection request.</p>}
    {route === 'wifi' && step > 0 && step < 3 && <WifiSetup host={host} onHost={changeHost} step={step} onStep={setStep} pendingNetwork={pendingWifi || (!joined ? requestedNetwork.current : '')} onPending={value => { setPendingWifi(value); requestedNetwork.current = value; }} onDaemon={setDaemon} onJoined={value => { setDaemon(value); setJoined(true); requestedNetwork.current = ''; }} onBrowser={useBrowser} createClient={createWifiClient} />}
    {step === 1 && <>
      {route === 'bluetooth' && <>
        <p>The checks run in order and stop at the first failure. “Not supported” requires an explicit reply; a timeout stays inconclusive. Later checks are skipped when the connection closes.</p>
        <dl className="setup-checks"><dt>Bluetooth access and reported identity</dt><dd>{outcomes[access]}</dd>{checks.map(check => <div key={check.id}><dt>{check.label}</dt><dd>{outcomes[check.outcome]}{check.code ? ` (${check.code.replaceAll('_', ' ')})` : ''}</dd></div>)}</dl>
        <p>In the chooser, wait up to 30 seconds for a named Reachy entry. An “Unknown or unsupported device” entry does not identify your robot.</p>
        {identity && <dl className="setup-identity"><dt>Selected device</dt><dd>{identity.deviceName || 'Unnamed Bluetooth device'}</dd><dt>Reported hardware identity</dt><dd>{identity.hardwareId || 'Not exposed by this firmware'}</dd><dt>Reported address information</dt><dd>{identity.network || 'Not exposed by this firmware'}</dd></dl>}
        <div className="actions">{connected && <button type="button" className="primary" onClick={() => setStep(2)}>Continue with Bluetooth</button>}<button type="button" onClick={useWifi} disabled={busy}>Try direct Wi-Fi setup</button><button type="button" onClick={useBrowser} disabled={busy}>Continue with robot browser</button><button type="button" onClick={select} disabled={capability !== 'ready' || busy || connected || Boolean(pendingWifi)}>Try Bluetooth again</button><button type="button" onClick={disconnect} disabled={!client.current}>Disconnect Bluetooth</button></div>
      </>}
      {route === 'browser' && <>
        <ol><li>Keep this tab open, then manually join Reachy’s Wi-Fi access point.</li><li>Open the status link below in a new tab. Unlike the documentation viewer, this raw JSON page needs no external scripts.</li><li>Copy the response, return here and paste it below. You can reconnect this computer to the internet while keeping the robot page open.</li></ol>
      <p>This route uses separate browser tabs. The public page cannot silently change your computer’s Wi-Fi. The direct Wi-Fi route can read supported robot APIs after browser local-network permission.</p>
        <label htmlFor="robot-host">Robot hostname or local IP address — confirm this belongs to your Reachy</label>
        <input className="robot-host" id="robot-host" type="text" value={host} onChange={event => changeHost(event.target.value)} autoComplete="off" spellCheck={false} maxLength={253} />
        <p>If the local hostname does not resolve, use the gateway address shown in your device’s Wi-Fi details for Reachy’s access point, or the address reported by Bluetooth.</p>
        {!links && <p className="error" role="alert">Enter a local IP address or a .local hostname, without a scheme, port, path or password.</p>}
        {links && <p><a href={links.status} target="_blank" rel="noopener noreferrer">Open robot daemon status</a></p>}
        <DaemonStatusForm onResult={setDaemon} />
        <p>{guidance.text}</p>
        {daemon && <p>Reported state: {daemon.state || 'unknown'}{daemon.hasError ? '. The robot reports an error; inspect it on its own page.' : ''}. This response does not verify the Bluetooth service version.</p>}
        <div className="actions"><button type="button" className="primary" disabled={!links || guidance.kind === 'lite'} onClick={() => setStep(2)}>Continue to robot Wi-Fi pages</button><button type="button" onClick={select} disabled={capability !== 'ready' || busy}>Try Bluetooth checks</button></div>
      </>}
    </>}
    {step === 2 && route === 'bluetooth' && <>
    <p>{statusText(status)}</p>
    <p className="notice">Use a temporary network password. The built-in protocol encrypts it but does not authenticate the Bluetooth key exchange against an active impersonator. Credentials stay in this tab’s memory and are cleared after submission or disconnection.</p>
    <div className="setup-forms">
      <form ref={pinForm} className="connection-form" onSubmit={authenticate}>
        <h3>Verify the robot</h3>
        <label htmlFor="setup-pin">Setup PIN — last five characters of the printed serial</label>
        <input id="setup-pin" name="pin" type="password" autoComplete="off" required minLength={5} maxLength={5} disabled={!connected || busy} />
        <button disabled={!connected || busy || authenticated}>Verify PIN</button>
      </form>
      <form ref={wifiForm} className="connection-form" onSubmit={connectWifi}>
        <h3>Connect Reachy to Wi-Fi</h3>
        <label htmlFor="setup-ssid">Network name (SSID)</label>
        <input id="setup-ssid" name="ssid" type="text" autoComplete="off" required maxLength={32} disabled={!authenticated || busy} />
        <label htmlFor="setup-password">Temporary Wi-Fi password</label>
        <input id="setup-password" name="password" type="password" autoComplete="off" required minLength={8} maxLength={63} disabled={!authenticated || busy} />
        <button disabled={!authenticated || busy}>Connect to this Wi-Fi network</button>
      </form>
    </div>
    <div className="actions"><button type="button" onClick={refresh} disabled={!connected || busy}>Read network status</button><button type="button" className="primary" onClick={() => setStep(3)} disabled={!joined || busy}>Continue to browser control</button><button type="button" onClick={useBrowser} disabled={busy}>Switch to robot browser</button></div>
    <p>An accepted request is not proof of joining Wi-Fi. After a timeout or disconnect, read the same robot’s status before sending another request.</p>
    </>}
    {step === 2 && route === 'browser' && <>
      <p>{guidance.text}</p>
      <p>While connected to Reachy’s access point, try these pages in order. Each opens in a separate tab. Leave the robot’s daemon OFF while setting up the network.</p>
      {browserPage < 2 && links ? <>
        <p><a className="download" href={browserPage === 0 ? links.settings : links.dashboard} target="_blank" rel="noopener noreferrer">{browserPage === 0 ? 'Open Reachy Settings' : 'Open Reachy dashboard'}</a></p>
        <div className="actions"><button type="button" onClick={() => setPageFound(true)}>I found Wi-Fi controls</button><button type="button" onClick={() => { setBrowserPage(page => page + 1); setPageFound(false); setManualJoined(false); }}>This page has no Wi-Fi controls</button></div>
      </> : <p>Neither browser page offered Wi-Fi setup. Follow the <a href="https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started" target="_blank" rel="noopener noreferrer">official connection guide</a> for this image. It may require the official Control app; this helper cannot promise a browser-only route for every shipped image.</p>}
      {pageFound && <>
        <ol><li>Choose your personal network or phone hotspot in the robot’s own form.</li><li>Enter its password there and submit the connection. On older images, this travels over local HTTP; use a dedicated temporary password.</li><li>Connect this computer to the same network. Check Reachy’s status there and note its new address before continuing.</li></ol>
        <label className="checkbox"><input type="checkbox" checked={manualJoined} onChange={event => setManualJoined(event.target.checked)} />I checked that Reachy joined the network. This is my confirmation, rather than a Bluetooth result.</label>
      </>}
      <div className="actions"><button type="button" className="primary" disabled={!manualJoined || !pageFound} onClick={() => setStep(3)}>Continue to browser control</button></div>
    </>}
    {step === 3 && <>
      <p>{joined && route === 'bluetooth' ? 'Bluetooth confirmed the requested Wi-Fi network.' : joined && route === 'wifi' ? 'Reachy’s Wi-Fi API reports a joined network.' : 'You confirmed the network connection on the robot’s own page.'} Put this computer and Reachy on that network with internet, then check the current daemon status.</p>
      <label htmlFor="connected-host">Reachy’s address on the joined network</label>
      <input className="robot-host" id="connected-host" type="text" value={host} onChange={event => changeHost(event.target.value)} autoComplete="off" spellCheck={false} maxLength={253} />
      {links ? <p><a href={links.status} target="_blank" rel="noopener noreferrer">Open current daemon status</a></p> : <p className="error">Enter a local IP address or .local hostname without a scheme, port or path.</p>}
      {links && (updateAttempt || daemon?.wireless && daemon.version === '1.2.11') && <RobotUpdate host={host} attempt={updateAttempt} onAttempt={setUpdateAttempt} onDaemon={setDaemon} createClient={createUpdateClient} />}
      <DaemonStatusForm onResult={setDaemon} />
      <p>{guidance.text}</p>
      <p>Our motion controller currently supports daemon 1.10.0. Setup or update success does not establish control compatibility; the installed version needs its own validation.</p>
      {guidance.oauth && links ? <p><a href={links.oauth} target="_blank" rel="noopener noreferrer">Open Reachy’s Hugging Face sign-in</a>. Review the requested permissions before approving. The robot needs internet.</p> : <p>Use the sign-in and remote-access options actually provided by your robot’s dashboard or the <a href="https://huggingface.co/docs/reachy_mini/SDK/javascript-sdk" target="_blank" rel="noopener noreferrer">official browser connection guide</a>. Older images need a separate compatibility review before browser control.</p>}
      {daemon?.wireless && daemon.version === '1.10.0' && <p>After enabling remote access, create a <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">read token for the same account</a> and <a className="download" href="#connect">Open the controls</a>.</p>}
    </>}
    {step > 0 && <div className="actions"><button type="button" disabled={busy} onClick={() => setStep(current => current - 1)}>Back</button></div>}
  </div>;
}
