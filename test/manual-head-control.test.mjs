import test from 'node:test';
import assert from 'node:assert/strict';
import {RobotControl,DemoAdapter} from '../server/control.mjs';
import {headAngles,absoluteHeadPose,IDENTITY_POSE} from '../server/head-pose.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate){for(let i=0;i<150&&!predicate();i++)await sleep(5);assert.ok(predicate());}
function fixture(){const adapter=new DemoAdapter();adapter.awake=true;const writes=[];const set=adapter.setHead.bind(adapter);adapter.setHead=async(pose,body)=>{writes.push({pose,body});await set(pose,body);};return {adapter,control:new RobotControl(adapter),writes};}
const target=(control,input)=>control.command({action:'head-target',epoch:control.epoch,...input});
const near=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
test('absolute Euler helpers and status retain measured roll/translation',async()=>{
  const base=[...IDENTITY_POSE];base[3]=.12;base[7]=-.06;
  const pose=absoluteHeadPose(base,12,-7,8),angles=headAngles(pose);
  near(angles.yaw,12);near(angles.pitch,-7);near(angles.roll,8);
  assert.deepEqual([pose[3],pose[7],pose[11]],[.12,-.06,.177]);
  const {control,adapter}=fixture();adapter.headPose=pose;
  const status=await control.status();near(status.headAngles.roll,8);near(status.headAngles.yaw,12);
});
test('manual head validates bounded finite axes, speed, awake state and epoch',async()=>{
  const {control,adapter,writes}=fixture();
  await assert.rejects(target(control,{}),/axis/);
  for(const yaw of [NaN,Infinity,'1',null,20.01,-20.01])await assert.rejects(target(control,{yaw}),/yaw/);
  for(const pitch of [NaN,15.01,-15.01])await assert.rejects(target(control,{pitch}),/pitch/);
  for(const speedLimit of [4,121,NaN,Infinity,'30',false])await assert.rejects(target(control,{yaw:2,speedLimit}),/Speed/);
  adapter.awake=false;await assert.rejects(target(control,{yaw:2}),/Wake/);assert.equal(writes.length,0);
  adapter.awake=true;await control.stop();await assert.rejects(target(control,{yaw:0,epoch:0}),/Controls changed/);
});
test('one direct goal preserves measured roll, translation and body and never resends after arrival',async()=>{
  const {control,adapter,writes}=fixture();const base=[...IDENTITY_POSE];base[3]=.14;base[7]=.04;
  adapter.headPose=absoluteHeadPose(base,4,3,-6);adapter.bodyYaw=.21;
  await target(control,{yaw:12});await control.headManualWorker;
  assert.equal(writes.length,1);const sent=writes[0],angles=headAngles(sent.pose);
  near(angles.yaw,12);near(angles.pitch,3);near(angles.roll,-6);assert.equal(sent.body,.21);
  assert.deepEqual([sent.pose[3],sent.pose[7],sent.pose[11]],[.14,.04,.177]);
  assert.equal(control.headHoldNeeded,false);assert.equal(control.headManualGoal,null);
  assert.equal((await control.status()).headManualActive,false);
});
test('moving one axis preserves another unfinished accepted goal',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});};
  await target(control,{yaw:20});await until(()=>writes.length===1);
  adapter.headPose=absoluteHeadPose(IDENTITY_POSE,3,0,0);
  await target(control,{pitch:9});await until(()=>writes.length===2);
  const angles=headAngles(writes[1].pose);near(angles.yaw,20);near(angles.pitch,9);
  assert.deepEqual((await control.status()).headManualTarget,{yaw:20,pitch:9,roll:0,x:0,y:0,z:0,speedLimit:null,linearSpeedLimit:null});
  await control.stop();
});
test('Stop drains late manual write, fences queued goals and returns fresh measured head angles',async()=>{
  const {control,adapter,writes}=fixture();let release;
  adapter.setHead=async(pose,body)=>{writes.push({pose,body});if(writes.length===1)await new Promise(resolve=>release=resolve);};
  await target(control,{yaw:20,pitch:15});await until(()=>!!release);
  await target(control,{yaw:-20});
  const measured=absoluteHeadPose(IDENTITY_POSE,3,2,4);adapter.headPose=measured;adapter.bodyYaw=-.1;
  const stopping=control.stop();await assert.rejects(target(control,{yaw:0}),/confirmed Stop/);release();const result=await stopping;
  assert.equal(writes.length,2);assert.deepEqual(writes[1],{pose:measured,body:-.1});assert.equal(result.headHeld,true);
  near(result.headAngles.yaw,3);near(result.headAngles.pitch,2);near(result.headAngles.roll,4);
  await sleep(100);assert.equal(writes.length,2);assert.equal(control.headManualGoal,null);
});
test('combined limited slew remains smooth while status snapshots take 120ms',async()=>{
  const {control,adapter,writes}=fixture();const snapshot=adapter.snapshot.bind(adapter);adapter.snapshot=async()=>{await sleep(120);return snapshot();};
  await target(control,{yaw:12,pitch:9,speedLimit:30});await control.headManualWorker;
  assert.ok(writes.length>=25,JSON.stringify({count:writes.length,message:control.message,last:writes.at(-1),goal:control.headManualGoal}));
  const angles=[{yaw:0,pitch:0},...writes.map(write=>headAngles(write.pose))];
  for(let i=1;i<angles.length;i++)assert.ok(Math.hypot(angles[i].yaw-angles[i-1].yaw,angles[i].pitch-angles[i-1].pitch)<=.601);
  near(angles.at(-1).yaw,12);near(angles.at(-1).pitch,9);
});
test('policy switch during a direct POST starts new ramp from fresh measured angles',async()=>{
  const {control,adapter,writes}=fixture();let release;
  adapter.setHead=async(pose,body)=>{writes.push({pose,body});if(writes.length===1)await new Promise(resolve=>release=resolve);else adapter.headPose=pose;};
  await target(control,{yaw:20});await until(()=>!!release);
  adapter.headPose=absoluteHeadPose(IDENTITY_POSE,5,0,3);
  await target(control,{yaw:10,speedLimit:10});release();await control.headManualWorker;
  const first=headAngles(writes[1].pose);assert.ok(first.yaw>=5 && first.yaw<=5.201);assert.ok(first.roll<3 && first.roll>=2.8,'fresh roll ramps toward the unfinished accepted roll goal');near(headAngles(writes.at(-1).pose).roll,0);
});
test('stale status ends a manual trajectory and locks until confirmed Stop',async()=>{
  const {control,adapter,writes}=fixture();await target(control,{yaw:20,speedLimit:5});await until(()=>writes.length>0);
  control.cachedStatus.startedAt=Date.now()-600;adapter.snapshot=async()=>{throw Error('offline');};
  await until(()=>!control.headManualWorker);assert.equal(control.stopPending,true);assert.equal(control.headManualPending,null);
  const count=writes.length;await sleep(80);assert.equal(writes.length,count);await assert.rejects(target(control,{yaw:0}),/confirmed Stop/);
});
test('unknown outcome and failed manual hold never unlock subsequent controls',async()=>{
  const {control,adapter}=fixture();adapter.setHead=async()=>{adapter.uncertain='unknown outcome';throw Error('POST timed out');};
  await target(control,{yaw:5});await until(()=>!control.headManualWorker);
  assert.equal(control.stopPending,true);await assert.rejects(control.stop(),/unknown outcome/);
  adapter.uncertain=null;adapter.setHead=async()=>{throw Error('hold failed');};await assert.rejects(control.stop(),/hold failed/);
  await assert.rejects(target(control,{pitch:0}),/confirmed Stop/);
});
test('manual writer excludes tracking, antennas, emote, wake and sleep in both directions',async()=>{
  const {control,adapter}=fixture();adapter.setHead=async()=>{};await target(control,{yaw:20});
  for(const action of ['head-start','antennas','wake','sleep','emote'])await assert.rejects(control.command({action,epoch:control.epoch,left:1}),/motion|head following/);
  await control.stop();const token=await control.command({action:'head-start',epoch:control.epoch});
  await assert.rejects(target(control,{yaw:2}),/current motion/);assert.ok(token.headSession);await control.stop();
});
test('disconnect invalidates manual generation and never replays on reconnect',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});};await target(control,{yaw:20});await until(()=>writes.length>0);
  const snapshot=adapter.snapshot.bind(adapter);adapter.snapshot=async()=>{throw Error('offline');};await control.status();await until(()=>!control.headManualWorker);
  const count=writes.length;adapter.snapshot=snapshot;await control.status();await sleep(80);assert.equal(writes.length,count);
  assert.equal(control.headManualGoal,null);await control.stop();
});
test('Stop while manual guard awaits snapshot fences acceptance without a write',async()=>{
  const {control,adapter,writes}=fixture();const snapshot=adapter.snapshot.bind(adapter);let release;adapter.snapshot=async()=>{await new Promise(resolve=>release=resolve);return snapshot();};
  const starting=target(control,{yaw:5}),rejected=assert.rejects(starting,/Controls changed/);await until(()=>!!release);
  await control.stop();release();await rejected;assert.equal(writes.length,0);assert.equal(control.headManualStarting,false);
});
test('foreign robot motion rejects manual activation and forbids a measured Stop hold',async()=>{
  const {control,adapter,writes}=fixture();adapter.moves=[{uuid:'foreign'}];
  await assert.rejects(target(control,{yaw:3}),/Another motion/);assert.equal(writes.length,0);
  adapter.moves=[];adapter.setHead=async(pose,body)=>{writes.push({pose,body});};
  await target(control,{yaw:20});await until(()=>writes.length>0);adapter.moves=[{uuid:'foreign'}];
  const count=writes.length;await assert.rejects(control.stop(),/another motion/);
  assert.equal(writes.length,count);assert.equal(control.stopPending,true);assert.equal(adapter.moves.length,1);
});
test('slow write acknowledgements never create catch-up angular steps',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});await sleep(40);adapter.headPose=pose;};
  await target(control,{yaw:3,pitch:3,speedLimit:15});await control.headManualWorker;
  const angles=[{yaw:0,pitch:0},...writes.map(write=>headAngles(write.pose))];assert.ok(writes.length>=14);
  for(let i=1;i<angles.length;i++)assert.ok(Math.hypot(angles[i].yaw-angles[i-1].yaw,angles[i].pitch-angles[i-1].pitch)<=.301);
  near(angles.at(-1).yaw,3);near(angles.at(-1).pitch,3);
});
test('manual head gate and pilot envelope are enforced by the server',async()=>{
  const {control,adapter,writes}=fixture();adapter.headTrackingEnabled=false;
  await assert.rejects(target(control,{yaw:1}),/disabled/);assert.equal(writes.length,0);
  adapter.headTrackingEnabled=true;adapter.headTrackingLimits={yaw:2,pitch:2,pilot:true};adapter.headManualLimits={yaw:2,pitch:2,roll:2,x:2,y:2,z:2,pilot:true};
  await assert.rejects(target(control,{yaw:2.01}),/yaw/);await assert.rejects(target(control,{pitch:2.01}),/pitch/);
  await target(control,{yaw:-2,pitch:2});await control.headManualWorker;assert.equal(writes.length,1);
});
test('a snapshot started before a target ACK cannot confirm measured arrival after the ACK',async()=>{
  const {control,adapter,writes}=fixture();const snapshot=adapter.snapshot.bind(adapter);
  let releaseSnapshot,releaseWrite,reads=0;
  adapter.snapshot=async()=>{reads++;if(reads===2)await new Promise(resolve=>releaseSnapshot=resolve);return snapshot();};
  adapter.setHead=async(pose,body)=>{writes.push({pose,body});adapter.headPose=pose;await new Promise(resolve=>releaseWrite=resolve);};
  await target(control,{yaw:10});await until(()=>!!releaseSnapshot && !!releaseWrite);
  // Separate clock ticks so the old read undeniably predates the acknowledged write.
  await sleep(15);releaseWrite();await until(()=>control.headManualWriteAt>0);
  releaseSnapshot();await until(()=>control.cachedStatus?.state.headAngles?.yaw>9);
  await sleep(35);assert.ok(control.headManualGoal,'old read may report destination but cannot confirm post-write arrival');
  assert.equal(control.headHoldNeeded,true);assert.equal(writes.length,1);
  const stopping=control.stop();await until(()=>writes.length===2);releaseWrite();await stopping;
});
test('6DOF targets use native absolute millimetres and preserve omitted measured pose fields',async()=>{
  const {control,adapter,writes}=fixture();const base=[...IDENTITY_POSE];base[3]=.021;base[7]=-.022;base[11]=-.011;
  adapter.headPose=absoluteHeadPose(base,4,-3,8);adapter.bodyYaw=.19;
  await target(control,{x:7,roll:-9});await control.headManualWorker;
  assert.equal(writes.length,1);const pose=writes[0].pose,angles=headAngles(pose);
  near(pose[3],.007);near(pose[7],-.022);near(pose[11],-.011);near(angles.yaw,4);near(angles.pitch,-3);near(angles.roll,-9);near(writes[0].body,.19);
  const status=await control.status();assert.deepEqual(status.headPositionMm,{x:7,y:-22,z:-11});
  assert.equal(new DemoAdapter().headPose[11],0,'demo native translation origin is zero, not fixture head height');
});
test('6DOF fields and linear speed validate finite values and conservative server limits',async()=>{
  const {control,writes}=fixture();
  for(const [axis,bound] of [['roll',15],['x',10],['y',10],['z',10]])for(const value of [NaN,Infinity,'0',null,bound+.001,-bound-.001])await assert.rejects(target(control,{[axis]:value}),new RegExp(axis));
  for(const linearSpeedLimit of [0,.99,50.01,NaN,Infinity,'5',false])await assert.rejects(target(control,{x:1,linearSpeedLimit}),/Linear speed/);
  assert.equal(writes.length,0);await target(control,{x:10,y:-10,z:10,roll:15});await control.headManualWorker;
});
test('all omitted axes preserve unfinished accepted 6DOF goals',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});};
  await target(control,{yaw:15,roll:10,x:8,y:-5,z:3});await until(()=>writes.length===1);
  await target(control,{pitch:7});await until(()=>writes.length===2);
  const pose=writes[1].pose,angles=headAngles(pose);near(angles.yaw,15);near(angles.roll,10);near(angles.pitch,7);
  assert.deepEqual([pose[3],pose[7],pose[11]],[.008,-.005,.003]);await control.stop();
});
test('shared 6DOF slew factor respects both angular and linear 3D speed caps',async()=>{
  const {control,writes}=fixture();await target(control,{yaw:3,pitch:2,roll:2,x:3,y:2,z:2,speedLimit:10,linearSpeedLimit:5});await control.headManualWorker;
  const values=[{yaw:0,pitch:0,roll:0,x:0,y:0,z:0},...writes.map(({pose})=>({...headAngles(pose),x:pose[3]*1000,y:pose[7]*1000,z:pose[11]*1000}))];
  assert.ok(writes.length>=41);
  for(let i=1;i<values.length;i++){
    const previous=values[i-1],current=values[i];
    assert.ok(Math.hypot(current.yaw-previous.yaw,current.pitch-previous.pitch,current.roll-previous.roll)<=.2001);
    assert.ok(Math.hypot(current.x-previous.x,current.y-previous.y,current.z-previous.z)<=.1001);
  }
  near(values.at(-1).roll,2);near(values.at(-1).z,2);
});
test('Stop holds and acknowledges fresh measured translation after a delayed 6DOF write',async()=>{
  const {control,adapter,writes}=fixture();let release;adapter.setHead=async(pose,body)=>{writes.push({pose,body});if(writes.length===1)await new Promise(resolve=>release=resolve);};
  await target(control,{x:9,y:8,z:7,roll:10});await until(()=>!!release);
  const measured=absoluteHeadPose(IDENTITY_POSE,1,2,3,{x:-4,y:5,z:-11});adapter.headPose=measured;adapter.bodyYaw=.23;
  const stopping=control.stop();release();const result=await stopping;
  assert.deepEqual(writes[1],{pose:measured,body:.23});assert.deepEqual(result.headPositionMm,{x:-4,y:5,z:-11});near(result.headAngles.roll,3);
});
test('policy changes drain late POST and preserve accepted roll and translation goals',async()=>{
  const {control,adapter,writes}=fixture();let release;
  adapter.setHead=async(pose,body)=>{writes.push({pose,body});if(writes.length===1)await new Promise(resolve=>release=resolve);else adapter.headPose=pose;};
  await target(control,{roll:8,x:6,y:4,z:2});await until(()=>!!release);
  adapter.headPose=absoluteHeadPose(IDENTITY_POSE,0,0,2,{x:1,y:1,z:1});
  await target(control,{yaw:2,speedLimit:10,linearSpeedLimit:5});release();await control.headManualWorker;
  const first=writes[1].pose,firstAngles=headAngles(first);
  assert.ok(Math.hypot(first[3]*1000-1,first[7]*1000-1,first[11]*1000-1)<=.1001);
  assert.ok(Math.hypot(firstAngles.yaw,firstAngles.roll-2)<=.2001);
  const final=writes.at(-1).pose;near(headAngles(final).roll,8);near(headAngles(final).yaw,2);
  assert.deepEqual([final[3],final[7],final[11]],[.006,.004,.002]);
});
test('arrival requires both post-ACK angular and translation readback',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});adapter.headPose=absoluteHeadPose(pose,headAngles(pose).yaw,0,0,{x:0,y:0,z:0});};
  await target(control,{yaw:5,x:9});await until(()=>writes.length===1);await sleep(300);
  assert.ok(control.headManualGoal,'matching angles do not confirm translated target');assert.equal(control.headHoldNeeded,true);await control.stop();
});
