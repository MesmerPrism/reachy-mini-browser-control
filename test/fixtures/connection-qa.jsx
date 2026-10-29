// Generated data only. This page never authenticates or connects to a robot.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ConnectionGuide from '../../public-site/ConnectionGuide.jsx';
import WirelessPanel from '../../public-site/WirelessPanel.jsx';
import FirstSetup from '../../public-site/FirstSetup.jsx';
import { SETUP_CHECKS } from '../../src/first-setup.mjs';
import { probeConnection } from '../../src/connection-readiness.mjs';
import '../../public-site/style.css';
const params = new URLSearchParams(location.search), mode = params.get('mode') || 'logged-out';
const fixtureHost = 'reachy-fixture.local', fixtureId = 'synthetic-device';
const startedAt = Date.now();
const daemon = { version: mode === 'unsupported' ? '1.12.0' : '1.11.0', hardware_id: fixtureId, wireless_version: true, state: 'running', error: null, backend_status: { ready: true, error: null } };
const probe = host => probeConnection(host, { fetchImpl: async url => {
  if (mode === 'blocked') throw Error('Synthetic blocked local network');
  if (url.endsWith('/api/daemon/status')) return { ok: true, json: async () => daemon };
  if (mode === 'unknown-account') return { ok: false };
  return { ok: true, json: async () => url.endsWith('/api/hf-auth/status') ? { is_logged_in: mode !== 'logged-out' } : { is_connected: !['logged-out','relay-stopped'].includes(mode) } };
} });
const matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
class SyntheticSDK extends EventTarget {
  constructor() { super(); this.state='disconnected'; this.robots=[{id:'synthetic-peer',meta:{name:'QA Reachy'}}]; }
  async connect() { if(mode==='signaling-error')throw Error('Synthetic account connection failed');this.state='connected'; }
  async startSession() { this.state='streaming'; this.timer=setInterval(()=>{this.robotState={head:matrix,antennas:[0,0],body_yaw:0,motor_mode:'disabled',is_move_running:false};this.dispatchEvent(new CustomEvent('state',{detail:this.robotState}));},100); }
  getHardwareId() {return mode==='wrong-robot'?'different-device':fixtureId;} getVersion(){return '1.11.0';} requestState(){return true;}
  attachVideo(){return ()=>{};} getVolume(){return 40;} stopSession(){clearInterval(this.timer);this.state='connected';} disconnect(){clearInterval(this.timer);this.state='disconnected';}
}
function Fixture() {
  const [evidence,setEvidence]=useState(mode==='expiry'?{source:'live',host:fixtureHost,checkedAt:startedAt,reachable:true,hardwareId:fixtureId,version:'1.11.0',wireless:true,ready:true,loggedIn:false,relayConnected:false}:{source:params.has('session')?'bluetooth':'address',host:fixtureHost,hardwareId:params.has('session')?fixtureId:null});
  const [showSetup,setShowSetup]=useState(mode==='handoff');
  const factory=options=>{
    let refreshed=false;
    return {connected:true,selectAndConnect:async()=>({hardwareId:fixtureId,network:'HOTSPOT [wlan0] reachy-hotspot.local'}),probeCapabilities:async()=>({ready:true,checks:SETUP_CHECKS.map(c=>({...c,outcome:'passed'})),status:{mode:'hotspot',connected:'Synthetic AP'}}),getWifiStatus:async()=>{refreshed=true;return{mode:'wlan',connected:'Synthetic WLAN'};},readIdentity:async()=>({hardwareId:fixtureId,network:refreshed?'CONNECTED [wlan0] reachy-current.local':'HOTSPOT [wlan0] reachy-hotspot.local'}),disconnect(){this.connected=false;}};
  };
  return <div className="page"><main><h1>Connection flow · Synthetic QA</h1><p>Generated fixture: {mode}. No robot, account, microphone or camera is used.</p>
    {mode==='handoff' && <><p data-testid="handoff-host">Shared address: {evidence.host}</p><button onClick={()=>setShowSetup(false)}>Show connection guide</button></>}
    {showSetup?<FirstSetup createClient={factory} browserSupported={()=>true} onEvidence={setEvidence}/>:params.has('session') ? <WirelessPanel evidence={evidence} onEvidence={setEvidence} loadSDK={async()=>({ReachyMini:SyntheticSDK})} readinessNow={mode==='expiry'?()=>startedAt+Math.max(0,Date.now()-startedAt-2000)*100:Date.now}/> : <ConnectionGuide evidence={evidence} onEvidence={setEvidence} probe={probe}/>}
  </main></div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
