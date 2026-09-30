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
  if(route==='/api/state/full?use_pose_matrix=true')return {head_pose:{m:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},body_yaw:0,antennas_position:[0,0]};
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
