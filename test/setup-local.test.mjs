import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseArgs,validateDaemonOrigin,configFromStatus,probeDaemon,runSetup,writeLocalConfig} from '../tools/Setup-Local.mjs';

const status={hardware_id:'test-device',version:'1.10.0'};
const fetchGood=async()=>({ok:true,json:async()=>status});
async function temp(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'reachy-setup-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
test('origin admits only plain HTTP origins',()=>{
  assert.equal(validateDaemonOrigin(' http://reachy-mini.local:8000/ '),'http://reachy-mini.local:8000');
  assert.equal(validateDaemonOrigin('http://localhost:8000'),'http://localhost:8000');
  for(const value of ['',null,'localhost:8000','https://example.com','http://user:pass@example.com','http://example.com/api','http://example.com/?a=1','http://example.com/#x'])assert.throws(()=>validateDaemonOrigin(value));
});
test('identity and exact supported version are checked, head approval is explicit',()=>{
  const ordinary=configFromStatus('http://example.com',status);
  assert.equal(ordinary.headTrackingEnabled,false);
  const approved=configFromStatus('http://example.com',status,{headFollow:true});
  assert.equal(approved.headTrackingOperatorApproved,true);
  assert.equal(approved.headTrackingEnabled,true);
  assert.equal(approved.headTrackingVerified,false);
  assert.equal(approved.headTrackingPilot,false);
  assert.equal(configFromStatus('http://example.com',status,{headFollow:'true'}).headTrackingEnabled,false);
  for(const hardware_id of ['',null,123,'invalid id','<script>'])assert.throws(()=>configFromStatus('http://example.com',{...status,hardware_id}));
  for(const version of ['1.9.0','1.10.1',null])assert.throws(()=>configFromStatus('http://example.com',{...status,version}),/Unsupported daemon version/);
});
test('probe makes exactly one read-only request with timeout and refuses redirects',async()=>{
  const calls=[];await probeDaemon('http://example.com',{fetchImpl:async(...args)=>{calls.push(args);return fetchGood();}});
  assert.equal(calls.length,1);assert.equal(calls[0][0],'http://example.com/api/daemon/status');
  assert.equal(calls[0][1].method,'GET');assert.equal(calls[0][1].redirect,'error');assert.ok(calls[0][1].signal instanceof AbortSignal);
  await assert.rejects(probeDaemon('http://example.com',{fetchImpl:async()=>({ok:false,status:503})}),/HTTP 503/);
  await assert.rejects(probeDaemon('http://example.com',{fetchImpl:async()=>{throw Error('offline');}}),/offline/);
  await assert.rejects(probeDaemon('http://example.com',{fetchImpl:async()=>({ok:true,json:async()=>{throw Error('invalid JSON');}})}),/invalid JSON/);
});
test('arguments reject accidental unattended saves and malformed options',()=>{
  assert.equal(parseArgs(['--url=http://example.com','--yes','--replace','--head-follow']).headFollow,true);
  for(const argv of [['--yes'],['--url'],['--url','--yes'],['--unknown'],['--url=x','--url=y']])assert.throws(()=>parseArgs(argv));
});
test('help has no network or file effects',async t=>{
  const root=await temp(t);await runSetup({argv:['--help'],root,fetchImpl:()=>{throw Error('unexpected network');},log:()=>{}});
  assert.deepEqual(await fs.readdir(root),[]);
});
test('new setup saves only ignored config and never logs its identity',async t=>{
  const root=await temp(t),logs=[];
  await runSetup({argv:['--url','http://example.com','--yes','--head-follow'],root,fetchImpl:fetchGood,log:message=>logs.push(message)});
  assert.deepEqual(await fs.readdir(root),['local']);assert.deepEqual(await fs.readdir(path.join(root,'local')),['config.json']);
  const saved=JSON.parse(await fs.readFile(path.join(root,'local/config.json'),'utf8'));
  assert.equal(saved.expectedHardwareId,status.hardware_id);assert.equal(saved.headTrackingOperatorApproved,true);
  assert.ok(!logs.join('\n').includes(status.hardware_id));
});
test('existing config is preserved before any probe unless explicitly replaced',async t=>{
  const root=await temp(t),target=path.join(root,'local/config.json');await fs.mkdir(path.dirname(target));await fs.writeFile(target,'original bytes');
  const fetchImpl=()=>{throw Error('unexpected network');};
  await assert.rejects(runSetup({argv:['--url','http://example.com','--yes'],root,fetchImpl,log:()=>{}}),/preserved/);
  const result=await runSetup({root,fetchImpl,interactive:true,ask:async()=>'',log:()=>{}});assert.equal(result.preserved,true);
  assert.equal(await fs.readFile(target,'utf8'),'original bytes');
});
test('explicit replacement works, but changes during the wizard are preserved',async t=>{
  const root=await temp(t),target=path.join(root,'local/config.json');await fs.mkdir(path.dirname(target));await fs.writeFile(target,'old');
  await runSetup({argv:['--url','http://example.com','--yes','--replace'],root,fetchImpl:fetchGood,log:()=>{}});
  assert.equal(JSON.parse(await fs.readFile(target,'utf8')).expectedVersion,'1.10.0');
  const expected=await fs.readFile(target);await fs.writeFile(target,'concurrent change');
  await assert.rejects(writeLocalConfig(root,{}, {replace:true,expectedExisting:expected}),/changed while setup/);
  assert.equal(await fs.readFile(target,'utf8'),'concurrent change');
});
test('unsupported version and cancelled confirmation do not save configuration',async t=>{
  const root=await temp(t);
  await assert.rejects(runSetup({argv:['--url','http://example.com','--yes'],root,fetchImpl:async()=>({ok:true,json:async()=>({...status,version:'1.11.0'})}),log:()=>{}}),/Unsupported/);
  await runSetup({argv:['--url','http://example.com'],root,fetchImpl:fetchGood,interactive:true,ask:async()=> 'n',log:()=>{}});
  assert.deepEqual(await fs.readdir(root),[]);
});
