// UI-only synthetic transport fixture. No hardware access or real network requests; dummy Wi-Fi input only.
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FirstSetup from '../../public-site/FirstSetup.jsx';
import { BLE_UUIDS, createFirstSetupClient, PROVISIONING_ALGORITHM } from '../../src/first-setup.mjs';
import { createWifiSetupClient } from '../../src/wifi-setup.mjs';
import { createRobotUpdateClient } from '../../src/robot-update.mjs';
import '../../public-site/style.css';
const available = () => true;
const unavailable = () => false;
function updateFactory(record) {
  let attempted=false, complete=false;
  return options=>createRobotUpdateClient({...options,fetchImpl:async(url,init)=>{
    const path=new URL(url).pathname;record(`${init.method} ${path}`);
    let value;
    if(path==='/api/daemon/status')value={version:complete?'1.11.0':'1.2.11',wireless_version:true,state:'not_initialized',error:null};
    else if(path==='/update/available')value={update:{reachy_mini:{is_available:true,current_version:'1.2.11',available_version:'1.11.0'}}};
    else if(path==='/update/start'){if(attempted)throw Error('Duplicate fixture update');attempted=true;value={job_id:'00000000-0000-4000-8000-000000000001'};}
    else if(path==='/update/info'){complete=true;value={command:'update_reachy_mini',status:'done',logs:[]};}
    else throw Error('Unexpected update fixture request');
    return new globalThis.Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
  }});
}
function wifiFactory(mode, record) {
  let target = '', submitted = false;
  return options => createWifiSetupClient({ ...options, fetchImpl: async (url, init) => {
    const path = new URL(url).pathname;
    record(`${init.method} ${path}`);
    if (mode === 'wifi-blocked') throw Error('Synthetic blocked URL with private data');
    let value;
    if (path === '/api/daemon/status') value = { version: mode === 'wifi-unsupported' ? '1.11.0' : '1.2.11', wireless_version: true, state: 'not_initialized', error: null };
    else if (path === '/wifi/status') value = { mode: submitted ? 'wlan' : 'hotspot', known_networks: ['Temporary hotspot'], connected_network: submitted ? mode === 'wifi-wrong-network' ? 'Other network' : target : 'Hotspot' };
    else if (path === '/wifi/scan_and_list') value = ['Temporary hotspot', 'Second test network'];
    else if (path === '/wifi/connect') { target = new URL(url).searchParams.get('ssid'); submitted = true; if (mode === 'wifi-unknown' || mode === 'wifi-wrong-network') throw Error('Synthetic lost access point'); value = null; }
    else throw Error('Unexpected fixture request');
    return new globalThis.Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  } });
}
function syntheticClient(mode, record, options) {
  class Response extends EventTarget {
    properties = { read: true, notify: true };
    value = new DataView(new ArrayBuffer(0));
    async startNotifications() {}
    store(text) { this.value = new DataView(new TextEncoder().encode(text).buffer); }
    async readValue() { this.dispatchEvent(new Event('characteristicvaluechanged')); return this.value; }
    emit(text) { this.store(text); this.dispatchEvent(new Event('characteristicvaluechanged')); }
  }
  const response = new Response();
  const command = { properties: { write: true }, async writeValueWithResponse(bytes) {
    const text = new TextDecoder().decode(bytes);
    if (!['PING', 'WIFI_STATUS', 'WIFI_KEYEX'].includes(text)) throw Error('Fixture permits public checks only');
    record(text);
    if (text === 'PING') return response.store('PONG');
    if ((mode === 'unsupported-status' && text === 'WIFI_STATUS') || (mode === 'unsupported-key' && text === 'WIFI_KEYEX')) return response.store(`ECHO: ${text}`);
    if (mode === 'timeout' || mode === 'pending-status') return response.store('OK: working');
    response.emit('OK: working');
    queueMicrotask(() => response.emit(mode === 'malformed' ? '{incomplete' : JSON.stringify(text === 'WIFI_STATUS'
      ? { mode: 'hotspot', connected: null, error: null }
      : { alg: PROVISIONING_ALGORITHM, kid: 'synthetic', pk: btoa('A'.repeat(32)) })));
  } };
  const device = new EventTarget(); device.name = 'Synthetic Reachy';
  const server = { connected: false, async connect() { this.connected = true; return this; }, disconnect() { this.connected = false; device.dispatchEvent(new Event('gattserverdisconnected')); }, async getPrimaryService(uuid) {
    if (uuid === BLE_UUIDS.service) return { async getCharacteristic(id) { return id === BLE_UUIDS.command ? command : response; } };
    return { async getCharacteristic(id) { return { async readValue() { return new DataView(new TextEncoder().encode(id === BLE_UUIDS.network ? 'HOTSPOT [wlan0] reachy-mini.local' : 'synthetic-id').buffer); } }; } };
  } };
  device.gatt = server;
  return createFirstSetupClient({ ...options, bluetooth: { requestDevice: () => Promise.resolve(device) }, timeoutMs: mode === 'pending-status' ? 5000 : 100 });
}
function Harness() {
  const [mode, setMode] = useState('unsupported-status');
  const [writes, setWrites] = useState([]);
  const [active, setActive] = useState(true);
  const [closed, setClosed] = useState(0);
  const createWifiClient = useMemo(() => wifiFactory(mode, request => setWrites(current => [...current, request])), [mode]);
  const createUpdateClient = useMemo(() => updateFactory(request => setWrites(current=>[...current,request])), [mode]);
  return <main><h1>Synthetic onboarding checks</h1><p>No robot traffic. Bluetooth checks and Wi-Fi requests use synthetic responses.</p><label htmlFor="scenario">Scenario</label><select id="scenario" value={mode} onChange={event => { setWrites([]); setClosed(0); setActive(true); setMode(event.target.value); }}>
    {['unsupported-status', 'unsupported-key', 'ready', 'timeout', 'pending-status', 'malformed', 'no-bluetooth', 'wifi-ready', 'wifi-blocked', 'wifi-unsupported', 'wifi-unknown', 'wifi-wrong-network'].map(value => <option key={value}>{value}</option>)}
  </select><button type="button" onClick={() => setActive(value => !value)}>{active ? 'Leave setup' : 'Return to setup'}</button>{active && <FirstSetup key={mode} createUpdateClient={createUpdateClient} createWifiClient={createWifiClient} browserSupported={mode === 'no-bluetooth' ? unavailable : available} createClient={options => syntheticClient(mode, command => setWrites(current => [...current, command]), { ...options, onDisconnect(reason) { setClosed(count => count + 1); options.onDisconnect(reason); } })} />}<p data-testid="writes">Synthetic requests sent: {writes.join(', ') || 'none'}</p><p>Closed Bluetooth connections: {closed}</p></main>;
}
createRoot(document.getElementById('root')).render(<Harness />);
