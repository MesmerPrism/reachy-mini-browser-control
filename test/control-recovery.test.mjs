import test from 'node:test';
import assert from 'node:assert/strict';
import {RobotControl,DemoAdapter,ReachyAdapter} from '../server/control.mjs';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate){for(let i=0;i<300&&!predicate();i++)await sleep(10);assert.ok(predicate());}
function fixture(){const adapter=new DemoAdapter();adapter.awake=true;const writes=[],original=adapter.setHead.bind(adapter);adapter.setHead=async(pose,body)=>{writes.push({pose,body});await original(pose,body);};return {adapter,control:new RobotControl(adapter),writes};}
async function move(control){await control.command({action:'head-target',epoch:control.epoch,yaw:20,speedLimit:5});}
test('a transient slow mandatory snapshot fences its destination and automatically holds measured pose',async()=>{
  const {control,adapter,writes}=fixture(),snapshot=adapter.snapshot.bind(adapter);let reads=0;
  adapter.snapshot=async()=>{if(++reads===2)await sleep(700);return snapshot();};
  await move(control);await until(()=>control.stopped && !control.autoRecovery);
  assert.equal(control.headManualGoal,null);assert.equal(control.headManualPending,null);assert.ok(control.epoch>0);
  assert.equal(control.lastFault.kind,'stale-status');assert.match(control.message,/monitoring recovered/);
  const count=writes.length;await sleep(100);assert.equal(writes.length,count,'accepted goal never replays after recovery');
  assert.equal((await control.status()).ready,true);assert.equal(control.recoveryNeeded,null);
});
test('one read failure waits for fresh healthy state and drains a late write before recovery hold',async()=>{
  const {control,adapter,writes}=fixture(),snapshot=adapter.snapshot.bind(adapter);let reads=0,release;
  adapter.snapshot=async()=>{if(++reads===2)throw Error('temporary read failure');return snapshot();};
  adapter.setHead=async(pose,body)=>{writes.push({pose,body});if(writes.length===1)await new Promise(resolve=>release=resolve);};
  await move(control);await until(()=>!!release && !!control.autoRecovery);assert.equal(writes.length,1);
  await sleep(50);assert.equal(writes.length,1,'hold waits for target acknowledgment');release();
  await until(()=>control.stopped && !control.autoRecovery);assert.equal(writes.length,2);
  assert.equal(writes[1].pose[0],1);assert.equal(control.headManualGoal,null);assert.equal((await control.status()).ready,true);
});
test('finite target that cannot settle gets one fresh measured hold and truthful recovery reason',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});};
  await control.command({action:'head-target',epoch:0,yaw:20});control.headManualGoal.deadline=Date.now()-1;
  await until(()=>control.stopped && !control.autoRecovery);assert.equal(writes.length,2);
  assert.match(control.message,/could not reach/);assert.equal(control.lastFault.kind,'unsettled-target');assert.equal(control.lastFault.details.angularErrorDeg,20);assert.equal(control.lastFault.details.translationErrorMm,0);assert.equal(control.headManualGoal,null);
});
test('unknown mutation outcome never triggers a recovery write or unlock',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});adapter.uncertain='target outcome unknown';throw Error('POST timeout');};
  await move(control);await until(()=>!control.headManualWorker);await sleep(100);
  assert.equal(writes.length,1);assert.equal(control.autoRecovery,null);assert.equal(control.stopPending,true);
  assert.equal((await control.status()).recoveryNeeded.kind,'unknown-outcome');assert.equal((await control.status()).ready,false);
});
test('foreign ownership seen during recovery blocks the measured hold without retry',async()=>{
  const {control,adapter,writes}=fixture(),snapshot=adapter.snapshot.bind(adapter);let reads=0;
  adapter.snapshot=async()=>{if(++reads===2)throw Error('read failed');if(reads>=3)adapter.moves=[{uuid:'foreign'}];return snapshot();};
  await move(control);await until(()=>control.recoveryNeeded?.kind==='foreign-motion' && !control.autoRecovery);
  assert.equal(writes.length,1);assert.equal(control.stopPending,true);assert.equal(control.recoveryNeeded.automatic,false);
});
test('a failed automatic hold stays locked and is never retried',async()=>{
  const {control,adapter,writes}=fixture(),snapshot=adapter.snapshot.bind(adapter);let reads=0;
  adapter.snapshot=async()=>{if(++reads===2)throw Error('read failed');return snapshot();};
  adapter.setHead=async(pose,body)=>{writes.push({pose,body});if(writes.length>1)throw Error('hold rejected');};
  await move(control);await until(()=>!control.autoRecovery && control.recoveryNeeded?.kind==='hold-failed');
  await sleep(150);assert.equal(writes.length,2);assert.equal(control.stopPending,true);assert.equal((await control.status()).ready,false);
});
function criticalResponse(route){
  if(route==='/api/daemon/status')return {hardware_id:'test',version:'1.10.0',state:'running',backend_status:{ready:true,motor_control_mode:'enabled'}};
  if(route==='/api/daemon/robot-app-lock-status')return {state:'free'};
  if(route==='/api/apps/current-app-status')return null;
  if(route==='/api/move/running')return [];
  if(route==='/api/state/full?use_pose_matrix=true&with_head_joints=true')return {head_pose:{m:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},body_yaw:0,antennas_position:[0,0]};
  throw Error(route);
}
test('optional media read failures never invalidate healthy control state',async()=>{
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});
  adapter.request=async route=>{if(route==='/api/media/status')throw Error('video busy');return criticalResponse(route);};
  const control=new RobotControl(adapter);const status=await control.status();assert.equal(status.connected,true);assert.equal(status.ready,true);assert.equal(control.epoch,0);
  assert.equal(status.mediaReady,false);assert.match(adapter.mediaDiagnostics.error,/video busy/);
});
test('slow optional media request is coalesced and does not age mandatory snapshots',async()=>{
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});let mediaReads=0;
  adapter.request=async route=>{if(route==='/api/media/status'){mediaReads++;return new Promise(()=>{});}return criticalResponse(route);};
  const control=new RobotControl(adapter);await control.status();const status=await control.status();assert.equal(status.ready,true);assert.equal(mediaReads,1);
  assert.ok(status.diagnostics.snapshot.readMs<100);assert.equal(control.epoch,0);
});

test('robot timestamp and native joint evidence survive independently of local HTTP freshness',async()=>{
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});
  const native={timestamp:'2000-01-01T00:00:00+00:00',head_joints:[.1,-.2,.3,-.4,.5,-.6,.7],control_mode:'enabled'};
  adapter.request=async route=>{
    if(route==='/api/media/status')return {available:false};
    const response=criticalResponse(route);
    return route.startsWith('/api/state/full') ? {...response,...native} : response;
  };
  const control=new RobotControl(adapter);let state=await control.status(),evidence=state.diagnostics.robotState;
  assert.equal(state.ready,true);assert.equal(evidence.timestamp,native.timestamp);assert.equal(evidence.controlMode,'enabled');
  assert.equal(evidence.timestampMeaning,'response-created');assert.equal(evidence.sensorAgeKnown,false);
  assert.deepEqual(evidence.headJoints,native.head_joints);
  const read=state.diagnostics.snapshot.requests.find(request=>request.route.startsWith('/api/state/full'));
  const query=new URL(read.route,'http://robot.invalid').searchParams;
  assert.equal(query.get('with_head_joints'),'true');
  assert.equal(query.get('use_pose_matrix'),'true');
  assert.ok([...query.keys()].every(key=>!key.startsWith('with_target_')),'target flags never enter measured-state reads');
  assert.equal(evidence.readStartedAt,read.startedAt);assert.equal(evidence.readCompletedAt,read.completedAt);
  evidence.headJoints[0]=99;assert.equal(adapter.stateDiagnostics.headJoints[0],.1);assert.equal(native.head_joints[0],.1);
  state=await control.status();assert.equal(state.ready,true);assert.equal(state.diagnostics.robotState.timestamp,native.timestamp,'repeated daemon timestamp remains evidence, not a claim of sensor freshness');
  native.timestamp=null;native.head_joints=[NaN];native.control_mode=null;
  state=await control.status();assert.equal(state.ready,true);
  assert.equal(state.diagnostics.robotState.timestamp,null);assert.equal(state.diagnostics.robotState.headJoints,null);assert.equal(state.diagnostics.robotState.controlMode,null);
});

test('native joint sample time is optional evidence and cannot repair malformed joints or change admission',async()=>{
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});
  const native={head_joints:[0,.1,-.2,.3,-.4,.5,-.6],head_joints_sample_timestamp:946684800};
  const routes=[];
  adapter.request=async(route,method='GET')=>{routes.push({route,method});if(route==='/api/media/status')return {available:false};const response=criticalResponse(route);return route.startsWith('/api/state/full')?{...response,...native}:response;};
  const read=async()=>new RobotControl(adapter).status();
  let state=await read();
  assert.equal(state.ready,true);assert.equal(state.diagnostics.robotState.headJointsSampleTimestamp,946684800);
  assert.equal(state.diagnostics.robotState.sensorAgeKnown,false);
  for(const timestamp of [undefined,null,0,-1,NaN,Infinity,'946684800',true,{},Number.MAX_VALUE]) {
    native.head_joints_sample_timestamp=timestamp;state=await read();
    assert.equal(state.ready,true);assert.equal(state.diagnostics.robotState.headJointsSampleTimestamp,null);
    assert.deepEqual(state.diagnostics.robotState.headJoints,native.head_joints);
  }
  native.head_joints_sample_timestamp=946684800;
  for(const joints of [[],[0,.1,-.2,.3,-.4,.5],Array(8).fill(0),[0,0,0,0,0,0,NaN],null]) {
    native.head_joints=joints;state=await read();
    assert.equal(state.ready,true);assert.equal(state.diagnostics.robotState.headJoints,null);assert.equal(state.diagnostics.robotState.headJointsSampleTimestamp,null);
  }
  assert.ok(routes.every(r=>r.method==='GET'));
  assert.equal(routes.filter(r=>r.route.startsWith('/api/state/full')).length,16,'one existing state GET per snapshot, no added sample-time poll');
});

test('missing joint feedback and response timestamps never claim known sensor age',async()=>{
  for(const [expectedVersion,observedVersion] of [['1.10.0','1.10.0'],['1.10.0','1.11.0'],['1.11.0','1.10.0']]) {
    const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion});
    const routes=[];adapter.request=async(route,method='GET')=>{routes.push({route,method});if(route==='/api/media/status')return {available:false};const response=criticalResponse(route);if(route==='/api/daemon/status')return {...response,version:observedVersion};return route.startsWith('/api/state/full')?{...response,timestamp:new Date().toISOString(),head_joints:null}:response;};
    const state=await new RobotControl(adapter).status();
    assert.equal(state.diagnostics.robotState.headJoints,null);assert.equal(state.diagnostics.robotState.sensorAgeKnown,false);
    assert.equal(state.diagnostics.robotState.timestampMeaning,observedVersion==='1.10.0'?'response-created':'unverified');
    assert.equal(state.ready,expectedVersion===observedVersion,'diagnostic enrichment cannot widen version admission');
    assert.equal(routes.filter(r=>r.route.startsWith('/api/state/full')).length,1);assert.ok(routes.every(r=>r.method==='GET'));
  }
});
test('exhausted read recovery remains bounded across later browser polls until explicit Stop',async()=>{
  const {control,adapter}=fixture(),snapshot=adapter.snapshot.bind(adapter);let reads=0;
  adapter.snapshot=async()=>{if(++reads>1)throw Error('persistent offline');return snapshot();};
  await move(control);await until(()=>!!control.autoRecovery);control.autoRecovery.deadline=Date.now()+20;
  await until(()=>!control.autoRecovery);assert.equal(control.recoveryBlocked,true);assert.equal(control.stopPending,true);
  await control.status();await control.status();await sleep(50);assert.equal(control.autoRecovery,null,'polls cannot reset the recovery budget');
  adapter.snapshot=snapshot;await control.stop();assert.equal(control.recoveryBlocked,false);assert.equal((await control.status()).ready,true);
});

test('an over-age initial snapshot reports stale readiness without claiming disconnection or writing',async()=>{
  const {control,adapter,writes}=fixture(),snapshot=adapter.snapshot.bind(adapter);
  adapter.snapshot=async()=>{await sleep(550);return snapshot();};
  await assert.rejects(move(control),/freshness limit/);assert.equal(writes.length,0);assert.equal(control.connected,true);
  assert.ok(control.snapshotDiagnostics.readMs>=500);assert.equal(control.stopPending,false);
});

test('completed optional media reads are rate-limited independently of mandatory freshness',async()=>{
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});let mediaReads=0,mandatoryReads=0;
  adapter.request=async route=>{if(route==='/api/media/status'){mediaReads++;return {available:true,released:false,no_media:false};}mandatoryReads++;return criticalResponse(route);};
  const control=new RobotControl(adapter);
  for(let i=0;i<8;i++)assert.equal((await control.status()).ready,true);
  assert.equal(mediaReads,1,'frequent motion/status readers do not flood the optional media endpoint');
  assert.equal(mandatoryReads,40,'every completed control snapshot still reads its required live endpoints');
  adapter.mediaDiagnostics.at=Date.now()-1600;
  await control.status();assert.equal(mediaReads,2,'an expired optional read is refreshed');
});

test('failed snapshot batches drain outstanding reads before a new coalesced read can start',async t=>{
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});let release,finished=false,stateReads=0;
  adapter.request=async route=>{if(route==='/api/media/status')return {available:false};if(route==='/api/daemon/status')throw Error('daemon offline');if(route.startsWith('/api/state/full')){stateReads++;await new Promise(resolve=>release=resolve);}return criticalResponse(route);};
  t.after(()=>release?.());
  const control=new RobotControl(adapter);
  const first=control.status().then(result=>{finished=true;return result;});
  await sleep(15);assert.equal(finished,false,'one failed endpoint cannot leave the rest of its batch running invisibly');
  const second=control.status();await sleep(5);assert.equal(stateReads,1,'joining callers share the draining batch');
  release();const [a,b]=await Promise.all([first,second]);
  assert.equal(a.connected,false);assert.equal(b.connected,false);assert.equal(control.snapshotRead,null);
  assert.equal(a.diagnostics.snapshot.requests.length,5);
  assert.match(a.diagnostics.snapshot.requests.find(item=>item.route==='/api/daemon/status').error,/daemon offline/);
});

test('slow JSON body reads stay behind the freshness gate and retain endpoint timing after recovery',async t=>{
  let slow=true;
  t.mock.method(globalThis,'fetch',async url=>{
    const route=new URL(url).pathname+new URL(url).search;
    return {ok:true,status:200,json:async()=>{if(route.startsWith('/api/state/full')&&slow)await sleep(550);return route==='/api/media/status'?{available:false}:criticalResponse(route);}};
  });
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'}),control=new RobotControl(adapter);
  const old=await control.status();assert.equal(old.connected,true);assert.equal(old.ready,false);assert.match(old.blockedReason,/freshness limit/);
  const timing=old.diagnostics.snapshot.requests.find(item=>item.route.startsWith('/api/state/full'));
  assert.ok(timing.bodyMs>=500);assert.ok(timing.readMs>=500);assert.ok(timing.headerMs<100);
  assert.equal(old.diagnostics.lastSlowSnapshot.readMs,old.diagnostics.snapshot.readMs);
  slow=false;const healthy=await control.status();assert.equal(healthy.ready,true);
  assert.ok(healthy.diagnostics.lastSlowSnapshot.requests.find(item=>item.route.startsWith('/api/state/full')).bodyMs>=500,'a subsequent healthy poll retains the fault-time receipt');
});

test('failed motion POST retains full response timing, latches uncertainty and is never retried',async t=>{
  let posts=0;
  t.mock.method(globalThis,'fetch',async()=>{posts++;return {ok:true,status:200,json:async()=>{await sleep(15);throw Error('response body lost');}};});
  const adapter=new ReachyAdapter({robotUrl:'http://robot.invalid:8000',expectedHardwareId:'test',expectedVersion:'1.10.0'});
  await assert.rejects(adapter.setAntennas([0,0]),/response body lost/);
  assert.equal(posts,1);assert.match(adapter.uncertain,/unknown/);
  assert.ok(adapter.lastRequestTiming.bodyMs>=10);assert.equal(adapter.lastRequestTiming.status,200);
  assert.match(adapter.lastRequestTiming.error,/response body lost/);
});
test('worker-origin settling fault schedules recovery only after its writer reference clears',async()=>{
  const {control,adapter,writes}=fixture();adapter.setHead=async(pose,body)=>{writes.push({pose,body});};
  const scheduled=[],schedule=control.scheduleRecovery.bind(control);
  control.scheduleRecovery=()=>{scheduled.push({worker:!!control.headManualWorker,kind:control.lastFault?.kind});return schedule();};
  await control.command({action:'head-target',epoch:0,yaw:20});const worker=control.headManualWorker;control.headManualGoal.deadline=Date.now()-1;
  await worker;assert.equal(control.headManualWorker,null);
  const faultSchedule=scheduled.find(item=>item.kind==='unsettled-target');assert.ok(faultSchedule);assert.equal(faultSchedule.worker,false);
  await until(()=>control.stopped && !control.autoRecovery);assert.equal(writes.length,2);assert.equal(control.stopPending,false);
});
test('a poll read failure during active recovery keeps the automatic recovery receipt truthful',async()=>{
  const {control,adapter,writes}=fixture(),snapshot=adapter.snapshot.bind(adapter);let release;
  adapter.setHead=async(pose,body)=>{writes.push({pose,body});if(writes.length===1)await new Promise(resolve=>release=resolve);};
  await move(control);await until(()=>!!release);
  adapter.snapshot=async()=>{throw Error('poll temporarily offline');};await control.status();await until(()=>!!control.autoRecovery);
  const result=await control.status();assert.equal(result.recoveryNeeded.automatic,true);assert.equal(control.recoveryNeeded.kind,control.autoRecovery.kind);
  assert.match(control.recoveryNeeded.lastReadError,/poll temporarily offline/);assert.match(control.recoveryNeeded.reason,/Checking fresh/);
  adapter.snapshot=snapshot;release();await until(()=>control.stopped && !control.autoRecovery);assert.equal(writes.length,2);
});
