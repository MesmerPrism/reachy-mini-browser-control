import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJointTrace } from '../tools/Analyze-Joint-Trace.mjs';

function capture() {
  const events=[];
  const append=e=>events.push({sequence:events.length+1,...e});
  for (let i=0;i<4;i++) {
    const t=1e6+i*20e6, q=[0,...Array.from({length:6},(_,j)=>.001*i*(j+1))];
    const counts=q.slice(1).map(x=>Math.trunc(4096*(Math.PI+x)/(2*Math.PI)));
    append({kind:'reference',frame:i+1,at_ns:t,python_tick_ns:String(9007199254740993n+BigInt(i)*20000000n),
      requested_pose_snapshot:[1,0,0,0,0,1,0,0,0,0,1,.17,0,0,0,1],joint_target_radians:q});
    // Producer resumes AFTER a fast worker has already completed the write.
    append({kind:'execution',frame:i+1,at_ns:t+4000,started_ns:t+2000,completed_ns:t+3000,ok:true,encoded_counts:counts});
    append({kind:'enqueue',frame:i+1,at_ns:t+6000,started_ns:t+1000,completed_ns:t+5000,accepted:true,encoded_counts:counts});
    append({kind:'feedback',at_ns:t+10000,started_ns:t+7000,completed_ns:t+9000,read_sequence:100+i,
      cache_published:true,position_radians:[...q,0,0],cache_wall_seconds:100+i*.02});
  }
  return {schema:'reachy.joint-trace.v1',native_clock:'capture-relative-monotonic-ns',epoch:1,
    owner_session:'a'.repeat(32),capture_id:'b'.repeat(32),started_ns:0,deadline_ns:30e9,sealed_ns:100e6,
    capacity:8192,overflow:false,expired:false,interrupted:false,lost_events:0,
    pose_joint_pair_atomic:false,sensor_age_known:false,coverage_qualified:false,events};
}
test('joins native frame phases despite producer/worker ordering; keeps clocks distinct',()=>{
  const c=capture(), result=analyzeJointTrace(c);
  assert.equal(result.coverageQualified,true);assert.equal(result.completeFrames,4);
  assert.equal(result.nativeWriteIntervalMs.median,20);assert.equal(result.nativeWriteDurationMs.max,.001);
  assert.equal(result.matchedFeedbackBrackets,4);assert.equal(result.cachedFollowingErrorDegrees[0].max,0);
  assert.equal(result.physicalArrivalQualified,false);assert.equal(result.robotRequests,0);
});
test('overflow, contention, interruption and expiry are explicit partial evidence',()=>{
  for (const change of [{overflow:true},{lost_events:1},{interrupted:true},{expired:true},{sealed_ns:30e9}]) {
    const result=analyzeJointTrace(Object.assign(capture(),change));
    assert.equal(result.coverageQualified,false);assert.ok(result.exclusions.length);
    assert.equal(result.matchedFeedbackBrackets,0);assert.equal(result.cachedFollowingErrorDegrees[0],null);
  }
});
test('missing phases and frames, failed writes and wrong conversion cannot qualify',()=>{
  const cases=[
    c=>{c.events=c.events.filter(e=>!(e.kind==='execution' && e.frame===2));},
    c=>{for(const e of c.events) if(e.frame>=2)e.frame++;},
    c=>{c.events.find(e=>e.kind==='execution').ok=false;},
    c=>{c.events.find(e=>e.kind==='enqueue').accepted=false;},
    c=>{c.events.find(e=>e.kind==='enqueue').encoded_counts[0]++;},
    c=>{c.events.find(e=>e.kind==='reference').requested_pose_snapshot=null;},
    c=>{c.events.find(e=>e.kind==='feedback').cache_published=false;},
    c=>{c.events.filter(e=>e.kind==='feedback')[1].read_sequence++;},
  ];
  for(const mutate of cases){const c=capture();mutate(c);c.events.forEach((e,i)=>e.sequence=i+1);
    const r=analyzeJointTrace(c);assert.equal(r.coverageQualified,false);assert.equal(r.matchedFeedbackBrackets,0);}
});
test('malformed or unsealed traces fail closed',()=>{
  for(const mutate of [c=>c.sealed_ns=null,c=>c.epoch=0,c=>c.capacity=20000,c=>c.events[1].completed_ns=-1,
    c=>c.events[0].python_tick_ns=9007199254740993,c=>c.events[0].joint_target_radians[0]=NaN,
    c=>c.events[1].sequence=1,c=>c.native_clock='wall-time',c=>c.pose_joint_pair_atomic=true,
    c=>c.events[0].frame=0,c=>c.events[0].at_ns=101e6]){
    const c=capture();mutate(c);assert.throws(()=>analyzeJointTrace(c));
  }
});
test('empty or insufficient captures are never evidence of a healthy controller',()=>{
  const c=capture();c.events=[];const r=analyzeJointTrace(c);
  assert.equal(r.coverageQualified,false);assert.ok(r.exclusions.includes('too-few-frames'));
});
test('serial read brackets crossing a write are excluded from following-error association',()=>{
  const c=capture();const read=c.events.find(e=>e.kind==='feedback');
  read.started_ns=1002000;read.completed_ns=1009000;
  const r=analyzeJointTrace(c);assert.equal(r.matchedFeedbackBrackets,3);
});
test('quantized step distributions preserve unchanged and mixed motor changes',()=>{
  const r=analyzeJointTrace(capture());
  assert.ok(r.countSteps[0].unchangedSteps>0);assert.ok(r.mixedChangeFrames>0);
  assert.equal(r.countSteps.length,6);
});
test('feedback entirely before target execution cannot qualify following-error coverage',()=>{
  const c=capture();
  c.events.filter(e=>e.kind==='feedback').forEach((e,i)=>{
    e.started_ns=i*100;e.completed_ns=i*100+10;e.at_ns=i*100+20;
  });
  const r=analyzeJointTrace(c);assert.equal(r.coverageQualified,false);
  assert.ok(r.exclusions.includes('too-few-aligned-feedback-brackets'));
});

function holdCapture({count=220,position=(i,j)=>2500+j,goal=i=>Array.from({length:6},(_,j)=>2500+j)}={}) {
  const c=capture();c.events=[];
  const append=e=>c.events.push({sequence:c.events.length+1,...e});
  for(let i=0;i<count;i++) {
    const t=1e6+i*20e6,counts=goal(i),q=[0,...counts.map(x=>(x+.25-2048)*2*Math.PI/4096)];
    append({kind:'reference',frame:i+1,at_ns:t,python_tick_ns:String(BigInt(i+1)*20000000n),
      requested_pose_snapshot:[1,0,0,0,0,1,0,0,0,0,1,.17,0,0,0,1],joint_target_radians:q});
    append({kind:'enqueue',frame:i+1,at_ns:t+5000,started_ns:t+1000,completed_ns:t+4000,accepted:true,encoded_counts:counts});
    append({kind:'execution',frame:i+1,at_ns:t+6000,started_ns:t+4500,completed_ns:t+5500,ok:true,encoded_counts:counts});
    append({kind:'feedback',at_ns:t+12000,started_ns:t+7000,completed_ns:t+11000,read_sequence:100+i,
      cache_published:true,position_radians:[0,...counts.map((_,j)=>(position(i,j)-2048)*2*Math.PI/4096),0,0],cache_wall_seconds:100+i*.02});
  }
  c.sealed_ns=1e6+count*20e6;return c;
}

test('terminal hold uses encoded goals and separates sub-count conversion from actual following error',()=>{
  const r=analyzeJointTrace(holdCapture()),h=r.terminalHold;
  assert.equal(r.coverageQualified,true);assert.equal(h.qualified,true);
  assert.ok(r.cachedFollowingErrorDegrees[0].median>0);
  assert.ok(Math.abs(r.encodedGoalMinusCachedPositionCounts[0].median)<1e-9);
  assert.ok(h.alignedTailSpanMs>=1900 && h.alignedTailSpanMs<=2010);
  for(const j of h.joints)assert.ok(Math.abs(j.deliveredGoalMinusCachedPositionCounts.median)<1e-9);
  assert.equal(h.physicalArrivalQualified,false);assert.equal(h.servoGoalRegisterRead,false);
  assert.equal(h.bodyReferenceRadians.median,0);assert.equal(h.cachedBodyPositionCounts.median,2048);
  assert.equal(h.bodyCommandExecutionObserved,false);
});

test('a stable large signed endpoint error is retained without declaring arrival or changing it',()=>{
  const errors=[1,-48,34,0,92,-66];
  const c=holdCapture({position:(i,j)=>2500+j-errors[j]}),original=structuredClone(c),h=analyzeJointTrace(c).terminalHold;
  assert.equal(h.qualified,true);assert.deepEqual(c,original);
  h.joints.forEach((j,i)=>{
    assert.ok(Math.abs(j.deliveredGoalMinusCachedPositionCounts.median-errors[i])<1e-9);
    assert.equal(j.cachedPositionSpanCounts,0);assert.equal(j.secondHalfMinusFirstHalfMedianCounts,0);
  });
  assert.equal(h.physicalArrivalQualified,false);
});

test('terminal window does not mix earlier ramp lag into a later held endpoint',()=>{
  const r=analyzeJointTrace(holdCapture({position:(i,j)=>2500+j-(i<50?80:0)}));
  assert.ok(r.encodedGoalMinusCachedPositionCounts[0].max>=79.999);
  assert.ok(Math.abs(r.terminalHold.joints[0].deliveredGoalMinusCachedPositionCounts.max)<1e-9);
});

test('final command suffix, rather than one joint or a historical plateau, determines hold eligibility',()=>{
  const h=analyzeJointTrace(holdCapture({goal:i=>Array.from({length:6},(_,j)=>2500+j+(i===219&&j===5?1:0))})).terminalHold;
  assert.equal(h.qualified,false);assert.ok(h.exclusions.includes('insufficient-terminal-command-hold'));assert.deepEqual(h.joints,[]);
  assert.equal(analyzeJointTrace(capture()).terminalHold.qualified,false);
});

test('a stationary command still reports continuing feedback motion within the terminal window',()=>{
  const h=analyzeJointTrace(holdCapture({position:(i,j)=>2500+j-Math.floor(i/10)})).terminalHold;
  assert.equal(h.qualified,true);assert.ok(h.joints[0].cachedPositionSpanCounts>=9);
  assert.ok(h.joints[0].secondHalfMinusFirstHalfMedianCounts<0);assert.equal(h.physicalArrivalQualified,false);
});

test('unqualified coverage and off-grid cached positions cannot become terminal encoder evidence',()=>{
  for(const flag of ['interrupted','expired','overflow']){
    const c=holdCapture();c[flag]=true;const h=analyzeJointTrace(c).terminalHold;
    assert.equal(h.qualified,false);assert.deepEqual(h.joints,[]);
  }
  const c=holdCapture({position:(i,j)=>2500+j+.125}),r=analyzeJointTrace(c);
  assert.equal(r.coverageQualified,true);assert.equal(r.terminalHold.qualified,false);
  assert.ok(r.terminalHold.exclusions.includes('feedback-not-on-encoder-grid'));
});

test('finite radians outside native count range cannot qualify terminal statistics',()=>{
  const c=holdCapture();
  c.events.filter(e=>e.kind==='feedback').forEach(e=>e.position_radians[1]=1e308);
  const h=analyzeJointTrace(c).terminalHold;
  assert.equal(h.qualified,false);assert.ok(h.exclusions.includes('feedback-count-range'));assert.deepEqual(h.joints,[]);
});
