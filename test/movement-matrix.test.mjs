import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {IDENTITY_POSE,absoluteHeadPose} from '../server/head-pose.mjs';
import {parseMatrixCsv,makeMatrixPlan,makeVerticalPlan,MatrixRunner,matrixAdmission} from '../tools/movement-matrix.mjs';
import {OfflineMatrixPort} from '../tools/matrix-offline-port.mjs';
import {makePoseChart,poseToFollower,followerToPose} from '../tools/follower-pose.mjs';
const csv=fs.readFileSync(new URL('../docs/movement-comparison-matrix.csv',import.meta.url),'utf8');
const rows=parseMatrixCsv(csv),csvSha256=createHash('sha256').update(csv).digest('hex');
const neutral={headPose:IDENTITY_POSE.map((x,i)=>i===11?0:x),bodyYaw:0,antennas:[0,0]};
const plan=options=>makeMatrixPlan(neutral,rows,{csvSha256,...options});

test('focused vertical plans preserve canonical geometry, bounds and both fixed neutral returns',async()=>{
 for(const arm of ['daemon-minjerk','bounded-follower'])for(const profile of ['slow','standard']){
  const p=makeVerticalPlan(neutral,rows,{arm,profile,csvSha256}),parent=plan({profile,protocolVersion:3,cohort:p.cohort});
  assert.deepEqual(p.legs,parent.legs.filter(l=>l.arm===arm&&l.axis==='z'));
  assert.deepEqual(p.legs.map(l=>l.target.headPose[11]*1000),[-24,0,10,0]);
  assert.deepEqual(p.policy,parent.policy);assert.deepEqual(p.follower,parent.follower);assert.equal(p.selection.fullMatrix,false);
  const io=new OfflineMatrixPort(neutral),runner=new MatrixRunner({plan:p,io});let carried=null;
  for(let i=0;i<4;i++){
   const r=await runner.runNext({approvedPlanSha256:runner.hash});assert.equal(r.phase,'complete',r.error||r.releaseError);
   if(arm==='bounded-follower'){if(carried)assert.deepEqual(r.referenceEvidence.stateBefore.position,carried);carried=r.referenceEvidence.curve.target;}
  }
  assert.equal(runner.summary().completed,4);assert.equal(runner.summary().complete,true);assert.equal(runner.summary().scope,'vertical-only');assert.equal(runner.summary().fullMatrix,false);
  assert.equal(io.conditionCount,1);assert.equal(io.stopCount,1);assert.equal(io.requestedPowerCommands,0);assert.equal(runner.pendingReset,null);
  await assert.rejects(runner.runNext({approvedPlanSha256:runner.hash}));
 }
});

test('focused vertical plans reject changed geometry, duration, provenance and relaxed gates before I/O',()=>{
 const p=makeVerticalPlan(neutral,rows,{arm:'daemon-minjerk',csvSha256});
 for(const change of [q=>q.legs[0].target.headPose[11]=-.04,q=>q.legs[0].durationSeconds=1,
  q=>q.policy.telemetryMaxAgeMs=5000,q=>q.parentMatrixPlanSha256='0'.repeat(64),q=>q.legs.reverse(),
  q=>q.selection.axis='x',q=>q.rounds=2,q=>q.synthetic=false,q=>q.selection.fullMatrix=true]){
  const q=structuredClone(p);change(q);assert.throws(()=>new MatrixRunner({plan:q,io:{}}));
 }
 assert.throws(()=>makeVerticalPlan(neutral,rows,{arm:'pc-linear',csvSha256}));
});

test('animation-speed vertical presets are daemon-only, canonical and preserve ordinary speed limits',async()=>{
 for(const seconds of [1,2]){
  const p=makeVerticalPlan(neutral,rows,{arm:'daemon-minjerk',animationDurationSeconds:seconds,csvSha256}),io=new OfflineMatrixPort(neutral),runner=new MatrixRunner({plan:p,io});
  assert.equal(p.policy.maxTranslationSpeedMmS,50/seconds);assert.ok(p.legs.every(l=>l.durationSeconds===seconds));
  for(let i=0;i<4;i++)assert.equal((await runner.runNext({approvedPlanSha256:runner.hash})).phase,'complete');
  assert.equal(runner.summary().complete,true);assert.equal(io.requestedPowerCommands,0);
  const bad=structuredClone(p);bad.policy.maxTranslationSpeedMmS++;assert.throws(()=>new MatrixRunner({plan:bad,io:{}}));
 }
 assert.equal(plan().policy.maxTranslationSpeedMmS,5);
 for(const seconds of [0,.2,3,NaN,Infinity])assert.throws(()=>makeVerticalPlan(neutral,rows,{arm:'daemon-minjerk',animationDurationSeconds:seconds,csvSha256}));
 assert.throws(()=>makeVerticalPlan(neutral,rows,{arm:'bounded-follower',animationDurationSeconds:2,csvSha256}));
});

test('vertical static misses remain failures and unknown outputs cannot advance to the next leg',async()=>{
 const p=makeVerticalPlan(neutral,rows,{arm:'bounded-follower',csvSha256}),io=new OfflineMatrixPort(neutral,{residual:{z:2}}),runner=new MatrixRunner({plan:p,io});
 const r=await runner.runNext({approvedPlanSha256:runner.hash});assert.equal(r.phase,'complete');assert.equal(r.accuracyPassed,false);
 const failed=new OfflineMatrixPort(neutral,{failWriteAt:2}),blocked=new MatrixRunner({plan:p,io:failed});
 assert.equal((await blocked.runNext({approvedPlanSha256:blocked.hash})).phase,'parked');assert.equal(failed.writes,2);
 await assert.rejects(blocked.runNext({approvedPlanSha256:blocked.hash}));assert.equal(failed.requestedPowerCommands,0);
});
test('canonical geometry has all six axes, scored returns and four balanced condition orders',()=>{
 const p=plan({rounds:4});assert.equal(p.legs.length,384);assert.equal(new Set(p.legs.map(x=>x.id)).size,384);
 const edges=[];
 for(let round=1;round<=4;round++){
  const arms=[...new Set(p.legs.filter(x=>x.round===round).map(x=>x.arm))];assert.equal(arms.length,4);
  edges.push(...arms.slice(1).map((x,i)=>arms[i]+'>'+x));
  for(const arm of arms){const legs=p.legs.filter(x=>x.round===round&&x.arm===arm);assert.equal(legs.length,24);assert.equal(legs.filter(x=>x.axisCue).length,6);assert.equal(legs.filter(x=>x.direction==='return').length,12);}
 }
 assert.equal(new Set(edges).size,12);assert.ok(Object.isFrozen(p.legs));assert.equal(p.unchanged.mode,true);
 assert.throws(()=>parseMatrixCsv(csv.replace('yaw,deg,-30','yaw,deg,-40')),/target/);
 const bad=structuredClone(p);bad.policy.telemetryMaxAgeMs=5000;assert.throws(()=>new MatrixRunner({plan:bad,io:{}}),/changed/);
});
test('fixed chart roundtrip handles coupled rotations, translations and body heading without changing nonhead channels',()=>{
 const base={headPose:absoluteHeadPose(neutral.headPose,25,0,0,{x:0,y:0,z:0}),bodyYaw:25*Math.PI/180,antennas:[.1,-.2]},chart=makePoseChart(base);
 const x=[.005,-.003,.004,.12,-.1,.2],pose=followerToPose(chart,x),actual=poseToFollower(chart,pose);
 x.forEach((v,i)=>assert.ok(Math.abs(actual[i]-v)<1e-10));assert.equal(pose.bodyYaw,base.bodyYaw);assert.deepEqual(pose.antennas,base.antennas);
 assert.throws(()=>followerToPose(chart,[0,0,0,2,0,0]),/chart/);
});
test('complete four-path offline matrix preserves targets, persistent D state, owner boundaries and no power commands',async()=>{
 const p=plan(),io=new OfflineMatrixPort(neutral),runner=new MatrixRunner({plan:p,io});let dLast=null,dLegs=0;
 while(runner.index<p.legs.length){
  if(runner.pendingReset)await runner.confirmReset({approvedPlanSha256:runner.hash,checkpointId:runner.pendingReset.id});
  const leg=p.legs[runner.index],r=await runner.runNext({approvedPlanSha256:runner.hash});assert.equal(r.phase,'complete',r.error||r.releaseError);
  assert.equal(r.exactEndpointStored,true);assert.equal(r.accuracyPassed,true);assert.equal(r.startMatched,true);
  if(leg.arm==='bounded-follower'){
   const s=r.referenceEvidence.stateBefore;if(dLast)assert.deepEqual(s.position,dLast);
   dLast=r.referenceEvidence.curve.target;dLegs++;assert.equal(r.referenceEvidence.curve.proof.withinBounds,true);
  }
 }
 assert.equal(dLegs,24);assert.equal(runner.summary().complete,true);assert.equal(io.conditionCount,4);assert.equal(io.stopCount,4);
 assert.equal(io.cues.length,24);assert.equal(io.reviews.length,96);assert.equal(io.requestedPowerCommands,0);
 assert.equal(io.simulatedResets,3);
 assert.equal(runner.summary().visualRated,0);assert.throws(()=>runner.plan.legs.push({}));
 await assert.rejects(runner.runNext({approvedPlanSha256:runner.hash}));
});
test('between-condition checkpoint cannot send power commands, reuse a confirmation or redefine neutral',async()=>{
 const p=plan(),io=new OfflineMatrixPort(neutral),runner=new MatrixRunner({plan:p,io});
 for(let i=0;i<24;i++)await runner.runNext({approvedPlanSha256:runner.hash});
 const checkpoint=runner.pendingReset;assert.ok(checkpoint);
 await assert.rejects(runner.runNext({approvedPlanSha256:runner.hash}),/reset/);
 await assert.rejects(runner.confirmReset({approvedPlanSha256:runner.hash,checkpointId:'old'}));
 const confirm=io.confirmReset;io.confirmReset=async c=>({...await confirm(c),operatorConfirmedAwake:false});
 await assert.rejects(runner.confirmReset({approvedPlanSha256:runner.hash,checkpointId:checkpoint.id}));
 assert.ok(runner.pendingReset);io.confirmReset=confirm;
 await runner.confirmReset({approvedPlanSha256:runner.hash,checkpointId:checkpoint.id});
 assert.equal(runner.pendingReset,null);assert.deepEqual(runner.plan.neutral,neutral);assert.equal(io.requestedPowerCommands,0);
 await assert.rejects(runner.confirmReset({approvedPlanSha256:runner.hash,checkpointId:checkpoint.id}));
});
test('condition-closure failure retains the completed-window record and parks before any reset or next matrix',async()=>{
 const p=plan(),io=new OfflineMatrixPort(neutral);io.finishCondition=async()=>{await io.stop();return {ok:false};};
 const runner=new MatrixRunner({plan:p,io});let last;
 for(let i=0;i<24;i++)last=await runner.runNext({approvedPlanSha256:runner.hash});
 assert.equal(last.phase,'parked');assert.equal(runner.summary().recorded,24);assert.equal(runner.pendingReset,null);
 assert.equal(runner.parked,true);assert.equal(io.requestedPowerCommands,0);
});
test('ordinary static residuals produce failed accuracy and unmatched starts without hidden positioning or Sleep',async()=>{
 const p=plan(),io=new OfflineMatrixPort(neutral,{residual:{roll:2,x:2}}),runner=new MatrixRunner({plan:p,io});
 for(let n=0;n<8;n++){const r=await runner.runNext({approvedPlanSha256:runner.hash});assert.equal(r.phase,'complete',r.error);assert.equal(r.accuracyPassed,false);if(n)assert.equal(r.startMatched,false);}
 assert.equal(runner.index,8);assert.equal(io.stopCount,0);assert.equal(io.requestedPowerCommands,0);assert.equal(io.reviews.length,8);
});
test('actual path rejection, unknown write, stale telemetry and slow intent journal park without replay',async()=>{
 for(const kind of ['path','unknown','stale','slow-journal']){
  const p=plan(),io=new OfflineMatrixPort(neutral,{reviewApproved:kind!=='path',failWriteAt:kind==='unknown'?2:null});
  if(kind==='stale'){const check=io.check;io.check=async()=>({...await check(),read:{startedAt:io.time-501,completedAt:io.time}});}
  if(kind==='slow-journal'){const j=io.journal;io.journal=async(type)=>{await j(type);if(type==='target-intent')io.epoch++;};}
  const runner=new MatrixRunner({plan:p,io}),r=await runner.runNext({approvedPlanSha256:runner.hash});assert.equal(r.phase,'parked',kind);assert.equal(runner.parked,true);
  if(kind!=='unknown')assert.equal(io.writes,0,kind);else assert.equal(io.writes,2);
  assert.equal(io.active,false);await assert.rejects(runner.runNext({approvedPlanSha256:runner.hash}));
 }
});
test('unmatched diagnostic admission still rejects broad compound drift and body/reference faults',()=>{
 const p=plan(),l=p.legs[0];
 assert.equal(matrixAdmission(p,l,{...neutral,headPose:absoluteHeadPose(neutral.headPose,0,2,2,{x:-3,y:2,z:-3})}).matched,false);
 assert.throws(()=>matrixAdmission(p,l,{...neutral,bodyYaw:Math.PI/180}),/body/);
 assert.throws(()=>matrixAdmission(p,l,{...neutral,headPose:absoluteHeadPose(neutral.headPose,0,0,0,{x:0,y:0,z:-20})}),/Off-axis/);
});
test('a measured scope breach during generation parks before the next reference output',async()=>{
 const p=plan(),io=new OfflineMatrixPort(neutral),check=io.check;
 io.check=async()=>{const s=await check();return io.writes>=4?{...s,headPose:absoluteHeadPose(neutral.headPose,0,0,0,{x:0,y:0,z:-30})}:s;};
 const runner=new MatrixRunner({plan:p,io}),r=await runner.runNext({approvedPlanSha256:runner.hash});
 assert.equal(r.phase,'parked');assert.equal(io.writes,4);assert.equal(io.active,false);assert.equal(io.requestedPowerCommands,0);
});
test('not-watched feedback is missing data; duplicate scores are refused and pressure parks without Sleep',async()=>{
 const p=plan(),io=new OfflineMatrixPort(neutral),runner=new MatrixRunner({plan:p,io});
 const a=await runner.runNext({approvedPlanSha256:runner.hash});
 await assert.rejects(runner.recordVisualRating({id:a.id,watched:false,scores:{interior:0,transitions:0,coordination:0},confidence:'low'}));
 await runner.recordVisualRating({id:a.id,watched:false,scores:{interior:null,transitions:null,coordination:null},confidence:'low'});
 await assert.rejects(runner.recordVisualRating({id:a.id,watched:true,scores:{interior:1,transitions:1,coordination:1},confidence:'high'}));
 const b=await runner.runNext({approvedPlanSha256:runner.hash});
 await runner.recordVisualRating({id:b.id,watched:true,scores:{interior:2,transitions:2,coordination:1},confidence:'high',contact:'pressure'});
 assert.equal(runner.parked,true);assert.equal(io.active,false);assert.equal(io.requestedPowerCommands,0);
});
