import test from 'node:test';
import assert from 'node:assert/strict';
import {RobotControl, DemoAdapter, ReachyAdapter} from '../server/control.mjs';
import {rigidPose,relativeHeadPose,slewHead,IDENTITY_POSE} from '../server/head-pose.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{for(let i=0;i<100&&!fn();i++)await sleep(10);assert.ok(fn());};
function fixture(){const adapter=new DemoAdapter();adapter.awake=true;const writes=[];const set=adapter.setHead.bind(adapter);adapter.setHead=async(p,b)=>{writes.push({p,b});await set(p,b);};return {adapter,control:new RobotControl(adapter),writes};}
async function start(control){return control.command({action:'head-start',epoch:control.epoch});}
function frame(control,token,extra={}){return control.command({action:'head-frame',epoch:control.epoch,headSession:token.headSession,sequence:0,ageMs:0,yaw:5,pitch:0,...extra});}
test('rigid matrices preserve baseline translation and bound combined slew',()=>{const base=relativeHeadPose(IDENTITY_POSE,30,10);base[3]=.12;base[7]=-.05;const pose=relativeHeadPose(base,5,-3);assert.deepEqual([pose[3],pose[7],pose[11]],[.12,-.05,.177]);assert.deepEqual(rigidPose(pose),pose);for(const invalid of [[...pose.slice(0,15)],pose.map((v,i)=>i===0?NaN:v),pose.map((v,i)=>i===15?0:v),pose.map((v,i)=>i===0?2:v)])assert.throws(()=>rigidPose(invalid));const next=slewHead({yaw:0,pitch:0},{yaw:20,pitch:15},.02);assert.ok(Math.abs(Math.hypot(next.yaw,next.pitch)-.4)<1e-9);});
test('real head target is exact matrix/body payload, with antennas omitted and real gate default off',async()=>{const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0',headTrackingEnabled:true});assert.equal(adapter.headTrackingEnabled,false);adapter.request=async(route,method,body)=>{assert.equal(route,'/api/move/set_target');assert.equal(method,'POST');assert.deepEqual(body,{target_head_pose:{m:IDENTITY_POSE},target_body_yaw:.2});return{status:'ok'};};await adapter.setHead(IDENTITY_POSE,.2);adapter.request=async()=>({status:'ignored'});await assert.rejects(adapter.setHead(IDENTITY_POSE,.2),/ignored/);});
test('head session accepts only fresh finite bounded monotonically increasing frames',async()=>{const {control}=fixture();const token=await start(control);try{for(const extra of [{yaw:NaN},{pitch:Infinity},{yaw:21},{pitch:-16},{ageMs:251},{ageMs:-1},{ageMs:'0'},{sequence:.5},{sequence:-1},{headSession:'foreign'}])await assert.rejects(frame(control,token,extra));await frame(control,token);await assert.rejects(frame(control,token),/sequence/);await assert.rejects(frame(control,token,{epoch:99,sequence:1}),/Controls changed/);assert.equal((await control.status()).headTrackingSession,token.headSession);}finally{await control.stop();}});
test('head start and follow exclude antennas, emotes, wake, sleep and concurrent start',async()=>{const {control,adapter}=fixture();const original=adapter.snapshot.bind(adapter);let release;adapter.snapshot=async()=>{await new Promise(r=>release=r);return original();};const starting=start(control);await sleep(5);await assert.rejects(start(control),/starting/);await assert.rejects(control.command({action:'antennas',left:1,epoch:0}),/head following/);release();await starting;adapter.snapshot=original;for(const action of ['antennas','emote','wake','sleep'])await assert.rejects(control.command({action,epoch:0,left:1}),/head following/);await control.stop();adapter.headTrackingEnabled=false;await assert.rejects(start(control),/disabled/);});
test('Stop drains late head write then holds fresh measured head and body, never antenna',async()=>{const {control,adapter,writes}=fixture();let release;adapter.setHead=async(p,b)=>{writes.push({p,b});if(writes.length===1)await new Promise(r=>release=r);};const token=await start(control);await frame(control,token);await until(()=>writes.length===1);const measured=relativeHeadPose(IDENTITY_POSE,-2,1);adapter.headPose=measured;adapter.bodyYaw=.14;const stopping=control.command({action:'head-stop'});release();await stopping;assert.deepEqual(writes[1],{p:measured,b:.14});assert.equal(writes.length,2);await assert.rejects(frame(control,token,{sequence:1}),/expired/);await sleep(100);assert.equal(writes.length,2);});
test('watchdog expires active session and holds without fresh frames',async()=>{const {control,writes}=fixture();const token=await start(control);await frame(control,token);await until(()=>control.stopped);assert.equal(control.headSession,null);assert.ok(writes.length>=2);const count=writes.length;await sleep(100);assert.equal(writes.length,count);});
test('foreign motion blocks a head hold and later controls until explicit Stop succeeds',async()=>{const {control,adapter,writes}=fixture();const token=await start(control);await frame(control,token);await until(()=>writes.length>0);adapter.moves=[{uuid:'foreign'}];await assert.rejects(control.stop(),/another motion/);const count=writes.length;assert.equal(control.stopPending,true);await assert.rejects(start(control),/confirmed Stop/);adapter.moves=[];await control.stop();assert.equal(writes.length,count+1);});
test('failed hold and unknown outcome never unlock controls',async()=>{const {control,adapter}=fixture();control.headHoldNeeded=true;adapter.setHead=async()=>{throw Error('hold failed');};await assert.rejects(control.stop(),/hold failed/);await assert.rejects(start(control),/confirmed Stop/);adapter.uncertain='unknown outcome';await assert.rejects(control.stop(),/unknown outcome/);assert.equal(control.stopPending,true);});
test('disconnect invalidates session and reconnect never replays accepted frames',async()=>{const {control,adapter,writes}=fixture();const token=await start(control);await frame(control,token);await until(()=>writes.length>0);const snapshot=adapter.snapshot.bind(adapter);adapter.snapshot=async()=>{throw Error('offline');};await control.status();await until(()=>control.headWorker===null);const count=writes.length;adapter.snapshot=snapshot;await control.status();await sleep(100);assert.equal(writes.length,count);assert.equal(control.headSession,null);await assert.rejects(frame(control,token,{sequence:1}),/confirmed Stop|expired/);await control.stop();});
test('latest frames coalesce behind one write and Stop fences all pending frames',async()=>{const {control,adapter,writes}=fixture();let release;adapter.setHead=async(p,b)=>{writes.push({p,b});if(writes.length===1)await new Promise(r=>release=r);};const token=await start(control);await frame(control,token);await until(()=>writes.length===1);for(let sequence=1;sequence<20;sequence++)await frame(control,token,{sequence,yaw:sequence%2?-5:5});assert.equal(writes.length,1);const stopping=control.stop();release();await stopping;assert.equal(writes.length,2);assert.equal(control.headPending,null);});
test('stale readiness halts transmission before a new target and requires guarded recovery',async()=>{const {control,adapter,writes}=fixture();const token=await start(control);await frame(control,token);await until(()=>writes.length>0);control.cachedStatus.startedAt=Date.now()-600;adapter.snapshot=async()=>{throw Error('offline');};await until(()=>control.headWorker===null);assert.equal(control.headPending,null);assert.equal(control.headSession,null);assert.equal(control.stopPending,true);const count=writes.length;await sleep(100);assert.equal(writes.length,count);});
test('newly blocked daemon readiness stops head writer and does not send an unsafe hold',async()=>{const {control,adapter,writes}=fixture();const token=await start(control);await frame(control,token);await until(()=>writes.length>0);const snapshot=adapter.snapshot.bind(adapter);adapter.snapshot=async()=>({...await snapshot(),ready:false,blockedReason:'tracker owns robot'});await control.status();await until(()=>control.headWorker===null);await until(()=>control.stopRequests===0);assert.equal(control.stopPending,true);assert.match(control.message,/tracker owns robot/);});
test('real snapshots request matrix measured head pose and body yaw',async()=>{const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});const routes=[];adapter.request=async route=>{routes.push(route);if(route==='/api/daemon/status')return {hardware_id:'test',version:'1.10.0',state:'running',backend_status:{ready:true,motor_control_mode:'enabled'}};if(route==='/api/daemon/robot-app-lock-status')return {state:'free'};if(route==='/api/apps/current-app-status')return null;if(route==='/api/move/running')return [];if(route==='/api/media/status')return {available:false};if(route==='/api/state/full?use_pose_matrix=true')return {head_pose:{m:IDENTITY_POSE},body_yaw:.21,antennas_position:[0,0]};throw Error(route);};const state=await adapter.snapshot();assert.deepEqual(state.headPose,IDENTITY_POSE);assert.equal(state.bodyYaw,.21);assert.ok(routes.includes('/api/state/full?use_pose_matrix=true'));assert.equal(state.ready,true);});
test('accepted frame stops ramping after 250ms sample age before the 400ms watchdog hold',async()=>{
  const {control,writes}=fixture();const token=await start(control);
  await frame(control,token,{yaw:20});await until(()=>writes.length>0);
  // Place the still-unfinished ramp between the two independently enforced deadlines.
  control.headSession.freshAt=Date.now()-275;
  const count=writes.length;await sleep(70);
  assert.equal(writes.length,count,'expired sample must not advance its destination');
  assert.equal(control.headSession?.id,token.headSession,'watchdog has not fired yet');
  await until(()=>control.stopped);
  assert.equal(writes.length,count+1,'watchdog sends only a fresh measured hold');
});
test('release during an awaiting head-start guard fences activation without motor writes',async()=>{
  for(const action of ['head-stop','stop']) {
    const {control,adapter,writes}=fixture();const snapshot=adapter.snapshot.bind(adapter);let release;
    adapter.snapshot=async()=>{await new Promise(r=>release=r);return snapshot();};
    const starting=start(control);const rejected=assert.rejects(starting,/Controls changed/);
    await until(()=>!!release);
    await control.command({action});release();await rejected;
    assert.equal(control.headSession,null);assert.equal(control.headWorker,null);
    assert.equal(control.headStarting,false);assert.equal(writes.length,0);
    assert.equal(control.epoch,1);assert.equal(control.stopped,true);
  }
});
test('status exposes only the explicit adapter head motion gate',async()=>{
  const {control,adapter}=fixture();assert.equal((await control.status()).headTrackingEnabled,true);
  adapter.headTrackingEnabled=false;assert.equal((await control.status()).headTrackingEnabled,false);
});
test('real pilot requires explicit enable and provides only a 2 degree attended envelope',async()=>{
  const config={robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'};
  for(const options of [{},{headTrackingEnabled:true},{headTrackingPilot:true},{headTrackingVerified:true},{headTrackingEnabled:true,headTrackingPilot:'true'}]) {
    const adapter=new ReachyAdapter({...config,...options});assert.equal(adapter.headTrackingEnabled,false);
  }
  const adapter=new ReachyAdapter({...config,headTrackingEnabled:true,headTrackingPilot:true,headTrackingVerified:false});
  assert.equal(adapter.headTrackingEnabled,true);assert.deepEqual(adapter.headTrackingLimits,{yaw:2,pitch:2,pilot:true});
  const demo=new DemoAdapter();demo.awake=true;
  adapter.snapshot=demo.snapshot.bind(demo);adapter.setHead=demo.setHead.bind(demo);
  const control=new RobotControl(adapter),token=await start(control);
  try {
    let sequence=0;
    for(const yaw of [-2,2])for(const pitch of [-2,2])await frame(control,token,{sequence:sequence++,yaw,pitch});
    for(const extra of [{yaw:2.001,pitch:0},{yaw:-2.001,pitch:0},{yaw:0,pitch:2.001},{yaw:0,pitch:-2.001}])await assert.rejects(frame(control,token,{sequence,...extra}),/Invalid/);
    assert.deepEqual((await control.status()).headTrackingLimits,{yaw:2,pitch:2,pilot:true});
  } finally { await control.stop(); }
  const verified=new ReachyAdapter({...config,headTrackingEnabled:true,headTrackingVerified:true,headTrackingPilot:true});
  assert.equal(verified.headTrackingEnabled,true);assert.deepEqual(verified.headTrackingLimits,{yaw:20,pitch:15,pilot:false});
});
const noisyMeasuredPose=[.9993008462753791,.04014576194516652,-.01715268931766613,.123,-.040156412721309695,.999199078885432,.0018933987854834744,-.047,.017226240617990305,-.0014620358680759254,1.0000960549326567,.181,0,0,0,1];
function assertProperRotation(pose){
  for(let r=0;r<3;r++)for(let s=0;s<3;s++)assert.ok(Math.abs([0,1,2].reduce((dot,k)=>dot+pose[r*4+k]*pose[s*4+k],0)-(r===s?1:0))<1e-10);
  const determinant=pose[0]*(pose[5]*pose[10]-pose[6]*pose[9])-pose[1]*(pose[4]*pose[10]-pose[6]*pose[8])+pose[2]*(pose[4]*pose[9]-pose[5]*pose[8]);
  assert.ok(Math.abs(determinant-1)<1e-10);
}
test('measured numerical rotation drift is projected to SO3 with exact translation',()=>{
  const projected=rigidPose(noisyMeasuredPose);assertProperRotation(projected);
  const correction=Math.max(...[0,1,2,4,5,6,8,9,10].map(i=>Math.abs(projected[i]-noisyMeasuredPose[i])));
  assert.ok(correction>1e-5 && correction<.001,`projection correction ${correction} must remain near measured orientation`);
  assert.deepEqual([projected[3],projected[7],projected[11]],[.123,-.047,.181]);
  assert.deepEqual(noisyMeasuredPose[0],.9993008462753791,'input remains unchanged');
  assert.deepEqual(rigidPose(projected),projected,'already proper matrices stay exact');
  assert.deepEqual(rigidPose(IDENTITY_POSE),IDENTITY_POSE);
  const mapped=relativeHeadPose(noisyMeasuredPose,2,-2);assertProperRotation(mapped);
  assert.deepEqual([mapped[3],mapped[7],mapped[11]],[.123,-.047,.181]);
});
test('near-rotation admission rejects above-bound scale, shear, reflection, affine and nonfinite input',()=>{
  for(const change of [{0:1.003},{1:.006},{0:-1},{12:.01},{15:1.01},{5:NaN}]) {
    const invalid=[...IDENTITY_POSE];for(const [key,value] of Object.entries(change))invalid[Number(key)]=value;
    assert.throws(()=>rigidPose(invalid),/Invalid|Finite/);
  }
});
test('head start and measured Stop accept bounded noisy readback while preserving translation',async()=>{
  const {control,adapter,writes}=fixture();adapter.headPose=[...noisyMeasuredPose];const token=await start(control);
  await frame(control,token,{yaw:2,pitch:1});await until(()=>writes.length>0);
  adapter.headPose=[...noisyMeasuredPose];adapter.bodyYaw=.13;await control.stop();
  assert.ok(writes.length>=2,'Stop hold follows an actual head target write');
  const hold=writes.at(-1);assertProperRotation(hold.p);
  assert.deepEqual(hold.p,rigidPose(noisyMeasuredPose),'hold uses newly measured pose, not last commanded orientation');assert.equal(hold.b,.13);
  assert.deepEqual([hold.p[3],hold.p[7],hold.p[11]],[.123,-.047,.181]);assert.equal(control.stopped,true);
});
test('explicit strict operator approval enables standard envelope without claiming verification',async()=>{
  const config={robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0',headTrackingVerified:false};
  for(const options of [{headTrackingOperatorApproved:true},{headTrackingEnabled:true,headTrackingOperatorApproved:'true'},{headTrackingEnabled:true,headTrackingOperatorApproved:1}])assert.equal(new ReachyAdapter({...config,...options}).headTrackingEnabled,false);
  const adapter=new ReachyAdapter({...config,headTrackingEnabled:true,headTrackingPilot:true,headTrackingOperatorApproved:true});
  assert.equal(adapter.headTrackingEnabled,true);assert.equal(adapter.config.headTrackingVerified,false);
  assert.deepEqual(adapter.headTrackingLimits,{yaw:20,pitch:15,pilot:false});
  const demo=new DemoAdapter();demo.awake=true;adapter.snapshot=demo.snapshot.bind(demo);adapter.setHead=demo.setHead.bind(demo);
  const control=new RobotControl(adapter),token=await start(control);
  try {
    let sequence=0;
    for(const yaw of [-20,20])for(const pitch of [-15,15])await frame(control,token,{sequence:sequence++,yaw,pitch});
    for(const extra of [{yaw:20.001,pitch:0},{yaw:-20.001,pitch:0},{yaw:0,pitch:15.001},{yaw:0,pitch:-15.001}])await assert.rejects(frame(control,token,{sequence,...extra}),/Invalid/);
  } finally {await control.stop();}
});
