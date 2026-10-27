import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MANUAL_HEAD_AXES, headAngles, headPositionMm, rigidPose, manualHeadProgress } from '../server/head-pose.mjs';

const finite = x => typeof x === 'number' && Number.isFinite(x);
const time = x => finite(x) && x > 0;
const epoch = x => Number.isSafeInteger(x) && x >= 0;
const samePose = (a,b) => MANUAL_HEAD_AXES.every(k => finite(a?.[k]) && a[k] === b?.[k]);
const sameMatrix = (a,b) => Array.isArray(a) && Array.isArray(b) && a.length === 16 && b.length === 16 && a.every((x,i) => finite(x) && x === b[i]);
const sameWrite = (a,b) => a?.outcome === 'acknowledged' && a.epoch === b.epoch && a.sequence === b.sequence &&
  a.startedAt === b.startedAt && a.completedAt === b.completedAt && a.bodyYawRad === b.bodyYawRad && samePose(a.sent,b.sent) && sameMatrix(a.headPose,b.headPose);
const distribution = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b), middle = Math.floor(sorted.length/2);
  return { min:sorted[0], max:sorted.at(-1), mean:values.reduce((sum,x) => sum+x,0)/values.length,
    median:sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2 };
};
const window = points => ({ samples:points.length,
  angularErrorDeg:distribution(points.map(p => p.progress.angularErrorDeg)),
  translationErrorMm:distribution(points.map(p => p.progress.translationErrorMm)) });

// Saved local-clock evidence only. No controller import, network, motion, tuning
// or automatic plateau classification. A trend is not independent sensing.
export function analyzeHeadSettling({events,command,write,fault}) {
  if (!Array.isArray(events) || events.length > 100000) throw Error('Bounded saved event array required');
  const start = command?.submissionStartedAt ?? command?.startedAt;
  const supplied = MANUAL_HEAD_AXES.filter(k => Object.hasOwn(command?.body || {},k));
  if (command?.body?.action !== 'head-target' || command.outcome !== 'acknowledged' || command.result?.ok !== true ||
      !epoch(command.result.controlEpoch) || !epoch(command.body.epoch) || command.body.epoch !== command.result.controlEpoch ||
      !time(start) || !time(command.completedAt) || command.completedAt < start || command.completedAt > fault?.at ||
      !supplied.length || supplied.some(k => !finite(command.body[k]) || command.body[k] !== write?.sent?.[k]) ||
      write?.outcome !== 'acknowledged' || write.epoch !== command.result.controlEpoch || !epoch(write.epoch) ||
      !Number.isSafeInteger(write.sequence) || write.sequence < 1 || !time(write.startedAt) || write.startedAt < start ||
      !time(write.completedAt) || write.completedAt < write.startedAt || !finite(write.bodyYawRad) || !samePose(write.sent,write.sent) ||
      !['unsettled-target','stale-status'].includes(fault?.kind) || fault.epoch !== write.epoch || !time(fault.at) || fault.at < write.completedAt ||
      !sameWrite(fault.details?.lastWrite,write) || !samePose(fault.details?.requested,write.sent))
    throw Error('One acknowledged endpoint and matching retained fault required');
  const matrix = rigidPose(write.headPose), decoded = {...headAngles(matrix),...headPositionMm(matrix)};
  if (MANUAL_HEAD_AXES.some(k => Math.abs(decoded[k]-write.sent[k]) > 1e-7)) throw Error('Endpoint pose and matrix disagree');
  const retained = manualHeadProgress(write.sent,fault.details.measured);
  if (!retained || !finite(fault.details.angularErrorDeg) || !finite(fault.details.translationErrorMm) ||
      Math.abs(retained.angularErrorDeg-fault.details.angularErrorDeg) > 1e-7 ||
      Math.abs(retained.translationErrorMm-fault.details.translationErrorMm) > 1e-7)
    throw Error('Retained fault error does not match its measured pose');

  const points=[], rejected={}, seen=new Map(); let duplicateSnapshots=0, previousEventAt=-Infinity, previousSampleAt=-Infinity;
  const reject = reason => { rejected[reason]=(rejected[reason] || 0)+1; };
  for (const event of events) {
    if (event?.kind !== 'status') continue;
    if (!time(event.at)) { reject('invalid-event-time'); continue; }
    if (event.at < previousEventAt) throw Error('Saved status clock moved backwards');
    previousEventAt=event.at;
    if (event.at <= write.completedAt || event.at > fault.at) { reject('outside-endpoint-window'); continue; }
    if (event.epoch !== write.epoch) { reject('different-command-epoch'); continue; }
    const snapshot=event.diagnostics?.snapshot, head=event.diagnostics?.headManual;
    if (!time(snapshot?.startedAt) || !time(snapshot.completedAt) || snapshot.completedAt < snapshot.startedAt ||
        snapshot.completedAt > event.at || !finite(snapshot.readMs) || snapshot.readMs !== snapshot.completedAt-snapshot.startedAt) {
      reject('invalid-snapshot-time'); continue;
    }
    if (snapshot.startedAt <= write.completedAt) { reject('pre-ack-snapshot'); continue; }
    if (event.at-snapshot.startedAt > 500 || snapshot.readMs > 500 || snapshot.error) { reject('stale-or-failed-snapshot'); continue; }
    if (event.ready !== true || event.awake !== true || event.motorMode !== 'enabled' || event.headManualActive !== true ||
        event.blockedReason || event.recoveryNeeded || event.diagnostics.lastFault) { reject('not-active-and-admitted'); continue; }
    if (head?.phase !== 'settling' || head.goalAcknowledged !== true || head.postWriteRead !== true ||
        !samePose(head.requested,write.sent) || !sameWrite(head.lastWrite,write) || !sameWrite(event.diagnostics.lastManualHeadWrite,write)) {
      reject('different-or-unacknowledged-endpoint'); continue;
    }
    const measured={...event.headAngles,...event.headPositionMm}, progress=manualHeadProgress(write.sent,measured);
    if (!progress || !samePose(head.measured,measured)) { reject('missing-or-mixed-measured-pose'); continue; }
    const duplicate=seen.get(snapshot.startedAt);
    if (duplicate) {
      if (snapshot.completedAt !== duplicate.completedAt || snapshot.readMs !== duplicate.readMs || !samePose(measured,duplicate.measured))
        throw Error('Conflicting duplicate snapshot measurement or timing');
      duplicateSnapshots++; continue;
    }
    if (snapshot.startedAt < previousSampleAt) throw Error('Distinct snapshot starts moved backwards');
    previousSampleAt=snapshot.startedAt; seen.set(snapshot.startedAt,{completedAt:snapshot.completedAt,readMs:snapshot.readMs,measured:{...measured}});
    points.push({snapshotStartedAt:snapshot.startedAt,receivedAt:event.at,readMs:snapshot.readMs,progress});
  }
  const early=points.filter(p => p.snapshotStartedAt <= write.completedAt+3000);
  const late=points.filter(p => p.snapshotStartedAt >= fault.at-3000);
  const earlyWindow=window(early),lateWindow=window(late), gaps=points.slice(1).map((p,i) => p.snapshotStartedAt-points[i].snapshotStartedAt);
  const elapsedMs=fault.at-write.completedAt, firstAfterAckMs=points.length ? points[0].snapshotStartedAt-write.completedAt : null;
  const lastBeforeFaultMs=points.length ? fault.at-points.at(-1).snapshotStartedAt : null;
  const maxGapMs=gaps.length ? Math.max(...gaps) : null, windowsOverlap=elapsedMs < 6000;
  const enoughForWindowComparison=!windowsOverlap && early.length >= 3 && late.length >= 3 &&
    firstAfterAckMs <= 500 && lastBeforeFaultMs <= 500 && maxGapMs !== null && maxGapMs <= 500;
  return {
    analysisOnly:true, robotRequests:0, physicalCauseEstablished:false, arrivalCriteriaChanged:false,
    commandEpoch:write.epoch, retainedFaultKind:fault.kind, endpointAckToFaultMs:elapsedMs,
    retainedFault:{ angularErrorDeg:retained.angularErrorDeg, translationErrorMm:retained.translationErrorMm, measured:{...retained.measured} },
    distinctPostAckSnapshots:points.length, duplicateSnapshots, rejected,
    observedWithinTolerance:points.filter(p => p.progress.withinTolerance).length,
    sampledErrors:window(points), earlyWindow, lateWindow,
    lateMinusEarlyMeanAngularErrorDeg:enoughForWindowComparison ? lateWindow.angularErrorDeg.mean-earlyWindow.angularErrorDeg.mean : null,
    measuredAxisSpans:Object.fromEntries(MANUAL_HEAD_AXES.map(k => {
      const values=points.map(p => p.progress.measured[k]); return [k,values.length ? Math.max(...values)-Math.min(...values) : null];
    })),
    coverage:{ windowMs:3000, windowsOverlap, enoughForWindowComparison, firstAfterAckMs, lastBeforeFaultMs, maximumDistinctSnapshotGapMs:maxGapMs,
      observedSpanMs:points.length ? points.at(-1).snapshotStartedAt-points[0].snapshotStartedAt : null },
    samples:points,
    limits:[
      'Snapshot starts are deduplicated; repeated observations and axes are not independent experiments.',
      'All durations use the saved local bridge clock; no subtraction from daemon/native clocks.',
      'Fresh HTTP receipt does not establish sensor age or independently measured physical pose.',
      'Sampled tolerance and error trends do not authorize arrival, retry, a timeout change or tuning.',
      'No automatic plateau/mechanical diagnosis; insufficient coverage leaves window comparison unknown.',
    ],
  };
}

async function cli(args) {
  const options={};
  for (let i=0;i<args.length;i+=2) {
    if (!['--trace','--motion','--stop','--output'].includes(args[i]) || !args[i+1] || Object.hasOwn(options,args[i]))
      throw Error('Use --trace <saved.jsonl> --motion <saved.json> --stop <saved.json> --output <new local/file.json>');
    options[args[i]]=args[i+1];
  }
  if (Object.keys(options).length !== 4) throw Error('Trace, motion, Stop and private output paths required');
  const load = async name => {
    if ((await fs.stat(name)).size > 32*1024*1024) throw Error('Saved input exceeds 32 MiB');
    const bytes=await fs.readFile(name);return {bytes,text:bytes.toString('utf8').replace(/^\uFEFF/,'')};
  };
  const trace=await load(options['--trace']),motion=await load(options['--motion']),stop=await load(options['--stop']);
  const receipt=JSON.parse(motion.text),stopReceipt=JSON.parse(stop.text);
  const collections=[receipt.commands,receipt.phases].filter(value => value !== undefined);
  if (!collections.length || collections.some(value => !Array.isArray(value))) throw Error('Saved command or phase array required');
  const commands=collections.flat().filter(c => c?.body?.action === 'head-target');
  if (commands.length !== 1) throw Error('One unambiguous head-target request required');
  const fault=stopReceipt.final?.diagnostics?.lastFault;
  const result=analyzeHeadSettling({events:trace.text.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line)),
    command:commands[0],write:fault?.details?.lastWrite,fault});
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),local=await fs.realpath(path.join(root,'local'));
  const output=path.resolve(options['--output']),parent=await fs.realpath(path.dirname(output));
  if (parent !== local && !parent.startsWith(local+path.sep)) throw Error('Output must stay in the existing ignored local directory');
  result.inputsSha256=Object.fromEntries([['trace',trace],['motion',motion],['stop',stop]].map(([name,input]) => [name,crypto.createHash('sha256').update(input.bytes).digest('hex')]));
  await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({analysisOnly:true,robotRequests:0,distinctPostAckSnapshots:result.distinctPostAckSnapshots,
    endpointAckToFaultMs:result.endpointAckToFaultMs,observedWithinTolerance:result.observedWithinTolerance,
    coverage:result.coverage,earlyWindow:result.earlyWindow,lateWindow:result.lateWindow}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch(error => { console.error(error.message);process.exitCode=1; });
}
