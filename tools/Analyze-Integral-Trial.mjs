import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { analyzeJointTrace } from './Analyze-Joint-Trace.mjs';

const finite = Number.isFinite;
const requireValue = (ok,message) => { if (!ok) throw Error(message); };

function uniqueTime(events,op,outcome) {
  const rows=events.filter(e=>e.op===op && e.outcome===outcome);
  requireValue(rows.length===1,`Exactly one ${op} ${outcome} event required`);
  return rows[0].at;
}

// All areas are diagnostic proxies from host-cached positions and delivered
// goals. They are not the firmware's trajectory error, accumulator or torque.
export function analyzeIntegralExposure({events,traces}) {
  requireValue(Array.isArray(events) && events.length>0 && events.length<=2000,'Bounded events required');
  requireValue(events.every((e,i)=>e && finite(e.at) && e.at>=0 && (!i || e.at>=events[i-1].at)),
    'Ordered finite wall timestamps required');
  requireValue(Array.isArray(traces) && traces.length===4,'Exactly four scored traces required');
  const applyIntent=uniqueTime(events,'apply-i','intent'), applyReply=uniqueTime(events,'apply-i','confirmed');
  const restoreIntent=uniqueTime(events,'restore-i','intent'), restoreReply=uniqueTime(events,'restore-i','confirmed');
  requireValue(applyIntent<=applyReply && applyReply<restoreIntent && restoreIntent<=restoreReply,'Invalid Apply/Restore order');
  const exposure={applyIntent,applyReply,restoreIntent,restoreReply,
    lowerHostBracketSeconds:restoreIntent-applyReply,upperHostBracketSeconds:restoreReply-applyIntent,
    confirmedReplyIntervalSeconds:restoreReply-applyReply,firmwareExposureMeasured:false};
  const legs=traces.map((trace,leg)=>{
    const audit=analyzeJointTrace(trace);
    requireValue(audit.coverageQualified && audit.terminalHold.qualified,`Trace ${leg} lacks qualified held coverage`);
    const commands=trace.events.filter(e=>e.kind==='execution' && e.ok).sort((a,b)=>a.completed_ns-b.completed_ns);
    const reads=trace.events.filter(e=>e.kind==='feedback' && e.cache_published);
    requireValue(reads.length>=2 && reads.every((r,i)=>finite(r.cache_wall_seconds) &&
      r.cache_wall_seconds>=applyIntent && r.cache_wall_seconds<=restoreReply &&
      (!i || r.cache_wall_seconds>reads[i-1].cache_wall_seconds)),`Trace ${leg} has incompatible wall clocks`);
    const clockOffsets=reads.map(r=>r.cache_wall_seconds-r.completed_ns/1e9);
    const withinTraceClockOffsetRangeSeconds=Math.max(...clockOffsets)-Math.min(...clockOffsets);
    requireValue(withinTraceClockOffsetRangeSeconds<=.1,`Trace ${leg} wall/monotonic clock discontinuity`);
    let ci=-1;
    const aligned=[];
    for(const read of reads) {
      while(ci+1<commands.length && commands[ci+1].completed_ns<=read.started_ns)ci++;
      if(ci<0)continue;
      const errors=commands[ci].encoded_counts.map((goal,j)=>goal-(2048+read.position_radians[j+1]*4096/(2*Math.PI)));
      aligned.push({time:read.completed_ns/1e9,errors});
    }
    requireValue(aligned.length>=2,`Trace ${leg} lacks aligned feedback`);
    const signedAreaCountsSeconds=Array(6).fill(0),absoluteAreaCountsSeconds=Array(6).fill(0);
    let includedSeconds=0,excludedGapSeconds=0;
    for(let i=1;i<aligned.length;i++) {
      const a=aligned[i-1],b=aligned[i],dt=b.time-a.time;
      requireValue(finite(dt) && dt>0,'Feedback monotonic timestamps must advance');
      if(dt>.1){excludedGapSeconds+=dt;continue;}
      includedSeconds+=dt;
      for(let j=0;j<6;j++) {
        signedAreaCountsSeconds[j]+=(a.errors[j]+b.errors[j])*dt/2;
        absoluteAreaCountsSeconds[j]+=(Math.abs(a.errors[j])+Math.abs(b.errors[j]))*dt/2;
      }
    }
    return {leg,feedbackWallStart:reads[0].cache_wall_seconds,feedbackWallEnd:reads.at(-1).cache_wall_seconds,
      feedbackWallSpanSeconds:reads.at(-1).cache_wall_seconds-reads[0].cache_wall_seconds,
      withinTraceClockOffsetRangeSeconds,
      includedProxySeconds:includedSeconds,excludedProxyGapSeconds:excludedGapSeconds,
      signedAreaCountsSeconds,absoluteAreaCountsSeconds,
      terminalGoalCounts:audit.terminalHold.encodedGoalCounts,
      terminalHeldErrorsCounts:audit.terminalHold.joints.map(j=>j.deliveredGoalMinusCachedPositionCounts.median)};
  });
  requireValue(legs.every((v,i)=>!i || v.feedbackWallStart>legs[i-1].feedbackWallEnd),'Trace wall intervals overlap or are unordered');
  const recordedSeconds=legs.reduce((sum,v)=>sum+v.feedbackWallSpanSeconds,0);
  const gaps=[];let cursor=applyIntent;
  for(const leg of legs){gaps.push({start:cursor,end:leg.feedbackWallStart,seconds:leg.feedbackWallStart-cursor});cursor=leg.feedbackWallEnd;}
  gaps.push({start:cursor,end:restoreReply,seconds:restoreReply-cursor});
  const outsideRecordedFeedbackSeconds=gaps.reduce((sum,g)=>sum+g.seconds,0);
  requireValue(Math.abs(recordedSeconds+outsideRecordedFeedbackSeconds-exposure.upperHostBracketSeconds)<1e-6,'Exposure partition mismatch');
  return {schema:'reachy.integral-exposure-analysis.v1',analysisOnly:true,robotRequests:0,exposure,
    recordedFeedbackWallSeconds:recordedSeconds,outsideRecordedFeedbackSeconds,
    outsideRecordedFeedbackFraction:outsideRecordedFeedbackSeconds/exposure.upperHostBracketSeconds,
    legs,gaps,physicalArrivalQualified:false,firmwareIntegratorStateKnown:false,
    limitations:[
      'Host Apply/Restore brackets bound acknowledgements, not the exact instant of register or firmware-state changes.',
      'Recorded wall spans describe retained cache-completion timestamps, not continuous sensor coverage or sensor age.',
      'Wall/monotonic offsets are checked within each capture; between-capture wall-clock adjustments cannot be excluded.',
      'Error-time areas use native monotonic intervals within each trace only. No area is filled across capture gaps.',
      'Delivered goal minus cached position differs from firmware trajectory error; area is not a reconstructed integral term.',
      'I0 readback does not establish hidden accumulator reset. A return offset alone does not prove dynamic overshoot.',
      'Four fixed ramps and holds do not bound total candidate exposure or supply an autonomous restoration watchdog.'
    ]};
}

function contained(root,target) {
  const relative=path.relative(root,target);
  return relative!=='' && relative!=='..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function runIntegralAnalysis({conditionDir,output,repositoryRoot=path.resolve(fileURLToPath(new URL('..',import.meta.url)))}) {
  const local=await fs.realpath(path.join(repositoryRoot,'local'));
  const directory=await fs.realpath(conditionDir), parent=await fs.realpath(path.dirname(path.resolve(output)));
  requireValue(contained(local,directory) && (parent===local || contained(local,parent)),'Inputs and output must remain under private local/');
  const inputFiles=[];
  const read=async(name,limit)=>{
    const p=await fs.realpath(path.join(directory,name));requireValue(contained(directory,p),'Input symlink leaves condition directory');
    const handle=await fs.open(p,'r');
    try {const info=await handle.stat();requireValue(info.isFile() && info.size<=limit,'Saved input is not a bounded regular file');
      const buffer=Buffer.alloc(info.size+1);const {bytesRead}=await handle.read(buffer,0,buffer.length,0);
      requireValue(bytesRead===info.size,'Saved input changed during read');const bytes=buffer.subarray(0,bytesRead);
      inputFiles.push({name,bytes:bytesRead,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
      return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    }finally{await handle.close();}
  };
  const events=(await read('events.jsonl',2*1024*1024)).trim().split(/\r?\n/).map(row=>JSON.parse(row));
  const traces=[];for(let i=0;i<4;i++)traces.push(JSON.parse(await read(`trace-${i}.json`,32*1024*1024)));
  const result=analyzeIntegralExposure({events,traces});
  result.inputFiles=inputFiles;
  const destination=path.join(parent,path.basename(path.resolve(output)));
  requireValue(contained(local,destination),'Private output required');
  await fs.writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  return result;
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2), options={};
  try {
    requireValue(args.length===4,'Use --condition-dir <private saved condition> --output <new local/result.json>');
    for(let i=0;i<args.length;i+=2){requireValue(['--condition-dir','--output'].includes(args[i]) && !Object.hasOwn(options,args[i]),'Unknown or repeated option');options[args[i]]=args[i+1];}
    requireValue(options['--condition-dir'] && options['--output'],'Condition directory and output required');
    const result=await runIntegralAnalysis({conditionDir:options['--condition-dir'],output:options['--output']});
    console.log(JSON.stringify({analysisOnly:true,robotRequests:0,exposureSeconds:result.exposure.upperHostBracketSeconds,
      outsideRecordedFeedbackSeconds:result.outsideRecordedFeedbackSeconds}));
  } catch(error){console.error(error.message);process.exitCode=1;}
}
