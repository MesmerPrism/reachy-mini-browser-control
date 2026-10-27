import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeHeadSettling } from '../tools/Analyze-Head-Settling.mjs';
import { absoluteHeadPose, IDENTITY_POSE, manualHeadProgress } from '../server/head-pose.mjs';

const pose = yaw => ({yaw,pitch:0,roll:0,x:0,y:0,z:0});
function fixture(error = () => 1.2, end = 20000) {
  const requested=pose(3),write={epoch:2,sequence:31,startedAt:10010,completedAt:10020,outcome:'acknowledged',
    bodyYawRad:0,sent:requested,headPose:absoluteHeadPose(IDENTITY_POSE,3,0,0,requested)};
  const command={body:{action:'head-target',yaw:3,epoch:2},outcome:'acknowledged',result:{ok:true,controlEpoch:2},startedAt:10000,completedAt:10001};
  const measured=pose(1.8),progress=manualHeadProgress(requested,measured);
  const fault={kind:'unsettled-target',epoch:2,at:end,details:{...progress,lastWrite:structuredClone(write)}};
  const event = (startedAt,value=error(startedAt),overrides={}) => {
    const measured=pose(3-value),progress=manualHeadProgress(requested,measured);
    return {kind:'status',at:startedAt+15,epoch:2,ready:true,awake:true,motorMode:'enabled',headManualActive:true,
      headAngles:{yaw:measured.yaw,pitch:0,roll:0},headPositionMm:{x:0,y:0,z:0},
      diagnostics:{snapshot:{startedAt,completedAt:startedAt+15,readMs:15},lastManualHeadWrite:structuredClone(write),
        headManual:{...progress,phase:'settling',goalAcknowledged:true,postWriteRead:true,lastWrite:structuredClone(write)}},...overrides};
  };
  const events=[];for(let time=10040;time<end-20;time+=100)events.push(event(time));
  return {events,command,write,fault,event};
}

test('plateau history deduplicates snapshots and reports unchanged error without a causal label or mutation',t=>{
  t.mock.method(globalThis,'fetch',()=>{throw Error('Offline analysis cannot use the network');});
  const f=fixture(),original=structuredClone(f.events);f.events=f.events.flatMap(e=>[e,structuredClone(e)]);
  const result=analyzeHeadSettling(f);
  assert.equal(result.distinctPostAckSnapshots,100);assert.equal(result.duplicateSnapshots,100);
  assert.equal(result.coverage.enoughForWindowComparison,true);assert.equal(result.coverage.maximumDistinctSnapshotGapMs,100);
  assert.equal(result.observedWithinTolerance,0);assert(Math.abs(result.lateMinusEarlyMeanAngularErrorDeg)<1e-12);
  assert.equal(result.measuredAxisSpans.yaw,0);assert.equal(result.physicalCauseEstablished,false);
  assert.equal(result.robotRequests,0);assert.equal(result.arrivalCriteriaChanged,false);
  assert.deepEqual(f.events.filter((_,i)=>i%2===0),original);
});

test('continuing convergence remains an observed trend and oscillation retains its spread',()=>{
  const converging=analyzeHeadSettling(fixture(t=>2.8-1.5*(t-10040)/10000));
  assert(converging.lateMinusEarlyMeanAngularErrorDeg < -1);assert.equal(converging.observedWithinTolerance,0);
  const oscillating=analyzeHeadSettling(fixture(t=>Math.round((t-10040)/100)%2 ? 1.6 : 1.1));
  assert(oscillating.sampledErrors.angularErrorDeg.max-oscillating.sampledErrors.angularErrorDeg.min>.49);
  assert.equal(oscillating.measuredAxisSpans.yaw,.5);
});

test('errors are recomputed from measured axes rather than trusting diagnostic tolerance claims',()=>{
  const f=fixture();for(const e of f.events){e.diagnostics.headManual.angularErrorDeg=0;e.diagnostics.headManual.withinTolerance=true;}
  const result=analyzeHeadSettling(f);assert.equal(result.observedWithinTolerance,0);
  assert(result.sampledErrors.angularErrorDeg.min>1);
  const observed=analyzeHeadSettling(fixture(t=>t>18000 ?.8:1.2));assert(observed.observedWithinTolerance>0);
  assert.equal(observed.physicalCauseEstablished,false);
});

test('pre-ACK reads, stale snapshots, other epochs, recovery and changed targets do not enter the history',()=>{
  const f=fixture(),a=f.event(10010),b=f.event(10040),c=f.event(10140),d=f.event(10240),e=f.event(10340),g=f.event(10440);
  a.at=10030;b.at=10600;c.epoch=3;d.recoveryNeeded={kind:'unsettled-target'};
  e.diagnostics.headManual.requested.yaw=4;g.diagnostics.headManual.lastWrite.bodyYawRad=.1;
  f.events=[a,b,c,d,e,g].sort((x,y)=>x.at-y.at);
  const result=analyzeHeadSettling(f);assert.equal(result.distinctPostAckSnapshots,0);
  assert.equal(result.rejected['pre-ack-snapshot'],1);assert.equal(result.rejected['stale-or-failed-snapshot'],1);
  assert.equal(result.rejected['different-command-epoch'],1);assert.equal(result.rejected['not-active-and-admitted'],1);
  assert.equal(result.rejected['different-or-unacknowledged-endpoint'],2);
  assert.equal(result.sampledErrors.angularErrorDeg,null);assert.equal(result.lateMinusEarlyMeanAngularErrorDeg,null);
});

test('pending, mixed measurement and invalid time evidence cannot become qualified snapshots',()=>{
  for(const change of [e=>e.diagnostics.headManual.goalAcknowledged=false,e=>e.diagnostics.headManual.postWriteRead=false,
    e=>e.diagnostics.lastManualHeadWrite.outcome='pending',e=>e.diagnostics.headManual.phase='sending',
    e=>e.headAngles.yaw=NaN,e=>e.diagnostics.headManual.measured.x=.1,
    e=>e.diagnostics.snapshot.completedAt=e.at+1,e=>e.diagnostics.snapshot.readMs=-1,
    e=>e.diagnostics.snapshot.error='read failed',e=>e.diagnostics.lastFault={kind:'stale-status'}]) {
    const f=fixture();f.events=[f.events[0]];change(f.events[0]);assert.equal(analyzeHeadSettling(f).distinctPostAckSnapshots,0);
  }
});

test('short, sparse and missing boundary coverage leave window comparison unknown',()=>{
  const short=analyzeHeadSettling(fixture(()=>1.2,14000));assert.equal(short.coverage.windowsOverlap,true);
  assert.equal(short.lateMinusEarlyMeanAngularErrorDeg,null);
  for(const filter of [e=>e.at<12000||e.at>18000,e=>e.at>11000,e=>e.at<19000]) {
    const f=fixture();f.events=f.events.filter(filter);const result=analyzeHeadSettling(f);
    assert.equal(result.coverage.enoughForWindowComparison,false);assert.equal(result.lateMinusEarlyMeanAngularErrorDeg,null);
  }
});

test('epoch, exact endpoint, acknowledgement and retained fault mismatches fail closed',()=>{
  for(const change of [f=>f.command.outcome='unknown',f=>f.command.result.controlEpoch=3,f=>f.command.body.yaw=4,
    f=>f.command.body.epoch=99,f=>delete f.command.body.epoch,f=>f.command.completedAt=f.fault.at+1000,
    f=>f.write.sent.pitch=NaN,f=>f.write.headPose[3]=.001,f=>f.write.sequence=0,
    f=>f.write.startedAt=9999,f=>f.fault.at=10019,f=>f.fault.epoch=3,
    f=>f.fault.details.lastWrite.headPose[3]=.001,f=>f.fault.details.angularErrorDeg=0,
    f=>f.fault.details.measured.yaw=NaN,f=>f.events=Array(100001).fill(null)]) {
    const f=fixture();change(f);assert.throws(()=>analyzeHeadSettling(f));
  }
});

test('conflicting duplicates cannot create a sampled arrival or alter error distributions',()=>{
  for(const change of [e=>{
    e.headAngles.yaw=2.95;e.diagnostics.headManual.measured.yaw=2.95;
  },e=>{e.diagnostics.snapshot.completedAt++;e.diagnostics.snapshot.readMs++;e.at++;}]) {
    const f=fixture(),duplicate=structuredClone(f.events[0]);change(duplicate);
    f.events=[duplicate,...f.events].sort((a,b)=>a.at-b.at);
    assert.throws(()=>analyzeHeadSettling(f),/Conflicting duplicate snapshot/);
  }
});

test('asynchronous endpoint acknowledgement may precede the command response',()=>{
  const f=fixture();f.command.completedAt=f.write.completedAt+50;
  assert.equal(analyzeHeadSettling(f).distinctPostAckSnapshots,100);
});

test('clock regressions are rejected rather than mixed into error windows',()=>{
  const f=fixture();[f.events[0],f.events[1]]=[f.events[1],f.events[0]];
  assert.throws(()=>analyzeHeadSettling(f),/clock moved backwards/);
  const g=fixture();g.events[1].diagnostics.snapshot={startedAt:10030,completedAt:10045,readMs:15};
  assert.throws(()=>analyzeHeadSettling(g),/snapshot starts moved backwards/);
});

test('saved CLI handles one sequence phase and prevents ambiguous commands, public output and overwrite',async t=>{
  const localPath=fileURLToPath(new URL('../local',import.meta.url));
  await fs.mkdir(localPath,{recursive:true});
  const local=await fs.realpath(localPath);
  const directory=await fs.mkdtemp(path.join(local,'head-settling-test-'));
  t.after(async()=>{assert(directory.startsWith(local+path.sep));await fs.rm(directory,{recursive:true,force:true});});
  const f=fixture(),trace=path.join(directory,'trace.jsonl'),motion=path.join(directory,'motion.json'),stop=path.join(directory,'stop.json'),output=path.join(directory,'result.json');
  await fs.writeFile(trace,f.events.map(e=>JSON.stringify(e)).join('\n')+'\n');
  await fs.writeFile(motion,JSON.stringify({phases:[f.command]}));await fs.writeFile(stop,JSON.stringify({final:{diagnostics:{lastFault:f.fault}}}));
  const args=[fileURLToPath(new URL('../tools/Analyze-Head-Settling.mjs',import.meta.url)),'--trace',trace,'--motion',motion,'--stop',stop,'--output',output];
  const run=promisify(execFile);await run(process.execPath,args);
  const bytes=await fs.readFile(output),result=JSON.parse(bytes);
  assert.equal(result.distinctPostAckSnapshots,100);assert.match(result.inputsSha256.trace,/^[a-f0-9]{64}$/);
  await assert.rejects(run(process.execPath,args));assert.deepEqual(await fs.readFile(output),bytes);
  args[args.length-1]=path.join(directory,'rejected.json');
  await fs.writeFile(motion,JSON.stringify({phases:[f.command,f.command]}));
  await assert.rejects(run(process.execPath,args),e=>e.stderr.includes('unambiguous'));
  await assert.rejects(fs.access(args.at(-1)));
  await fs.writeFile(motion,JSON.stringify({commands:[f.command],phases:[f.command]}));
  await assert.rejects(run(process.execPath,args),e=>e.stderr.includes('unambiguous'));
  await fs.writeFile(motion,JSON.stringify({commands:[f.command]}));
  await run(process.execPath,args);await fs.unlink(args.at(-1));
  args[args.length-1]=path.resolve(local,'..','outside-head-settling.json');
  await assert.rejects(run(process.execPath,args),e=>e.stderr.includes('ignored local directory'));
});
