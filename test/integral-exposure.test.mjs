import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analyzeIntegralExposure,runIntegralAnalysis } from '../tools/Analyze-Integral-Trial.mjs';

function fixture() {
  const traces=Array.from({length:4},(_,leg)=>{
    const events=[],append=e=>events.push({sequence:events.length+1,...e});
    for(let i=0;i<=120;i++) {
      const t=1e6+i*20e6,counts=Array(6).fill(2048),q=Array(7).fill(0),position=Array(9).fill(0);
      position[5]=-10*2*Math.PI/4096;
      append({kind:'reference',frame:i+1,at_ns:t,python_tick_ns:String(9007199254740993n+BigInt(i)*20000000n),
        requested_pose_snapshot:[1,0,0,0,0,1,0,0,0,0,1,.17,0,0,0,1],joint_target_radians:q});
      append({kind:'execution',frame:i+1,at_ns:t+4000,started_ns:t+2000,completed_ns:t+3000,ok:true,encoded_counts:counts});
      append({kind:'enqueue',frame:i+1,at_ns:t+6000,started_ns:t+1000,completed_ns:t+5000,accepted:true,encoded_counts:counts});
      append({kind:'feedback',at_ns:t+10000,started_ns:t+7000,completed_ns:t+9000,read_sequence:100+i,
        cache_published:true,position_radians:position,cache_wall_seconds:102+leg*6+i*.02});
    }
    return {schema:'reachy.joint-trace.v1',native_clock:'capture-relative-monotonic-ns',epoch:1,
      owner_session:'a'.repeat(32),capture_id:'b'.repeat(32),started_ns:0,deadline_ns:30e9,sealed_ns:3e9,
      capacity:8192,overflow:false,expired:false,interrupted:false,lost_events:0,
      pose_joint_pair_atomic:false,sensor_age_known:false,coverage_qualified:false,events};
  });
  return {events:[{op:'apply-i',outcome:'intent',at:100},{op:'apply-i',outcome:'confirmed',at:100.1},
    {op:'restore-i',outcome:'intent',at:130},{op:'restore-i',outcome:'confirmed',at:130.1}],traces};
}

test('exposure includes all candidate time and keeps capture gaps unknown',()=>{
  const r=analyzeIntegralExposure(fixture());
  assert.ok(Math.abs(r.exposure.upperHostBracketSeconds-30.1)<1e-9);
  assert.ok(Math.abs(r.exposure.lowerHostBracketSeconds-29.9)<1e-9);
  assert.ok(Math.abs(r.recordedFeedbackWallSeconds-9.6)<1e-9);
  assert.ok(Math.abs(r.outsideRecordedFeedbackSeconds-20.5)<1e-9);
  assert.equal(r.gaps.length,5);assert.equal(r.robotRequests,0);
  assert.equal(r.physicalArrivalQualified,false);assert.equal(r.firmwareIntegratorStateKnown,false);
  assert.equal(r.exposure.firmwareExposureMeasured,false);
  for(const leg of r.legs) {
    assert.ok(Math.abs(leg.signedAreaCountsSeconds[4]-24)<1e-6);
    assert.deepEqual(leg.terminalHeldErrorsCounts,[0,0,0,0,10,0]);
  }
});

test('duplicate, missing, nonfinite and non-monotonic operation evidence refuses reconstruction',()=>{
  for(const mutate of [
    f=>f.events.push({...f.events.at(-1)}),f=>f.events.shift(),f=>f.events[1].at=NaN,
    f=>f.events[2].at=99,f=>f.events[3].at=100.05,f=>f.traces.pop(),
  ]) {const f=fixture();mutate(f);assert.throws(()=>analyzeIntegralExposure(f));}
});

test('bad trace coverage and incompatible wall clocks are excluded, never silently filled',()=>{
  for(const mutate of [
    f=>f.traces[0].lost_events=1,
    f=>f.traces[0].events.find(e=>e.kind==='execution').ok=false,
    f=>f.traces[0].events.find(e=>e.kind==='feedback').cache_wall_seconds=99,
    f=>f.traces[0].events.filter(e=>e.kind==='feedback')[1].cache_wall_seconds=102,
    f=>{for(const e of f.traces[1].events)if(e.kind==='feedback')e.cache_wall_seconds-=6;},
    f=>{for(const e of f.traces[3].events)if(e.kind==='feedback')e.cache_wall_seconds+=30;},
    f=>{for(const e of f.traces[0].events)if(e.kind==='feedback' && e.read_sequence>160)e.cache_wall_seconds+=.2;},
  ]) {const f=fixture();mutate(f);assert.throws(()=>analyzeIntegralExposure(f));}
});

test('monotonic area and wall exposure remain independent clocks',()=>{
  const f=fixture(),before=analyzeIntegralExposure(f);
  for(const event of f.events)event.at+=5000;
  for(const trace of f.traces)for(const e of trace.events) {
    if(e.kind==='feedback')e.cache_wall_seconds+=5000;
    if(e.kind==='reference')e.python_tick_ns=String(BigInt(e.python_tick_ns)+99999999999999999n);
  }
  const after=analyzeIntegralExposure(f);
  assert.deepEqual(after.legs.map(l=>l.signedAreaCountsSeconds),before.legs.map(l=>l.signedAreaCountsSeconds));
  assert.ok(Math.abs(after.outsideRecordedFeedbackSeconds-before.outsideRecordedFeedbackSeconds)<1e-9);
});

test('saved-file analysis confines input/output to private storage and refuses overwrite',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'reachy-integral-audit-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const directory=path.join(root,'local','synthetic');await fs.mkdir(directory,{recursive:true});
  const f=fixture();await fs.writeFile(path.join(directory,'events.jsonl'),f.events.map(e=>JSON.stringify(e)).join('\n')+'\n');
  for(let i=0;i<4;i++)await fs.writeFile(path.join(directory,`trace-${i}.json`),JSON.stringify(f.traces[i]));
  const output=path.join(root,'local','result.json');
  const value=await runIntegralAnalysis({conditionDir:directory,output,repositoryRoot:root});
  assert.equal(value.analysisOnly,true);assert.equal(JSON.parse(await fs.readFile(output,'utf8')).robotRequests,0);
  assert.equal(value.inputFiles.length,5);assert.ok(value.inputFiles.every(f=>/^[a-f0-9]{64}$/.test(f.sha256) && f.bytes>0));
  await assert.rejects(runIntegralAnalysis({conditionDir:directory,output,repositoryRoot:root}),/EEXIST/);
  await assert.rejects(runIntegralAnalysis({conditionDir:directory,output:path.join(root,'outside.json'),repositoryRoot:root}),/private local/);
  await fs.writeFile(path.join(directory,'trace-0.json'),'not-json');
  await assert.rejects(runIntegralAnalysis({conditionDir:directory,output:path.join(root,'local','bad.json'),repositoryRoot:root}));
  await assert.rejects(fs.stat(path.join(root,'local','bad.json')),/ENOENT/);
});
