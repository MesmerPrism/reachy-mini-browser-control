import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const finite = x => typeof x === 'number' && Number.isFinite(x);
const integer = x => Number.isSafeInteger(x) && x >= 0;
const vector = (x,n) => Array.isArray(x) && x.length === n && x.every(finite);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const encode = q => Math.max(-2147483648,Math.min(2147483647,Math.trunc(4096*(Math.PI+q)/(2*Math.PI))));
const stats = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b)=>a-b);
  return {count:values.length,min:sorted[0],median:sorted[Math.floor(sorted.length/2)],
    p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1)};
};
const intervals = rows => rows.slice(1).map((r,i)=>(r-rows[i])/1e6);

function terminalHold(complete, aligned, coverageQualified) {
  const tailWindowNs=2e9, minimumSpanNs=1e9, exclusions=[];
  const last=complete.at(-1);
  if (!coverageQualified || !last) exclusions.push('trace-coverage-unqualified');
  const goal=last?.execution.encoded_counts ?? null;
  let first=complete.length-1;
  while (first>0 && same(complete[first-1].execution.encoded_counts,goal)) first--;
  const plateauStart=last ? complete[first].execution.completed_ns : null;
  const plateauEnd=last?.execution.completed_ns ?? null;
  const end=aligned.at(-1)?.read.completed_ns ?? null;
  const start=end === null || plateauStart === null ? null : Math.max(plateauStart,end-tailWindowNs);
  const tail=start === null ? [] : aligned.filter(({frame,read})=>
    read.started_ns>=start && same(frame.execution.encoded_counts,goal));
  const span=tail.length>1 ? tail.at(-1).read.completed_ns-tail[0].read.started_ns : 0;
  if (tail.length<10 || span<minimumSpanNs || plateauEnd-plateauStart<minimumSpanNs)
    exclusions.push('insufficient-terminal-command-hold');
  // Work in count coordinates without rounding measured radians or silently
  // substituting a goal register. This is still cached feedback after host writes.
  const positions=tail.map(({read})=>read.position_radians.slice(1,7).map(x=>2048+x*4096/(2*Math.PI)));
  const bodyPositions=tail.map(({read})=>2048+read.position_radians[0]*4096/(2*Math.PI));
  if ([...positions.flat(),...bodyPositions].some(x=>!finite(x) || Math.round(x)<-2147483648 || Math.round(x)>2147483647))
    exclusions.push('feedback-count-range');
  if (positions.some(q=>q.some(x=>Math.abs(x-Math.round(x))>1e-6)))
    exclusions.push('feedback-not-on-encoder-grid');
  const qualified=exclusions.length===0;
  const joints=qualified ? goal.map((counts,j)=>{
    const values=positions.map(q=>q[j]);
    const middle=(tail[0].read.started_ns+tail.at(-1).read.completed_ns)/2;
    const early=values.filter((_,i)=>tail[i].read.completed_ns<middle);
    const late=values.filter((_,i)=>tail[i].read.completed_ns>=middle);
    return {jointIndex:j+1,encodedGoalCounts:counts,cachedPositionCounts:stats(values),
      deliveredGoalMinusCachedPositionCounts:stats(values.map(x=>counts-x)),
      cachedPositionSpanCounts:Math.max(...values)-Math.min(...values),
      secondHalfMinusFirstHalfMedianCounts:early.length && late.length ? stats(late).median-stats(early).median : null};
  }) : [];
  return {qualified,exclusions,tailWindowMs:tailWindowNs/1e6,minimumSpanMs:minimumSpanNs/1e6,
    observedCommandPlateauMs:plateauStart===null ? null : (plateauEnd-plateauStart)/1e6,
    alignedTailSpanMs:span/1e6,alignedTailReads:tail.length,encodedGoalCounts:goal,joints,
    bodyReferenceRadians:qualified ? stats(tail.map(({frame})=>frame.reference.joint_target_radians[0])) : null,
    cachedBodyPositionCounts:qualified ? stats(bodyPositions) : null,
    bodyCommandExecutionObserved:false,
    physicalArrivalQualified:false,servoGoalRegisterRead:false,sensorAgeKnown:false};
}

// Pure saved-receipt analysis: no controller, socket or hardware imports.
// The native recorder deliberately never certifies its own coverage or arrival.
export function analyzeJointTrace(trace) {
  if (trace?.schema !== 'reachy.joint-trace.v1' || trace.native_clock !== 'capture-relative-monotonic-ns' ||
      !integer(trace.epoch) || trace.epoch < 1 || !/^[a-f0-9]{32}$/.test(trace.owner_session) ||
      !/^[a-f0-9]{32}$/.test(trace.capture_id) || trace.started_ns !== 0 ||
      !integer(trace.deadline_ns) || trace.deadline_ns < 1e9 || trace.deadline_ns > 60e9 ||
      !integer(trace.sealed_ns) || !integer(trace.capacity) || trace.capacity < 64 || trace.capacity > 16384 ||
      !integer(trace.lost_events) || !['overflow','expired','interrupted'].every(k=>typeof trace[k] === 'boolean') ||
      trace.pose_joint_pair_atomic !== false || trace.sensor_age_known !== false || trace.coverage_qualified !== false ||
      !Array.isArray(trace.events) || trace.events.length > trace.capacity)
    throw Error('Bounded sealed joint-trace v1 receipt required');
  const exclusions = new Set();
  for (const flag of ['overflow','expired','interrupted']) if (trace[flag]) exclusions.add(flag);
  if (trace.lost_events) exclusions.add('lost-events');
  if (trace.sealed_ns >= trace.deadline_ns) exclusions.add('deadline-reached');
  const frames = new Map(), feedback = []; let lastSequence=0;
  for (const e of trace.events) {
    if (!integer(e?.sequence) || e.sequence !== ++lastSequence || !integer(e.at_ns) || e.at_ns > trace.sealed_ns)
      throw Error('Invalid event sequence or native capture time');
    if (e.kind === 'feedback') {
      if (!integer(e.read_sequence) || e.read_sequence < 1 || typeof e.cache_published !== 'boolean' ||
          (e.position_radians !== null && !vector(e.position_radians,9)) ||
          (e.cache_wall_seconds !== null && !finite(e.cache_wall_seconds))) throw Error('Invalid feedback event');
      if (!e.cache_published || !e.position_radians || e.cache_wall_seconds === null) exclusions.add('feedback-unavailable');
      feedback.push(e);
    } else {
      if (!['reference','enqueue','execution'].includes(e.kind) || !integer(e.frame) || e.frame < 1)
        throw Error('Invalid frame event');
      const frame=frames.get(e.frame) || {};
      if (frame[e.kind]) throw Error('Duplicate frame phase');
      frame[e.kind]=e;frames.set(e.frame,frame);
      if (e.kind === 'reference') {
        if (!vector(e.joint_target_radians,7) || (e.requested_pose_snapshot !== null && !vector(e.requested_pose_snapshot,16)) ||
            typeof e.python_tick_ns !== 'string' || !/^\d{1,20}$/.test(e.python_tick_ns)) throw Error('Invalid reference event');
        if (e.requested_pose_snapshot === null) exclusions.add('requested-pose-unavailable');
      } else {
        if (!vector(e.encoded_counts,6) || !e.encoded_counts.every(x=>Number.isInteger(x) && x >= -2147483648 && x <= 2147483647) ||
            typeof e[e.kind === 'enqueue' ? 'accepted' : 'ok'] !== 'boolean') throw Error('Invalid write event');
      }
    }
    if (e.kind !== 'reference' && (!integer(e.started_ns) || !integer(e.completed_ns) ||
        e.started_ns > e.completed_ns || e.completed_ns > e.at_ns)) throw Error('Invalid native timing bracket');
  }
  const ordered=[...frames].sort((a,b)=>a[0]-b[0]);
  const complete=[];
  for (const [i,[id,f]] of ordered.entries()) {
    if (id !== i+1) exclusions.add('frame-gap');
    if (!f.reference || !f.enqueue || !f.execution) {exclusions.add('missing-frame-phase');continue;}
    const {reference:r,enqueue:q,execution:w}=f;
    if (!q.accepted || !w.ok) exclusions.add('write-unconfirmed');
    if (!same(q.encoded_counts,r.joint_target_radians.slice(1).map(encode)) || !same(q.encoded_counts,w.encoded_counts))
      exclusions.add('conversion-mismatch');
    // Worker execution may finish before the producer records enqueue completion.
    if (r.at_ns > q.started_ns || q.started_ns > w.started_ns) exclusions.add('phase-timing-inconsistent');
    complete.push(f);
  }
  const writes=complete.map(f=>f.execution);
  if (writes.some((w,i)=>i && w.started_ns < writes[i-1].completed_ns)) exclusions.add('write-order-inconsistent');
  const reads=[...feedback].sort((a,b)=>a.read_sequence-b.read_sequence);
  if (reads.some((r,i)=>i && (r.read_sequence !== reads[i-1].read_sequence+1 || r.started_ns < reads[i-1].completed_ns)))
    exclusions.add('feedback-gap-or-order');
  if (complete.length < 3) exclusions.add('too-few-frames');
  if (reads.length < 2) exclusions.add('too-few-feedback-reads');
  const joints=Array.from({length:6},(_,joint)=>{
    const steps=complete.slice(1).map((f,i)=>f.execution.encoded_counts[joint]-complete[i].execution.encoded_counts[joint]);
    return {jointIndex:joint+1,countSteps:stats(steps),unchangedSteps:steps.filter(x=>x===0).length};
  });
  const mixed=complete.slice(1).filter((f,i)=>{
    const changed=f.execution.encoded_counts.map((x,j)=>x!==complete[i].execution.encoded_counts[j]);
    return changed.some(Boolean) && !changed.every(Boolean);
  }).length;
  // A feedback read can span multiple servo transactions. Attribute it only to
  // the most recent completed group write with no intervening/overlapping write.
  const following=Array.from({length:6},()=>[]), deliveredFollowing=Array.from({length:6},()=>[]), aligned=[];let matched=0;
  if (!exclusions.size) for (const read of reads) {
    const prior=complete.findLast(f=>f.execution.completed_ns <= read.started_ns && f.execution.ok);
    if (!prior || !read.cache_published || !read.position_radians ||
        writes.some(w=>w.started_ns < read.completed_ns && w.completed_ns > read.started_ns)) continue;
    matched++;
    aligned.push({frame:prior,read});
    following.forEach((values,j)=>values.push((prior.reference.joint_target_radians[j+1]-read.position_radians[j+1])*180/Math.PI));
    deliveredFollowing.forEach((values,j)=>values.push(prior.execution.encoded_counts[j]-(2048+read.position_radians[j+1]*4096/(2*Math.PI))));
  }
  if (!exclusions.size && matched < 2) {
    exclusions.add('too-few-aligned-feedback-brackets');matched=0;
    following.forEach(values=>values.splice(0));
    deliveredFollowing.forEach(values=>values.splice(0));aligned.splice(0);
  }
  return {schema:'reachy.joint-trace-analysis.v1',analysisOnly:true,robotRequests:0,
    coverageQualified:exclusions.size === 0,exclusions:[...exclusions].sort(),
    frames:frames.size,completeFrames:complete.length,feedbackReads:reads.length,
    enqueueDurationMs:stats(complete.map(f=>(f.enqueue.completed_ns-f.enqueue.started_ns)/1e6)),
    queueToExecutionMs:stats(complete.map(f=>(f.execution.started_ns-f.enqueue.started_ns)/1e6)),
    nativeWriteDurationMs:stats(writes.map(w=>(w.completed_ns-w.started_ns)/1e6)),
    nativeWriteIntervalMs:stats(intervals(writes.map(w=>w.started_ns))),
    referenceIntervalMs:stats(intervals(complete.map(f=>f.reference.at_ns))),
    feedbackReadDurationMs:stats(reads.map(r=>(r.completed_ns-r.started_ns)/1e6)),
    feedbackCompletionGapMs:stats(intervals(reads.map(r=>r.completed_ns))),
    countSteps:joints,mixedChangeFrames:mixed,matchedFeedbackBrackets:matched,
    cachedFollowingErrorDegrees:following.map(stats),
    encodedGoalMinusCachedPositionCounts:deliveredFollowing.map(stats),
    terminalHold:terminalHold(complete,aligned,exclusions.size===0),physicalArrivalQualified:false,
    limitations:[
      'Native write completion bounds the host serial call; it does not timestamp servo acceptance or physical motion.',
      'Cached feedback records existing sequential read completion, not simultaneous motor sampling or sensor age.',
      'Requested pose is an independent snapshot; the seven-joint vector is the actual enqueue input. Body and antenna writes are not timed here.',
      'Queue-to-execution starts before enqueue admission; execution can precede enqueue return. Python and native clocks must not be subtracted.',
      'Count staircases and cached following error do not identify friction, backlash, load, firmware timing or a gain correction.',
      'Incomplete captures retain descriptive timings, but are excluded from qualified following-error analysis.',
      'Terminal-hold qualification attributes a final constant encoded goal to a bounded feedback window; it is not a settling or physical-arrival test.',
      'Floating joint targets and encoded goals differ by quantization. Neither the host write trace nor cached following error reads a servo goal register.',
    ]};
}

async function cli(args) {
  const options={};
  for (let i=0;i<args.length;i+=2) {
    if (!['--capture','--output'].includes(args[i]) || !args[i+1] || Object.hasOwn(options,args[i]))
      throw Error('Use --capture <saved.json> --output <new local/file.json>');
    options[args[i]]=args[i+1];
  }
  if (Object.keys(options).length !== 2) throw Error('Saved capture and private output paths required');
  if ((await fs.stat(options['--capture'])).size > 32*1024*1024) throw Error('Saved trace exceeds 32 MiB');
  const bytes=await fs.readFile(options['--capture']);
  const result=analyzeJointTrace(JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,'')));
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const local=await fs.realpath(path.join(root,'local')), output=path.resolve(options['--output']);
  const parent=await fs.realpath(path.dirname(output));
  if (parent !== local && !parent.startsWith(local+path.sep)) throw Error('Output must stay in the existing ignored local directory');
  result.inputSha256=crypto.createHash('sha256').update(bytes).digest('hex');
  await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({analysisOnly:true,robotRequests:0,coverageQualified:result.coverageQualified,exclusions:result.exclusions}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  cli(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
