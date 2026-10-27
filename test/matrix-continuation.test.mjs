import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {IDENTITY_POSE,absoluteHeadPose,headAngles,headPositionMm} from '../server/head-pose.mjs';
import {makeMatrixPlan,parseMatrixCsv,MatrixRunner} from '../tools/movement-matrix.mjs';
import {planHash} from '../tools/trajectory-comparison.mjs';
import {centeringCheckpoint} from '../tools/matrix-centering.mjs';
import {OfflineMatrixPort} from '../tools/matrix-offline-port.mjs';
import {MatrixSession} from '../tools/matrix-session.mjs';
import {RobotControl,DemoAdapter} from '../server/control.mjs';
import {MatrixOwnerPort} from '../tools/matrix-owner-port.mjs';
const csv=fs.readFileSync(new URL('../docs/movement-comparison-matrix.csv',import.meta.url),'utf8'),rows=parseMatrixCsv(csv);
const neutral={headPose:[...IDENTITY_POSE],bodyYaw:0,antennas:[0,0]};neutral.headPose[11]=0;
function fixture(options={}){
 const plan=makeMatrixPlan(neutral,rows,{csvSha256:createHash('sha256').update(csv).digest('hex'),profile:'slow',protocolVersion:3,...options});
 const io=new OfflineMatrixPort(neutral),runner=new MatrixRunner({plan,io});
 return {plan,io,runner,run:()=>runner.runNext({approvedPlanSha256:runner.hash})};
}
function yawResidual(f){
 const apply=f.io.apply.bind(f.io);let pending=0;
 f.io.apply=output=>{
  apply(output);const a=headAngles(output.headPose),p=headPositionMm(output.headPose);
  if(Math.abs(a.yaw)>20&&Math.abs(a.pitch)+Math.abs(a.roll)<.001)pending=Math.sign(a.yaw);
  if(pending&&Object.values({...a,...p}).every(x=>Math.abs(x)<1e-8)){
   f.io.state={...f.io.state,headPose:absoluteHeadPose(output.headPose,pending*7.2,1.38,-.19,{x:-.61,y:1.36,z:-1.86})};pending=0;
  }
 };
}
const review=f=>f.runner.reviewInterruption({approvedPlanSha256:f.runner.hash,id:f.plan.legs[f.runner.index].id,operatorConfirmed:true});
async function pause(f){
 const check=f.io.check;let stale=true;
 f.io.check=async()=>{const s=await check();return stale&&f.io.writes>=4?{...s,read:{startedAt:f.io.time-501,completedAt:f.io.time}}:s;};
 const result=await f.run();stale=false;assert.equal(result.phase,'parked');return result;
}
function session(f){
 const commands=[],control={status:async()=>({connected:true,ready:true,awake:true,motorMode:'enabled',busy:false,moves:[],controlEpoch:f.io.epoch,
  diagnostics:{snapshot:{startedAt:Date.now(),completedAt:Date.now()}}}),command:async body=>{commands.push(body.action);f.io.epoch++;return {ok:true};}};
 const s=new MatrixSession({runner:f.runner,control,observer:{qualify:async()=>{}},authority:async()=>({authorized:true,attended:true}),journal:async()=>{}});s.stage='parked';return {s,commands};
}

test('new protocol has a separate canonical hash while preserving geometry, durations, neutral and legacy policy',()=>{
 const f=fixture(),legacy=makeMatrixPlan(neutral,rows,{csvSha256:f.plan.csvSha256,profile:'slow'});
 assert.notEqual(planHash(legacy),f.runner.hash);assert.equal(legacy.schema,'reachy.six-axis-comparison.v2');assert.equal(legacy.procedure,undefined);
 assert.deepEqual(f.plan.legs.map(({id,...rest})=>rest),legacy.legs.map(({id,...rest})=>rest));assert.deepEqual(f.plan.neutral,legacy.neutral);
 const bad=structuredClone(f.plan);bad.procedure.centering.angularNoiseDeg=10;assert.throws(()=>new MatrixRunner({plan:bad,io:f.io}),/changed/);
});

test('7.2 degree return error stays a miss and next axis uses its exact reviewed inward envelope without a centering write',async()=>{
 const f=fixture();yawResidual(f);for(let i=0;i<4;i++)assert.equal((await f.run()).phase,'complete');
 assert.equal(f.runner.results.at(-1).accuracyPassed,false);const before=f.io.writes,r=await f.run();assert.equal(r.phase,'complete',r.error);
 assert.equal(r.startMatched,false);const c=f.io.reviews.at(-1).centering;assert.deepEqual(c.extendedAxes,['yaw']);assert.equal(c.precedingReturnId,f.plan.legs[3].id);
 assert.ok(c.bounds[5][1]>7.69*Math.PI/180&&c.bounds[5][1]<7.72*Math.PI/180);assert.equal(c.noPositioningWrite,true);
 assert.equal(f.io.writes-before,r.writes.length);assert.equal(f.io.requestedPowerCommands,0);assert.deepEqual(f.plan.neutral,neutral);
});

test('exact residual path approval is mandatory; missing approval withholds every next-axis target',async()=>{
 for(const fault of ['checkpoint','approval']){
  const f=fixture();yawResidual(f);for(let i=0;i<4;i++)await f.run();const writes=f.io.writes,old=f.io.reviewPath;
  f.io.reviewPath=async(...args)=>{const r=await old(...args);if(fault==='checkpoint')r.centeringCheckpointId='wrong';else r.residualEnvelopeApproved=false;return r;};
  const r=await f.run();assert.equal(r.phase,'parked');assert.match(r.error,/centering/);assert.equal(f.io.writes,writes);assert.equal(f.io.requestedPowerCommands,0);
 }
});

test('the residual envelope never grows during a block, crosses workspace bounds, or accepts unrelated compound drift',async()=>{
 const f=fixture();yawResidual(f);for(let i=0;i<4;i++)await f.run();let enabled=false;const check=f.io.check,write=f.io.writeTarget;
 f.io.writeTarget=async(...args)=>{const r=await write(...args);enabled=true;return r;};
 f.io.check=async()=>{const s=await check();return enabled?{...s,headPose:absoluteHeadPose(s.headPose,8.2,0,0,{x:0,y:0,z:0})}:s;};
 const r=await f.run();assert.equal(r.phase,'parked');assert.match(r.error,/frozen axis residual/);assert.equal(r.writes.length,1);
 const g=fixture();assert.throws(()=>centeringCheckpoint(g.plan,g.plan.legs[0],{...neutral,headPose:absoluteHeadPose(neutral.headPose,0,0,0,{x:0,y:0,z:-20})},null),/preceding-axis/);
 assert.throws(()=>centeringCheckpoint(g.plan,g.plan.legs[0],{...neutral,headPose:absoluteHeadPose(neutral.headPose,40,0,0,{x:0,y:0,z:0})},null),/outside/);
});

test('all 96 synthetic movements with return shortfall complete without hidden recentering or within-condition power cycles',async()=>{
 const f=fixture();yawResidual(f);
 while(f.runner.index<f.plan.legs.length){if(f.runner.pendingReset)await f.runner.confirmReset({approvedPlanSha256:f.runner.hash,checkpointId:f.runner.pendingReset.id});const r=await f.run();assert.equal(r.phase,'complete',r.error);}
 assert.equal(f.runner.summary().complete,true);assert.equal(f.io.conditionCount,4);assert.equal(f.io.stopCount,4);assert.equal(f.io.simulatedResets,3);assert.equal(f.io.requestedPowerCommands,0);
 assert.equal(f.io.reviews.length,96);assert.equal(f.io.reviews.filter(x=>x.centering.extendedAxes.length).length,16);assert.ok(f.runner.summary().accuracyPassed<96);
});

test('an acknowledged delay waits on GET refresh, freezes PC phase, and still sends the endpoint exactly once',async()=>{
 const f=fixture(),check=f.io.check;let stale=false,refreshed=0;const write=f.io.writeTarget;
 f.io.writeTarget=async(...args)=>{const r=await write(...args);if(f.io.writes===4){f.io.time+=900;stale=true;}return r;};
 f.io.check=async()=>{const s=await check();return stale?{...s,read:{startedAt:f.io.time-501,completedAt:f.io.time}}:s;};
 f.io.refreshRead=async()=>{refreshed++;f.io.time+=50;stale=false;};
 const r=await f.run();assert.equal(r.phase,'complete');assert.equal(refreshed,1);assert.equal(r.readRefreshes,1);assert.equal(r.matchedDynamicSample,false);
 assert.equal(r.writes.filter(x=>x.phaseSeconds===r.plannedGenerationMs/1000).length,1);assert.ok(r.writes.every((x,i)=>!i||x.phaseSeconds-r.writes[i-1].phaseSeconds<=.02000001));assert.equal(f.io.stopCount,0);
});

test('freshness refresh cannot cross changed identity, epoch, ownership or recovery state',async()=>{
 for(const change of [s=>({...s,identityVerified:false}),s=>({...s,version:'1.11.0'}),s=>({...s,epoch:s.epoch+1}),s=>({...s,ownerValid:false}),s=>({...s,uncertain:true}),s=>({...s,foreignMotion:true})]){
  const f=fixture(),check=f.io.check;let calls=0;f.io.check=async()=>change({...await check(),read:{startedAt:f.io.time-501,completedAt:f.io.time}});f.io.refreshRead=async()=>{calls++;};
  const r=await f.run();assert.equal(r.phase,'parked');assert.equal(r.interruption.kind,'admission-failed');assert.equal(calls,0);assert.equal(f.io.writes,0);await assert.rejects(review(f));
 }
});

test('bounded stale reads park; explicit qualified continuation retains the failed row and runs only the unissued remainder',async()=>{
 const f=fixture(),r=await pause(f);assert.equal(r.readRefreshes,3);assert.equal(r.dispatchProof.unknownOrFailed,0);const count=f.io.writes;
 const {s,commands}=session(f);await s.continueAfterInterruption({operatorConfirmed:true,id:r.id,approvedPlanSha256:f.runner.hash});
 assert.equal(s.stage,'waiting-remainder');assert.equal(f.runner.index,1);assert.equal(f.runner.results[0].phase,'parked');assert.equal(f.io.writes,count);
 await s.runRemainder({operatorReady:true});assert.equal(s.stage,'waiting-axis');assert.equal(f.runner.index,4);assert.deepEqual(commands,[]);
 assert.equal(f.runner.summary().interrupted,1);assert.equal(f.runner.summary().completed,3);assert.equal(f.runner.results[0].interruptionReview.noWriteReplay,true);
 await assert.rejects(s.continueAfterInterruption({operatorConfirmed:true,id:r.id,approvedPlanSha256:f.runner.hash}));
});

test('unknown writes, unconfirmed Stop, changed native settings, live tasks, stale read and wrong epochs cannot continue',async()=>{
 for(const fault of ['unknown','stop','settings','tasks','epoch','stale']){
  const f=fixture();await pause(f);const row=f.runner.results[0],old=f.io.reviewContinuation;
  if(fault==='unknown')row.dispatchProof.unknownOrFailed=1;if(fault==='stop')row.stop.ok=false;
  if(['settings','tasks','epoch','stale'].includes(fault))f.io.reviewContinuation=async()=>({...await old(),...(fault==='settings'?{configurationMatches:false}:fault==='tasks'?{ownedTaskIdsRemaining:1}:fault==='stale'?{read:{startedAt:f.io.time-501,completedAt:f.io.time}}:{controlEpoch:f.io.epoch+1})});
  const before=f.io.writes;await assert.rejects(review(f));assert.equal(f.runner.index,0);assert.equal(f.runner.parked,true);assert.equal(f.io.writes,before);
 }
});

test('owned daemon task interruption needs confirmed cancellation and empty current task lists before consumption',async()=>{
 const f=fixture();f.runner.index=72;f.runner.results=f.plan.legs.slice(0,72).map(l=>({id:l.id,phase:'complete',matrixPlanSha256:f.runner.hash,gainsChanged:false,modeCorrectionIncluded:false}));
 const check=f.io.check;let stale=true;
 f.io.check=async()=>{const s=await check();return f.io.task&&stale?{...s,read:{startedAt:f.io.time-501,completedAt:f.io.time}}:s;};
 const r=await f.run();assert.equal(r.phase,'parked');assert.ok(r.taskUuid);assert.equal(r.dispatchProof.taskAccepted,true);assert.equal(f.io.task,null);stale=false;
 assert.equal(r.readRefreshes,0); // Do not let a daemon task keep moving through a telemetry wait.
 const old=f.io.reviewContinuation;f.io.reviewContinuation=async()=>({...await old(),foreignMovesRemaining:1});await assert.rejects(review(f));
 f.io.reviewContinuation=old;await review(f);assert.equal(f.runner.index,73);assert.equal(f.runner.results.at(-1).phase,'parked');assert.equal(f.io.requestedPowerCommands,0);
});

test('interruption on the last condition leg retains the reset checkpoint and never claims a complete matrix',async()=>{
 const f=fixture();f.runner.index=23;f.runner.results=f.plan.legs.slice(0,23).map(l=>({id:l.id,phase:'complete',matrixPlanSha256:f.runner.hash,gainsChanged:false,modeCorrectionIncluded:false}));
 await pause(f);const {s,commands}=session(f);await s.continueAfterInterruption({operatorConfirmed:true,id:f.plan.legs[23].id,approvedPlanSha256:f.runner.hash});
 assert.equal(s.stage,'waiting-reset-sleep');assert.ok(f.runner.pendingReset);assert.equal(f.runner.summary().complete,false);assert.equal(f.runner.summary().interrupted,1);assert.deepEqual(commands,[]);await assert.rejects(s.runRemainder({operatorReady:true}));
 // Consumed attempts must not turn into successful trials in final summaries.
 f.runner.index=96;assert.equal(f.runner.summary().exhausted,true);assert.equal(f.runner.summary().complete,false);
});

test('real controller port requires a qualified read-only provider and independently rechecks idle locks after it',async()=>{
 const control=new RobotControl(new DemoAdapter());control.adapter.awake=true;control.epoch=2;
 const snapshot=control.adapter.snapshot.bind(control.adapter);control.adapter.snapshot=async()=>({...await snapshot(),motorMode:'enabled'});
 const good={verified:true,originalSoftwareVerified:true,aimPolicyMatches:true,configurationMatches:true,observerQualified:true,reviewRef:'synthetic-native-check',gainsChanged:false,modeCorrectionIncluded:false};
 const owner={control,allowed:async()=>{},wallNow:()=>Date.now(),journal:async()=>{}},args={owner,pathReview:async()=>{},axisReady:async()=>true,offline:true};
 const row={stop:{controlEpoch:2}},port=new MatrixOwnerPort(args);await assert.rejects(port.reviewContinuation(row),/provider/);
 port.continuationReview=async()=>good;const result=await port.reviewContinuation(row);assert.equal(result.controlEpoch,2);assert.equal(result.ownedTaskIdsRemaining,0);
 port.continuationReview=async()=>{control.stopPending=true;return good;};await assert.rejects(port.reviewContinuation(row),/idle drained/);control.stopPending=false;
 port.continuationReview=async()=>({...good,configurationMatches:false});await assert.rejects(port.reviewContinuation(row),/qualification/);
 control.owned.add('fixture-live-task');port.continuationReview=async()=>good;await assert.rejects(port.reviewContinuation(row));
});

test('historical prefix restoration binds exact old evidence without relabelling it as new protocol scores or replaying it',()=>{
 const f=fixture(),sourcePlan=makeMatrixPlan(neutral,rows,{csvSha256:f.plan.csvSha256,profile:'slow'}),sourceHash=planHash(sourcePlan);
 const sourceResults={segments:sourcePlan.legs.slice(0,28).map((l,i)=>({id:l.id,matrixPlanSha256:sourceHash,phase:i===24||i===26?'parked':'complete',
  ...(i===24||i===26?{stop:{ok:true,headHeld:true,controlEpoch:2},interruptionReview:{noWriteReplay:true,currentEpoch:2}}:{}),gainsChanged:false,modeCorrectionIncluded:false,accuracyPassed:false}))};
 const original=JSON.stringify(sourceResults),receipt={closedAsleep:true,coordinatorExited:true,sleepVisualConfirmed:true,reference:'private-historical-receipt',prefixLength:28,sourcePlanSha256:sourceHash,sourceResultsSha256:planHash(sourceResults)};
 for(const change of [r=>r.sourceResultsSha256='wrong',r=>r.closedAsleep=false]){const bad=structuredClone(receipt);change(bad);assert.throws(()=>f.runner.restoreHistoricalPrefix({approvedPlanSha256:f.runner.hash,sourcePlan,sourceResults,receipt:bad}));assert.equal(f.runner.index,0);}
 const out=f.runner.restoreHistoricalPrefix({approvedPlanSha256:f.runner.hash,sourcePlan,sourceResults,receipt});
 assert.equal(out.newProtocolScoresImported,0);assert.equal(f.runner.index,28);assert.equal(f.plan.legs[28].axis,'pitch');assert.equal(f.runner.summary().historical,28);assert.equal(f.runner.summary().completed,0);
 assert.equal(f.runner.summary().unissued,68);assert.equal(JSON.stringify(sourceResults),original);assert.equal(f.io.writes,0);assert.equal(f.io.requestedPowerCommands,0);
 assert.equal(f.runner.results[24].source.outcome,'parked');assert.equal(f.runner.results[24].matchedDynamicSample,false);
});

test('Stop during read refresh or continuation journaling fences every later output and resume mutation',async()=>{
 const f=fixture(),check=f.io.check;f.io.check=async()=>{const s=await check();return f.io.writes>=4?{...s,read:{startedAt:f.io.time-501,completedAt:f.io.time}}:s;};
 f.io.refreshRead=async()=>{f.io.epoch++;};const r=await f.run();assert.equal(r.phase,'parked');assert.equal(f.io.writes,4);assert.equal(r.interruption.kind,'admission-failed');
 const g=fixture();await pause(g);const {s,commands}=session(g),journal=g.io.journal;
 g.io.journal=async(...args)=>{await journal(...args);if(args[0]==='matrix-interruption-reviewed')await s.stop();};
 await assert.rejects(s.continueAfterInterruption({operatorConfirmed:true,id:g.plan.legs[0].id,approvedPlanSha256:g.runner.hash}),/retired/);
 assert.equal(g.runner.index,0);assert.equal(g.runner.results[0].interruptionReview,undefined);assert.equal(g.runner.parked,true);assert.deepEqual(commands,['stop']);
});

function closedResetFixture(){
 const f=fixture(),segments=f.plan.legs.slice(0,39).map((leg,i)=>({id:leg.id,matrixPlanSha256:f.runner.hash,arm:leg.arm,axis:leg.axis,
  direction:leg.direction,sign:leg.sign,round:leg.round,phase:i<28?'historical':i===38?'parked':'complete',gainsChanged:false,modeCorrectionIncluded:false,accuracyPassed:false}));
 Object.assign(segments.at(-1),{dispatchProof:{writes:20,accepted:19,withheld:0,unknownOrFailed:1,lastSequence:20,taskAccepted:false,taskUuid:null},
  writeCount:20,error:'Timed out',stopError:'Unknown outcome',releaseError:'Unconfirmed Stop'});
 const sourceResults={segments},receipt={closedAsleep:true,coordinatorExited:true,sleepAcknowledged:true,sleepVisualConfirmed:true,
  disabledNativeVerified:true,originalSoftwareVerified:true,priorWritesDrained:true,operatorStationaryConfirmed:true,
  oldUncertaintyReceiptRetained:true,storedTargetExactlyMatches:true,reference:'closed-private-run',sleepReceiptRef:'sleep-only-reconnect',uncertaintyReceiptRef:'immutable-old-uncertainty',
  sourcePlanSha256:f.runner.hash,sourceResultsSha256:planHash(sourceResults),prefixLength:segments.length};
 return {...f,sourceResults,receipt,restore(r=receipt){return f.runner.restoreClosedSession({approvedPlanSha256:f.runner.hash,sourcePlan:f.plan,sourceResults,receipt:r});}};
}
test('a new closed-reset session preserves an unknown failed row and advances only to the unissued leg',()=>{
 const f=closedResetFixture(),original=JSON.stringify(f.sourceResults),out=f.restore();
 assert.equal(f.runner.index,39);assert.equal(out.failedTrialReplayed,false);assert.equal(out.currentHardwareAdmission,false);
 assert.equal(f.runner.results.at(-1).phase,'parked');assert.equal(f.runner.results.at(-1).stopError,'Unknown outcome');
 assert.equal(f.runner.results.at(-1).closedSessionRecovery.oldOutcomeRemainsUnresolved,true);
 assert.equal(f.runner.summary().interrupted,1);assert.equal(f.runner.summary().historical,28);assert.equal(f.runner.summary().unissued,57);
 assert.equal(JSON.stringify(f.sourceResults),original);assert.equal(f.io.writes,0);assert.equal(f.io.requestedPowerCommands,0);
 assert.throws(()=>f.restore());
});
test('closed-reset import requires every terminal reset proof and exact source hashes',()=>{
 for(const key of ['closedAsleep','coordinatorExited','sleepAcknowledged','sleepVisualConfirmed','disabledNativeVerified','originalSoftwareVerified',
  'priorWritesDrained','operatorStationaryConfirmed','oldUncertaintyReceiptRetained','storedTargetExactlyMatches']){
  const f=closedResetFixture();assert.throws(()=>f.restore({...f.receipt,[key]:false}));assert.equal(f.runner.index,0);
 }
 for(const key of ['sourcePlanSha256','sourceResultsSha256','reference','sleepReceiptRef','uncertaintyReceiptRef']){
  const f=closedResetFixture();assert.throws(()=>f.restore({...f.receipt,[key]:''}));
 }
});
test('closed-reset import rejects task uncertainty, reordered rows, changed settings and nonterminal faults',()=>{
 for(const change of [s=>s.segments.at(-1).dispatchProof.taskAccepted=true,s=>s.segments.at(-1).dispatchProof.unknownOrFailed=2,
  s=>s.segments[29].id='wrong',s=>s.segments[29].gainsChanged=true,s=>s.segments[29].phase='parked',
  s=>s.segments[29].dispatchProof={unknownOrFailed:1}]){
  const f=closedResetFixture();change(f.sourceResults);f.receipt.sourceResultsSha256=planHash(f.sourceResults);assert.throws(()=>f.restore());
  assert.equal(f.runner.index,0);assert.equal(f.io.writes,0);
 }
});
test('closed-reset remainder runs without replay; prior failure keeps the full matrix incomplete',async()=>{
 const f=closedResetFixture();f.restore();
 const {s}=session(f);s.stage='waiting-wake-visual';
 await s.confirmAwake({observedAwakeAndSettled:true});assert.equal(s.stage,'waiting-remainder');
 await s.runRemainder({operatorReady:true});assert.equal(s.stage,'waiting-axis');assert.equal(f.runner.index,40);
 assert.equal(f.runner.results[38].phase,'parked');assert.equal(f.runner.results[39].phase,'complete');
 while(f.runner.index<f.plan.legs.length){if(f.runner.pendingReset)await f.runner.confirmReset({approvedPlanSha256:f.runner.hash,checkpointId:f.runner.pendingReset.id});assert.equal((await f.run()).phase,'complete');}
 assert.equal(f.runner.summary().exhausted,true);assert.equal(f.runner.summary().complete,false);assert.equal(f.runner.summary().interrupted,1);
});
function closedBoundaryFixture(){
 const f=closedResetFixture(),rows=f.plan.legs.slice(0,72).map((l,i)=>({id:l.id,matrixPlanSha256:f.runner.hash,arm:l.arm,axis:l.axis,
  direction:l.direction,sign:l.sign,round:l.round,phase:i<28?'historical':i===71?'parked':'complete',gainsChanged:false,modeCorrectionIncluded:false,accuracyPassed:false,visualRating:null}));
 Object.assign(rows.at(-1),{epoch:1,stop:{ok:true,headHeld:true,controlEpoch:2},outcome:'not-dispatched',writeCount:0,
  dispatchProof:{writes:0,accepted:0,withheld:0,unknownOrFailed:0,lastSequence:null,taskAccepted:false,taskUuid:null}});
 f.sourceResults.segments=rows;Object.assign(f.receipt,{prefixLength:72,sourceResultsSha256:planHash(f.sourceResults),storedTargetExactlyMatches:false,
  sleepCommandReceipt:{action:'sleep',outcome:'acknowledged',result:{ok:true},reference:'actual-prior-sleep',startedAt:1,completedAt:2}});return f;
}
test('a closed zero-dispatch condition boundary requires confirmed Stop and restores only the real Sleep receipt',async()=>{
 const bad=closedBoundaryFixture();bad.sourceResults.segments.at(-1).stop.ok=false;bad.receipt.sourceResultsSha256=planHash(bad.sourceResults);assert.throws(()=>bad.restore());
 const f=closedBoundaryFixture();f.restore();assert.equal(f.runner.index,72);assert.ok(f.runner.pendingReset);
 const {s,commands}=session(f);assert.equal(s.receipts.length,1);assert.equal(s.receipts[0].reference,'actual-prior-sleep');
 s.stage='waiting-wake-visual';await s.confirmAwake({observedAwakeAndSettled:true});assert.equal(s.stage,'waiting-axis');assert.deepEqual(commands,[]);
});
test('an explicitly selected vertical suffix records twenty excluded legs, executes four, and cannot claim a full matrix',async()=>{
 const f=closedBoundaryFixture();f.restore();const before=JSON.stringify(f.plan),selection=f.runner.selectFinalAxis({approvedPlanSha256:f.runner.hash,arm:'daemon-minjerk',axis:'z',operatorConfirmed:true,reference:'direct-user-vertical-only'});
 assert.equal(selection.excludedIds.length,20);assert.equal(selection.selectedIds.length,4);assert.equal(f.runner.index,92);
 assert.equal(f.runner.summary().excluded,20);assert.equal(f.runner.summary().unissued,4);assert.equal(JSON.stringify(f.plan),before);
 assert.equal(f.runner.pendingReset.nextLegId,f.plan.legs[92].id);assert.equal(f.io.writes,0);assert.equal(f.io.requestedPowerCommands,0);
 await f.runner.confirmReset({approvedPlanSha256:f.runner.hash,checkpointId:f.runner.pendingReset.id});for(let i=0;i<4;i++)assert.equal((await f.run()).phase,'complete');
 assert.equal(f.runner.summary().exhausted,true);assert.equal(f.runner.summary().complete,false);assert.equal(f.runner.results.filter(r=>r.arm==='daemon-minjerk'&&r.phase==='complete').length,4);
});
test('axis selection rejects missing authority, wrong axis/arm, replay and an active owner',()=>{
 for(const change of [v=>v.operatorConfirmed=false,v=>v.reference='',v=>v.axis='yaw',v=>v.arm='pc-linear',v=>v.approvedPlanSha256='wrong']){
  const f=closedBoundaryFixture();f.restore();const args={approvedPlanSha256:f.runner.hash,arm:'daemon-minjerk',axis:'z',operatorConfirmed:true,reference:'direct-user'};change(args);assert.throws(()=>f.runner.selectFinalAxis(args));assert.equal(f.runner.index,72);
 }
 const f=closedBoundaryFixture();f.restore();f.runner.active=true;assert.throws(()=>f.runner.selectFinalAxis({approvedPlanSha256:f.runner.hash,arm:'daemon-minjerk',axis:'z',operatorConfirmed:true,reference:'direct-user'}));
});
function stoppedTaskFixture(){
 const f=closedBoundaryFixture(),segments=f.plan.legs.slice(0,94).map((l,i)=>({id:l.id,matrixPlanSha256:f.runner.hash,arm:l.arm,axis:l.axis,
  direction:l.direction,sign:l.sign,round:l.round,phase:i<28?'historical':i>=72&&i<92?'excluded':i===93?'parked':'complete',
  gainsChanged:false,modeCorrectionIncluded:false,accuracyPassed:false,visualRating:null}));
 Object.assign(segments.at(-1),{epoch:1,writeCount:0,stopError:'Original Stop failed',releaseError:'Original hold failed',
  dispatchProof:{writes:0,accepted:0,withheld:0,unknownOrFailed:0,lastSequence:null,taskAccepted:true,taskUuid:'accepted-task'}});
 const sourceResults={segments},receipt={coordinatorExited:true,operatorPresent:true,explicitStopConfirmed:true,priorWritesDrained:true,
  originalSoftwareVerified:true,settingsVerified:true,unknownWriteAbsent:true,oldUncertaintyReceiptRetained:true,reference:'retired-known-task-owner',
  stopReceiptRef:'later-explicit-stop',stopReceipt:{ok:true,headHeld:true,controlEpoch:3},taskUuid:'accepted-task',failedAt:10,stopCompletedAt:20,
  prefixLength:94,sourcePlanSha256:f.runner.hash,sourceResultsSha256:planHash(sourceResults)};
 return {...f,sourceResults,receipt,restore(r=receipt){return f.runner.restoreStoppedSession({approvedPlanSha256:f.runner.hash,sourcePlan:f.plan,sourceResults,receipt:r});}};
}
test('known-task reconnect retains the failed row, qualifies the awake hold, and runs only the last two legs without power commands',async()=>{
 const f=stoppedTaskFixture(),original=JSON.stringify(f.sourceResults);f.restore();assert.equal(f.runner.index,94);assert.equal(JSON.stringify(f.sourceResults),original);
 assert.equal(f.runner.results[93].stopError,'Original Stop failed');assert.equal(f.runner.results[93].stoppedSessionRecovery.stopControlEpoch,3);
 const {s,commands}=session(f);s.stage='new';await s.prepareRetainedAwake();assert.equal(s.stage,'waiting-held-visual');
 await assert.rejects(s.power('wake',{operatorConfirmed:true}));await s.confirmRetainedAwake({observedAwakeAndSettled:true});assert.equal(s.stage,'waiting-remainder');
 await s.runRemainder({operatorReady:true});assert.equal(s.stage,'waiting-final-sleep');assert.deepEqual(commands,[]);
 assert.equal(f.runner.summary().excluded,20);assert.equal(f.runner.summary().exhausted,true);assert.equal(f.runner.summary().complete,false);
});
test('known-task reconnect rejects missing review, unknown writes, wrong UUID and stale or failed Stop',()=>{
 for(const change of [r=>r.settingsVerified=false,r=>r.operatorPresent=false,r=>r.coordinatorExited=false,r=>r.taskUuid='other',r=>r.stopReceipt.ok=false,
  r=>r.stopReceipt.controlEpoch=1,r=>r.stopCompletedAt=9,r=>r.sourceResultsSha256='wrong']){
  const f=stoppedTaskFixture();change(f.receipt);assert.throws(()=>f.restore());assert.equal(f.runner.index,0);assert.equal(f.io.writes,0);
 }
 const f=stoppedTaskFixture();f.sourceResults.segments.at(-1).dispatchProof.unknownOrFailed=1;f.receipt.sourceResultsSha256=planHash(f.sourceResults);assert.throws(()=>f.restore());
});
