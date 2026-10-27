import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makePlan,planHash,interpolatePose,progressAt,sampleReference,daemonRequest,admitStart,curvePeaks,ComparisonExecutor,ARMS} from '../tools/trajectory-comparison.mjs';
import {absoluteHeadPose,headAngles,headPositionMm,IDENTITY_POSE,slewManualHead} from '../server/head-pose.mjs';
const zero=[...IDENTITY_POSE];zero[11]=0;
const reference={headPose:zero,bodyYaw:0,antennas:[0,0]};
const near=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/pollen-goto-reference.json',import.meta.url)));

test('both time laws and scalar-yaw/residual path match extracted pinned GotoMove math',()=>{
  for(const c of fixture.cases)for(const frame of c.frames){
    const s=progressAt(frame.u,c.law),m=interpolatePose(c.start.headPose,c.target.headPose,s);
    m.forEach((x,i)=>near(x,frame.headPose[i]));
    near(c.start.bodyYaw+(c.target.bodyYaw-c.start.bodyYaw)*s,frame.bodyYaw);
    c.start.antennas.forEach((x,i)=>near(x+(c.target.antennas[i]-x)*s,frame.antennas[i]));
  }
  const wrap=fixture.cases.find(x=>x.name==='front-yaw-policy'&&x.law==='minjerk');
  assert.ok(Math.abs(headAngles(interpolatePose(wrap.start.headPose,wrap.target.headPose,.5)).yaw)<1);
});
test('plan freezes full targets, counterbalances blocks and never arms hardware',()=>{
  const p=makePlan(reference);assert.equal(p.legs.length,18);assert.equal(p.hardwareArmed,false);assert.equal(p.synthetic,true);
  assert.deepEqual(p.legs.filter(x=>x.direction==='out').map(x=>x.arm),[...ARMS,ARMS[1],ARMS[2],ARMS[0],ARMS[2],ARMS[0],ARMS[1]]);
  assert.equal(p.policy.bodyReferenceToleranceDeg,.25);assert.equal(p.policy.telemetryMaxAgeMs,500);
  assert.throws(()=>{p.legs[0].target.bodyYaw=1;},TypeError);
  assert.equal(planHash(p),planHash(JSON.parse(JSON.stringify(p))));
  for(const arm of ARMS){const leg=p.legs.find(x=>x.arm===arm);assert.deepEqual(leg.target,p.legs[0].target);}
});
test('linear pure-roll references reproduce existing capped manual slew progression',()=>{
  const p=makePlan(reference),leg=p.legs[0],target={...headAngles(leg.target.headPose),...headPositionMm(leg.target.headPose),speedLimit:15/p.durationSeconds,linearSpeedLimit:5};
  let current={yaw:0,pitch:0,roll:0,x:0,y:0,z:0};
  for(let i=1;i<=150;i++){
    current=slewManualHead(current,target,.02);
    const output=sampleReference(p,leg,reference,Math.min(p.durationSeconds,i*.02));
    near(headAngles(output.headPose).roll,current.roll);assert.deepEqual(output.antennas,[0,0]);assert.equal(output.bodyYaw,0);
  }
});
test('invalid inputs and pressure/contact-range configurations are refused offline',()=>{
  for(const durationSeconds of [0,-1,NaN,Infinity,31])assert.throws(()=>makePlan(reference,{durationSeconds}));
  for(const rollDeltaDeg of [NaN,0,16,-16])assert.throws(()=>makePlan(reference,{rollDeltaDeg}));
  const low={...reference,headPose:absoluteHeadPose(zero,0,0,0,{x:0,y:0,z:-10})};assert.throws(()=>makePlan(low),/envelope/);
  const pressure={...reference,headPose:absoluteHeadPose(zero,0,0,0,{x:50,y:0,z:0})};assert.throws(()=>makePlan(pressure),/envelope/);
  assert.throws(()=>makePlan(reference,{durationSeconds:1}),/speed/);
  for(const u of [-.1,1.1,NaN])assert.throws(()=>progressAt(u));
});
test('fresh measured-start differences are checked without silently changing duration or body tolerance',()=>{
  const p=makePlan(reference),leg=p.legs[0];
  admitStart(p,leg,{...reference,headPose:absoluteHeadPose(zero,0,0,.5)});
  for(const actual of [
    {...reference,headPose:absoluteHeadPose(zero,0,0,1.01)},
    {...reference,headPose:absoluteHeadPose(zero,0,0,0,{x:1.01,y:0,z:0})},
    {...reference,bodyYaw:.251*Math.PI/180},
    {...reference,antennas:[1.01*Math.PI/180,0]},
  ])assert.throws(()=>admitStart(p,leg,actual),/start/);
  near(curvePeaks(reference,leg.target,p.durationSeconds).angularSpeedBoundDegS,15*1.875/3);
});
test('daemon packet explicitly preserves body and antenna targets and omits ignored interpolation selector',()=>{
  const p=makePlan(reference),body=daemonRequest(p,p.legs[4]);
  assert.deepEqual(Object.keys(body).sort(),['antennas','body_yaw','duration','head_pose']);
  assert.deepEqual(body.head_pose.m,p.legs[0].target.headPose);assert.equal(body.body_yaw,0);assert.deepEqual(body.antennas,[0,0]);
});

// Ideal, clock-driven transport fixture; not calibrated mechanism/serial physics.
function port(arm,opts={}) {
  const full=makePlan(reference,{rollDeltaDeg:1,durationSeconds:.4,blocks:1,observationWindowMs:1000});
  const plan={...full,legs:full.legs.filter(x=>x.arm===arm)};
  let time=0,epoch=0,current=structuredClone(reference),target=structuredClone(reference),task=null,writes=0;
  const events=[],calls=[],nativeTimes=[];let nextNative=opts.nextNative||0;
  const update=()=>{
    if(task){const elapsed=time-task.at;const phase=Math.min(.39,Math.floor(elapsed/10)*.01);current=sampleReference(plan,plan.legs[0],reference,phase);target=current;}
  };
  const io={wallNow:()=>100000+time,monoNow:()=>time,journal:async(type,value)=>events.push({type,value:structuredClone(value)}),
    claim:async()=>({epoch,stationarityQualified:true}),
    check:async()=>{update();return {...current,epoch,identityVerified:true,connected:true,ready:true,awake:true,mode:'enabled',
      ownerValid:true,version:'1.10.0',aimPolicyMatches:true,configurationMatches:true,
      read:{startedAt:100000+time-(opts.stale?501:0),completedAt:100000+time},...opts.sample};},
    writeTarget:async(output)=>{
      calls.push('set-target');writes++;if(opts.latency)time+=opts.latency;
      if(opts.failAt===writes)throw Error('Injected unknown write');
      if(opts.changeEpochAt===writes)epoch++;
      current=structuredClone(output);target=current;return {stage:opts.ignored?'ignored':'backend-accepted'};
    },
    goto:async body=>{calls.push('goto');assert.equal(body.interpolation,undefined);task={at:time};return {uuid:'fixture-task'};},
    taskState:async()=>{update();if(time-task.at>=400){task=null;return {listed:false};}return {listed:true};},
    readTarget:async()=>target,
    sleep:async ms=>{time+=ms;},stop:async()=>{calls.push('stop');epoch++;return {ok:true,controlEpoch:epoch};},
    observationTick:async()=>{if(time>=nextNative){nativeTimes.push(time);nextNative=time+1250;}},
    release:async()=>{calls.push('release');if(opts.releaseFailure)throw Error('Unconfirmed release');},
  };
  const executor=new ComparisonExecutor({plan,io});
  return {plan,io,executor,calls,events,nativeTimes,run:()=>executor.run(plan.legs[0].id,{approvedPlanSha256:executor.hash})};
}
for(const arm of ARMS)test(`${arm}: bounded reference, post-write observations and distinct acceptance stages`,async()=>{
  const f=port(arm),r=await f.run();assert.equal(r.phase,'complete');assert.equal(r.measuredArrival,true);assert.equal(r.nativeArrivalQualified,false);
  assert.equal(r.endpointCorrection,false);assert.ok(r.postGenerationSamples>=3);
  if(arm==='daemon-minjerk'){
    assert.equal(r.outcome,'task-no-longer-listed');assert.equal(r.writes.length,0);assert.equal(r.exactEndpointStored,false);
    assert.equal(f.calls.filter(x=>x==='goto').length,1);assert.ok(!f.calls.includes('set-target'));
  } else {
    assert.equal(r.outcome,'reference-endpoint-accepted');assert.equal(r.exactEndpointStored,true);
    assert.deepEqual(r.writes.at(-1).output, f.plan.legs[0].target);
    assert.ok(r.writes.every((x,i)=>!i||x.phaseSeconds-r.writes[i-1].phaseSeconds<=.020000001));
  }
  assert.equal(f.calls.filter(x=>x==='release').length,1);assert.ok(!f.calls.some(x=>['wake','sleep','gain','mode'].includes(x)));
  await assert.rejects(f.run(),/consumed/);
});
test('slow acknowledgements stretch capped PC phase and do not create catch-up frames',async()=>{
  const f=port('pc-minjerk',{latency:80}),r=await f.run();assert.equal(r.phase,'complete');assert.ok(r.phaseStretchMs>1000);
  assert.equal(r.writes.length,21);assert.ok(r.writes.every((x,i)=>!i||x.startedAt-r.writes[i-1].startedAt>=80));
});
test('early timer wakeups cannot advance more trajectory phase than elapsed wall time',async()=>{
 const f=port('pc-minjerk'),sleep=f.io.sleep;f.io.sleep=async ms=>sleep(ms>1?ms-1:ms);
 const r=await f.run();assert.equal(r.phase,'complete');assert.ok(r.writes.length>21);
 for(let i=1;i<r.writes.length;i++)assert.ok((r.writes[i].phaseSeconds-r.writes[i-1].phaseSeconds)*1000<=r.writes[i].startedAt-r.writes[i-1].startedAt+1e-8);
});
test('freshness, identity, power, competing aims and ownership failures withhold every target',async()=>{
  for(const opts of [{stale:true},...[
    {identityVerified:false},{version:'1.11.0'},{awake:false},{ownerValid:false},{foreignMotion:true},
    {aimPolicyMatches:false},{configurationMatches:false},{mode:'disabled'},
  ].map(sample=>({sample}))]){
    const f=port('pc-linear',opts),r=await f.run();assert.equal(r.phase,'parked');assert.equal(r.writes.length,0);
    assert.equal(f.calls.filter(x=>x==='stop').length,1);await assert.rejects(f.run(),/parked/);
  }
});
test('unknown or ignored writes and changed epochs end a leg without replay or advancing another condition',async()=>{
  for(const opts of [{failAt:2},{ignored:true},{changeEpochAt:1}]){
    const f=port('pc-minjerk',opts),r=await f.run();assert.equal(r.phase,'parked');assert.ok(r.writes.length<=2);
    assert.equal(f.calls.filter(x=>x==='stop').length,1);assert.equal(f.executor.index,0);await assert.rejects(f.run(),/parked/);
  }
});
test('cached duplicate observations cannot satisfy post-write measured arrival',async()=>{
  const f=port('pc-linear');const check=f.io.check;f.io.check=async()=>({...await check(),read:{startedAt:100000,completedAt:100000}});
  // The ordinary freshness fence parks once the cached start exceeds 500ms.
  const r=await f.run();assert.equal(r.measuredArrival,false);assert.equal(r.phase,'parked');
});
test('native observation ticks inherit cooldown; no rapid register polling is requested',async()=>{
  const f=port('pc-linear',{nextNative:900}),r=await f.run();assert.equal(r.phase,'complete');
  assert.equal(f.nativeTimes[0],900);for(let i=1;i<f.nativeTimes.length;i++)assert.ok(f.nativeTimes[i]-f.nativeTimes[i-1]>=1250);
});
test('changed plan approval, out-of-order legs and failed release cannot silently continue',async()=>{
  const f=port('pc-linear');await assert.rejects(f.executor.run(f.plan.legs[0].id,{approvedPlanSha256:'x'}),/unapproved/);
  await assert.rejects(f.executor.run(f.plan.legs[1].id,{approvedPlanSha256:f.executor.hash}),/Next preplanned/);
  const g=port('pc-linear',{releaseFailure:true}),r=await g.run();assert.equal(r.phase,'parked');assert.match(r.releaseError,/release/);
  await assert.rejects(g.run(),/parked/);
});
test('concurrent condition requests never create a second in-flight target',async()=>{
  const f=port('pc-minjerk');let release,started=false;const write=f.io.writeTarget;
  f.io.writeTarget=async(...args)=>{started=true;await new Promise(resolve=>release=resolve);return write(...args);};
  const run=f.run();for(let i=0;i<20&&!started;i++)await Promise.resolve();assert.ok(started);
  await assert.rejects(f.executor.run(f.plan.legs[1].id,{approvedPlanSha256:f.executor.hash}),/busy/);
  f.io.writeTarget=write;release();assert.equal((await run).phase,'complete');
});
test('a broken monotonic clock parks the leg before another output',async()=>{
  const f=port('pc-linear');let calls=0;f.io.monoNow=()=>++calls<3?100:90;
  const r=await f.run();assert.equal(r.phase,'parked');assert.match(r.error,/clock/);assert.equal(r.writes.length,0);
});
test('Stop/epoch changes during durable intent recording withhold both PC and daemon writes',async()=>{
  for(const arm of ['pc-linear','daemon-minjerk']){
    const f=port(arm);let epoch=0;const check=f.io.check,journal=f.io.journal;
    f.io.check=async()=>({...await check(),epoch});
    f.io.journal=async(type,value)=>{await journal(type,value);if(['target-intent','goto-intent'].includes(type))epoch++;};
    const r=await f.run();assert.equal(r.phase,'parked');assert.ok(!f.calls.includes('set-target'));assert.ok(!f.calls.includes('goto'));
  }
});
test('accepted endpoint and observed stored target remain distinct; a mismatch never triggers correction',async()=>{
  const f=port('pc-linear');f.io.readTarget=async()=>reference;
  const r=await f.run();assert.equal(r.exactEndpointAccepted,true);assert.equal(r.exactEndpointStored,false);
  assert.equal(r.phase,'parked');assert.equal(r.writes.length,21);assert.equal(r.endpointCorrection,false);
  assert.equal(r.measuredArrival,false);
});
test('every sampled body target retains the ordinary 0.25-degree fresh-reference rule',async()=>{
  const f=port('pc-linear');let body=.2*Math.PI/180;const check=f.io.check,journal=f.io.journal;
  f.io.check=async()=>({...await check(),bodyYaw:body});
  f.io.journal=async(type,value)=>{await journal(type,value);if(type==='target-intent')body=-.2*Math.PI/180;};
  const r=await f.run();assert.equal(r.phase,'parked');assert.match(r.error,/body-reference/);assert.ok(!f.calls.includes('set-target'));
});
