import test from 'node:test';
import assert from 'node:assert/strict';
import { supportsWirelessVersion } from '../src/daemon-compatibility.mjs';
import { probeConnection, connectionSteps, mergeConnectionEvidence, bluetoothConnectionEvidence } from '../src/connection-readiness.mjs';

const status = { version: '1.11.0', hardware_id: 'fixture-device', wireless_version: true, state: 'running', backend_status: { ready: true, motor_control_mode: 'disabled', error: null }, error: null };
const response = body => ({ ok: true, json: async () => body });

test('local connection requires no account or relay even when both are explicitly unavailable', () => {
  const evidence={source:'live',host:'fixture.local',checkedAt:100,reachable:true,version:'1.10.0',wireless:true,hardwareId:'fixture',ready:true,hasError:false,loggedIn:false,relayConnected:false};
  const steps=connectionSteps({evidence,method:'local',now:100});
  assert.equal(steps.some(s=>s.id==='account'),false);
  assert.equal(steps.some(s=>s.state==='blocked'),false);
  assert.equal(steps.find(s=>s.id==='local').state,'unknown');
});
test('hosted Wireless admits exact audited versions, never adjacent or prerelease versions', () => {
  for (const version of ['1.10.0','1.11.0']) assert.equal(supportsWirelessVersion(version),true);
  for (const version of ['1.11.1','1.12.0','1.11.0-dev','v1.11.0',null,undefined]) assert.equal(supportsWirelessVersion(version),false);
});
test('read-only probe identifies actual account/relay blockers without retaining credentials', async () => {
  const calls=[];
  const evidence=await probeConnection('reachy-mini.local',{now:()=>100,fetchImpl:async(url,init)=>{
    calls.push({url,init});
    if(url.endsWith('/api/daemon/status'))return response({...status,token:'private-secret'});
    if(url.endsWith('/api/hf-auth/status'))return response({is_logged_in:false,token:'private-secret'});
    return response({state:'stopped',is_connected:false,message:'private-secret'});
  }});
  assert.equal(calls.length,3);assert.ok(calls.every(({init})=>init.method==='GET'&&init.redirect==='error'&&init.credentials==='omit'));
  assert.equal(evidence.hardwareId,'fixture-device');assert.equal(evidence.loggedIn,false);assert.equal(evidence.relayConnected,false);
  assert.doesNotMatch(JSON.stringify(evidence),/private-secret|token/);
  const steps=connectionSteps({evidence,now:100});assert.equal(steps[0].state,'done');assert.equal(steps[1].state,'done');assert.equal(steps[2].state,'blocked');assert.match(steps[2].detail,/sign in/i);
});
test('unsupported daemon, missing identity and robot error remain blockers', async () => {
  for(const bad of [{version:'1.12.0'},{hardware_id:null},{error:'private-error'},{backend_status:{ready:false}}]){
    const evidence=await probeConnection('reachy-mini.local',{fetchImpl:async url=>response(url.endsWith('/api/daemon/status')?{...status,...bad}:{})});
    assert.ok(connectionSteps({evidence}).some(step=>step.state==='blocked'));assert.doesNotMatch(JSON.stringify(evidence),/private-error/);
  }
});
test('unavailable optional account routes do not erase valid robot checks or claim account success', async () => {
  const evidence=await probeConnection('reachy-mini.local',{fetchImpl:async url=>{if(url.endsWith('/api/daemon/status'))return response(status);throw Error('private-url-secret');}});
  assert.equal(evidence.reachable,true);assert.equal(evidence.loggedIn,null);assert.equal(evidence.relayConnected,null);
  assert.equal(connectionSteps({evidence})[2].state,'unknown');
});
test('invalid host and blocked fetch never leak raw network errors', async () => {
  let calls=0;await assert.rejects(probeConnection('evil.invalid',{fetchImpl:async()=>{calls++;}}),/local/i);assert.equal(calls,0);
  await assert.rejects(probeConnection('reachy-mini.local',{fetchImpl:async()=>{throw Error('private-secret');}}),error=>!error.message.includes('private-secret')&&/browser|network/i.test(error.message));
});
test('pasted evidence and expired checks never pretend to prove current reachability or session', () => {
  const reported={source:'copied',version:'1.11.0',wireless:true,state:'running',hasError:false};
  assert.equal(connectionSteps({evidence:reported})[0].state,'unknown');
  const old={source:'live',checkedAt:0,reachable:true,hardwareId:'fixture-device',version:'1.11.0',wireless:true,ready:true,loggedIn:true,relayConnected:true};
  assert.equal(connectionSteps({evidence:old,now:120001})[0].state,'unknown');
  assert.notEqual(connectionSteps({evidence:old,now:0})[3].state,'done');
});
test('copied fallback and failed checks preserve independent identity only for the unchanged host', () => {
  const bt={source:'bluetooth',host:'reachy-mini.local',hardwareId:'fixture-device'};
  const copied=mergeConnectionEvidence(bt,{source:'copied',host:'reachy-mini.local',version:'1.11.0',wireless:true});
  assert.equal(copied.expectedHardwareId,'fixture-device');assert.equal(copied.source,'copied');
  const failed=mergeConnectionEvidence(copied,{source:'address',host:'reachy-mini.local'});assert.equal(failed.expectedHardwareId,'fixture-device');
  assert.equal(mergeConnectionEvidence(copied,{source:'address',host:'different.local'}).expectedHardwareId,null);
  assert.equal(mergeConnectionEvidence(copied,{source:'address',host:'reachy-mini.local',resetIdentity:true}).expectedHardwareId,null);
  assert.equal(mergeConnectionEvidence(copied,{source:'bluetooth',host:'reachy-mini.local',hardwareId:'newly-selected-device'}).expectedHardwareId,'newly-selected-device');
});
test('local response that conflicts with the paired identity blocks compatibility', () => {
  const evidence=mergeConnectionEvidence({source:'bluetooth',host:'reachy-mini.local',hardwareId:'paired-device'},{source:'live',host:'reachy-mini.local',checkedAt:100,reachable:true,hardwareId:'other-device',version:'1.11.0',wireless:true,ready:true});
  assert.equal(connectionSteps({evidence,now:100})[1].state,'blocked');
});
test('refreshed Bluetooth identity replaces the hotspot address without carrying credentials', () => {
  const next=bluetoothConnectionEvidence({hardwareId:'fixture-device',network:'CONNECTED [wlan0] reachy-current.local',pin:'private-secret'});
  assert.equal(next.host,'reachy-current.local');assert.equal(next.hardwareId,'fixture-device');assert.doesNotMatch(JSON.stringify(next),/private-secret|pin/);
  assert.equal(bluetoothConnectionEvidence({network:'arbitrary invalid URL'}),null);
});
test('failed authentication check does not infer sign-in from a stopped relay', () => {
  const steps=connectionSteps({evidence:{source:'live',checkedAt:100,reachable:true,version:'1.11.0',hardwareId:'fixture-device',wireless:true,ready:true,loggedIn:null,relayConnected:false},now:100});
  assert.doesNotMatch(steps[2].detail,/Reachy is signed in/);
});
