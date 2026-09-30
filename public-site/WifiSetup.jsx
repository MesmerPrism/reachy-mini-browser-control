import { useEffect, useRef, useState } from 'react';
import { createWifiSetupClient, WifiSetupError } from '../src/wifi-setup.mjs';
import { robotBrowserLinks } from '../src/setup-guidance.mjs';

const networkText = wifi => !wifi ? 'Network status has not been read.' :
  `${{ hotspot: 'Reachy access point active', wlan: 'Joined Wi-Fi', busy: 'Changing network', disconnected: 'Wi-Fi disconnected' }[wifi.mode] || 'Unknown network state'}${wifi.connected ? `: ${wifi.connected}` : ''}`;

export default function WifiSetup({ host, onHost, step, onStep, pendingNetwork, onPending, onDaemon, onJoined, onBrowser, createClient = createWifiSetupClient }) {
  const [state, setState] = useState({}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [message, setMessage] = useState('Join Reachy’s access point or the same Wi-Fi network, then check access.');
  const [networks, setNetworks] = useState([]), [ssid, setSsid] = useState(''), [acknowledged, setAcknowledged] = useState(false);
  const client = useRef(null), epoch = useRef(0), form = useRef(null), latestPending = useRef(pendingNetwork);
  latestPending.current = pendingNetwork;
  const links = robotBrowserLinks(host);
  useEffect(() => {
    const id = ++epoch.current;
    setState({}); setBusy(false); setError(''); setNetworks([]); setAcknowledged(false);
    if (form.current) form.current.reset();
    setMessage(latestPending.current ? 'A Wi-Fi request is unconfirmed. Check the same robot at its current address before submitting again.' : 'No request sent. Check access to this robot address.');
    if (robotBrowserLinks(host)) client.current = createClient({ host, pendingNetwork: latestPending.current });
    else client.current = null;
    return () => { if (epoch.current === id) epoch.current++; client.current?.dispose(); client.current = null; };
  }, [host, createClient]);

  async function run(label, action) {
    const selected = client.current, id = epoch.current;
    if (!selected || busy) return;
    setBusy(true); setError(''); setMessage(label);
    try { await action(selected, id); }
    catch (failure) {
      if (epoch.current === id) {
        setError(failure instanceof WifiSetupError ? failure.message : 'The local network request did not complete. Check the robot address and browser permission.');
        setMessage('Check the last observed status. No connection request will be repeated automatically.');
      }
    } finally {
      if (epoch.current === id) {
        const next = selected.snapshot(); setState(next); setBusy(false);
        onPending(next.pendingNetwork || '');
      }
    }
  }

  function observe(selected, id) {
    if (epoch.current !== id) return;
    const next = selected.snapshot();
    setState(next); onDaemon(next.daemon || null);
    if (next.phase === 'joined') {
      onJoined(next.daemon); setMessage('Reachy reports joining the requested network. Network setup is confirmed; internet and remote control are separate checks.');
    } else setMessage(next.supported ? 'Local API access passed. Compare the reported version and network with your Reachy.' : 'Direct Wi-Fi setup is unavailable for this response. Use Bluetooth checks or Reachy’s own browser pages.');
  }

  function check() { run('Checking browser access and Reachy’s Wi-Fi API…', async (selected, id) => { await selected.probe(); observe(selected, id); }); }
  function read() { run('Reading the network status without submitting credentials…', async (selected, id) => { await selected.readStatus(); observe(selected, id); }); }
  function submit(event) {
    event.preventDefault();
    if (!acknowledged || pendingNetwork || busy || !state.ready) return;
    let password = new FormData(event.currentTarget).get('password');
    event.currentTarget.elements.password.value = ''; setAcknowledged(false);
    // Carry uncertainty through host/route changes before beginning async guards.
    onPending(ssid);
    run('Checking fresh robot state, then submitting one Wi-Fi request…', async (selected, id) => {
      let result;
      try { result = await selected.connect({ ssid, password }); }
      finally { password = ''; }
      if (epoch.current !== id) return;
      setMessage(`${result.outcome === 'unknown' ? 'The connection request outcome is unknown.' : 'Reachy accepted the request; joining is not yet confirmed.'} Put this computer on the chosen network, update Reachy’s address if needed, then check status. A lost access-point connection can happen during a successful switch.`);
    });
  }

  return <>
    <p>Wi-Fi setup talks directly to Reachy on your local network. Keep this page loaded while switching networks. Your browser may ask you to allow local-network access.</p>
    <ol><li>For a fresh robot, join <code>reachy-mini-ap</code> with password <code>reachy-mini</code>. If Reachy already joined your network, put this computer on that network.</li><li>Confirm Reachy’s address below. For its access point, use the gateway in your Wi-Fi details or the address reported by Bluetooth.</li><li>Click Check Wi-Fi access. Allow local-network access if you want this site to communicate with your robot.</li></ol>
    <label htmlFor="wifi-robot-host">Reachy hostname or local IP address</label>
    <input className="robot-host" id="wifi-robot-host" value={host} onChange={event => onHost(event.target.value)} autoComplete="off" spellCheck={false} maxLength={253} />
    {!links && <p className="error">Use a private local IP address or .local hostname, without a scheme, port or path.</p>}
    <div className="actions"><button type="button" className="primary" disabled={!links || busy} onClick={check}>Check Wi-Fi access</button>{state.supported && <button type="button" disabled={busy} onClick={read}>Read Wi-Fi status</button>}</div>
    <p className="status" role="status" aria-live="polite">{message}</p>
    {error && <p className="error" role="alert">{error}</p>}
    {state.daemon && <p>Reported daemon {state.daemon.version} · {state.daemon.wireless ? 'Wireless Mini' : 'Non-wireless'} · {state.daemon.state || 'unknown state'}.</p>}
    {state.wifi && <p>{networkText(state.wifi)}</p>}
    {pendingNetwork && <p className="notice">A request to join {pendingNetwork} is unconfirmed. Keep the hotspot on and check Reachy there, even if the old access-point page reported an error. Credentials will not be resent automatically.</p>}
    {step === 1 && state.supported && state.phase !== 'joined' && <div className="actions"><button type="button" disabled={busy} onClick={() => onStep(2)}>Continue to Wi-Fi setup</button></div>}
    {state.supported && state.wifi?.mode === 'wlan' && state.phase !== 'joined' && !pendingNetwork && <div className="actions"><button type="button" disabled={busy} onClick={() => { onJoined(state.daemon); onStep(3); }}>Continue with current network</button></div>}
    {step === 2 && state.supported && <>
      <p>Keep the motion daemon OFF. Use a personal network or temporary phone hotspot; this form does not configure eduroam’s university sign-in.</p>
      <div className="actions"><button type="button" disabled={busy || Boolean(pendingNetwork) || !state.ready} onClick={() => run('Scanning available networks once…', async (selected, id) => { const found = await selected.scan(); if (epoch.current === id) { setNetworks(found); setMessage('Scan complete. Choose a listed network or enter its name.'); } })}>Scan Wi-Fi networks</button></div>
      {networks.length > 0 && <><label htmlFor="wifi-network-choice">Available networks</label><select id="wifi-network-choice" value={networks.includes(ssid) ? ssid : ''} disabled={busy || Boolean(pendingNetwork)} onChange={event => setSsid(event.target.value)}><option value="">Choose a network</option>{networks.map(name => <option key={name} value={name}>{name}</option>)}</select></>}
      <form ref={form} className="connection-form" onSubmit={submit}>
        <label htmlFor="wifi-network-name">Network name (SSID)</label><input className="robot-host" id="wifi-network-name" value={ssid} onChange={event => setSsid(event.target.value)} required maxLength={32} autoComplete="off" disabled={busy || Boolean(pendingNetwork)} />
        <label htmlFor="wifi-network-password">Temporary Wi-Fi password</label><input id="wifi-network-password" name="password" type="password" required minLength={8} maxLength={63} autoComplete="off" disabled={busy || Boolean(pendingNetwork)} />
        <p className="notice">This older API sends the password directly to Reachy over local HTTP in the request URL. It may appear in robot or browser diagnostic logs. Use a dedicated temporary hotspot password. Our site does not store it or send it to a cloud service.</p>
        <label className="checkbox"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} disabled={busy || Boolean(pendingNetwork)} />I am using a temporary password and want to submit it directly to this Reachy.</label>
        <button className="primary" disabled={busy || Boolean(pendingNetwork) || !state.ready || !acknowledged}>Connect Reachy to this network</button>
      </form>
    </>}
    {state.phase === 'joined' && <div className="actions"><button type="button" disabled={busy} onClick={() => onStep(3)}>Continue to browser control</button></div>}
    <details><summary>If local-network access does not work</summary><p>Check that the computer and robot share a network. Browser policy, missing local-network permissions or the robot’s allowed website origins can block access. Do not disable browser security settings. The direct route currently admits audited wireless daemon 1.2.11; other versions keep the browser-page alternative.</p>{links && <p><a href={links.settings} target="_blank" rel="noopener noreferrer">Open Reachy’s own Settings page</a></p>}</details>
    <div className="actions"><button type="button" disabled={busy} onClick={onBrowser}>Use robot browser pages instead</button></div>
  </>;
}
