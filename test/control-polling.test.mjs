import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as flush } from 'node:timers/promises';
import { RobotControl, DemoAdapter } from '../server/control.mjs';

async function advance(t,ms) {
  for(let elapsed=0;elapsed<ms;elapsed+=5) {
    t.mock.timers.tick(Math.min(5,ms-elapsed));
    await flush();
  }
}
async function finish(t,promise) {
  let done=false,error,value;
  promise.then(result=>{done=true;value=result;},reason=>{done=true;error=reason;});
  for(let i=0;i<800&&!done;i++)await advance(t,5);
  assert.ok(done,'bounded fake-clock operation');
  if(error)throw error;
  return value;
}
function fixture(t,latencies) {
  t.mock.timers.enable({apis:['Date','setTimeout','setInterval'],now:10000});
  const adapter=new DemoAdapter();adapter.awake=true;
  const snapshot=adapter.snapshot.bind(adapter),reads=[],writes=[];
  let active=0,maxActive=0;
  adapter.snapshot=async()=>{
    const read={startedAt:control.snapshotPendingAt,invokedAt:Date.now(),latency:latencies[reads.length]??80};reads.push(read);
    maxActive=Math.max(maxActive,++active);
    try {await new Promise(resolve=>setTimeout(resolve,read.latency));return await snapshot();}
    finally {read.completedAt=Date.now();active--;}
  };
  const control=new RobotControl(adapter);
  adapter.setHead=async(pose,body)=>writes.push({pose,body,at:Date.now(),snapshotStartedAt:control.cachedStatus?.startedAt});
  t.after(()=>{control.closed=true;control.autoRecovery&&(control.autoRecovery.cancelled=true);});
  return {control,adapter,reads,writes,maxActive:()=>maxActive};
}
const start=control=>control.command({action:'head-target',epoch:control.epoch,yaw:12,speedLimit:5});

test('motion polling handles a 125ms then 323ms read without expiring the preceding snapshot',async t=>{
  // Representative captured read durations: neither batch exceeds 500ms, but
  // a fixed 250ms interval leaves the old start >500ms while the next read waits.
  const {control,reads,writes,maxActive}=fixture(t,[125,125,323]);
  await finish(t,start(control));
  await advance(t,750);
  assert.equal(control.lastFault,null,'start-age remains fresh without changing the 500ms gate');
  assert.ok(writes.length>10);
  assert.equal(maxActive(),1,'mandatory batches never overlap');
  assert.ok(reads[2].startedAt-reads[1].startedAt<170,'next read begins without a 250ms idle cadence');
  assert.ok(writes.every(write=>write.at-write.snapshotStartedAt<=500));
  await finish(t,control.stop());
});

test('a genuinely slow read still fences the destination and retains pending-read timing',async t=>{
  const {control,reads,writes}=fixture(t,[125,700]);
  await finish(t,start(control));await advance(t,530);
  assert.equal(control.lastFault?.kind,'stale-status');
  const timing=control.lastFault.details.freshness;
  assert.ok(timing.cachedAgeMs>500);
  assert.equal(timing.pendingStartedAt,reads[1].startedAt);
  assert.ok(timing.pendingAgeMs<700);
  assert.equal(control.headManualPending,null);
  assert.equal(control.headManualGoal,null);
  const count=writes.length;
  await advance(t,100);assert.equal(writes.length,count,'no write from stale state while the batch remains pending');
  await advance(t,1000);
  assert.ok(control.epoch>0);
  assert.ok(writes.slice(count).every(w=>w.pose[0]===1),'only existing measured recovery holds may follow');
});

test('motion monitor coalesces callers and stops creating reads after cleanup',async t=>{
  const {control,reads,maxActive}=fixture(t,[125,200,200]);
  await finish(t,start(control));
  const statusA=control.status(),statusB=control.status();
  await finish(t,Promise.all([statusA,statusB]));
  assert.equal(maxActive(),1);
  await finish(t,control.stop());
  // Allow a pre-Stop read to drain, then ensure no idle monitor remains.
  await advance(t,250);const count=reads.length;
  await advance(t,1000);assert.equal(reads.length,count);
});

test('fast reads keep at least 100ms between monitor attempts',async t=>{
  const {control,reads,maxActive}=fixture(t,Array(15).fill(10));
  const stopMonitor=control.monitorStatus();
  await advance(t,1000);stopMonitor();
  assert.ok(reads.length>=9);
  assert.ok(reads.slice(1).every((read,i)=>read.startedAt-reads[i].startedAt>=100));
  assert.equal(maxActive(),1);
  await advance(t,200);const count=reads.length;
  await advance(t,500);assert.equal(reads.length,count);
});

test('cleanup during a rejected monitor read drains it without rescheduling',async t=>{
  const {control,adapter,reads,writes}=fixture(t,[]);let rejectRead,attempts=0;
  adapter.snapshot=()=>{attempts++;return new Promise((_,reject)=>{rejectRead=reject;});};
  const stopMonitor=control.monitorStatus();await flush();
  assert.equal(control.snapshotPendingAt,10000);
  stopMonitor();rejectRead(Error('offline'));await flush();
  assert.equal(control.snapshotPendingAt,null);assert.equal(control.snapshotRead,null);
  await advance(t,1000);assert.equal(attempts,1);assert.equal(writes.length,0);assert.equal(reads.length,0);
});

test('closing during a pending monitor read prevents further polling after completion',async t=>{
  const {control,reads,writes}=fixture(t,[200]);
  const stopMonitor=control.monitorStatus();await flush();
  control.closed=true;await advance(t,1000);stopMonitor();
  assert.equal(reads.length,1);assert.equal(control.snapshotPendingAt,null);
  assert.equal(control.snapshotRead,null);assert.equal(writes.length,0);
});
