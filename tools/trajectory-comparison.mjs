// Experiment mathematics and injected execution policy. No network/device IO.
// Original implementation of the pinned Pollen scalar-yaw/residual-rotation path.
import {createHash} from 'node:crypto';
import {Matrix4, Quaternion, Vector3} from 'three';
import {absoluteHeadPose, headAngles, headPositionMm, rigidPose, manualHeadProgress,
  } from '../server/head-pose.mjs';

export const ARMS = Object.freeze(['pc-linear','pc-minjerk','daemon-minjerk']);
const degrees = x => x*180/Math.PI;
const frozen = x => {if(x && typeof x==='object'){Object.values(x).forEach(frozen);Object.freeze(x);}return x;};
export const planHash = plan => createHash('sha256').update(JSON.stringify(plan)).digest('hex');
const finite = (x, name) => {if(!Number.isFinite(x))throw Error(`Finite ${name} required`);return x;};
const span = (a,b) => b.map((x,i)=>x-a[i]);
const vector = (v,n,name) => {if(!Array.isArray(v)||v.length!==n||!v.every(Number.isFinite))throw Error(`Finite ${name} required`);return [...v];};
function preparationScope(value) {
  const p={...headAngles(value.headPose),...headPositionMm(value.headPose)};
  if(Math.abs(p.yaw)>5+1e-9||Math.abs(p.pitch)>5+1e-9||Math.abs(p.roll)>15+1e-9
      ||['x','y','z'].some(axis=>Math.abs(p[axis])>3+1e-9))throw Error('Nominal-height comparison envelope exceeded');
  if(value.antennas.some(x=>Math.abs(degrees(x))>90+1e-9))throw Error('Antenna baseline outside ordinary policy');
}
export function progressAt(u, kind='minjerk') {
  if(!Number.isFinite(u)||u<0||u>1||!['linear','minjerk'].includes(kind))throw Error('Valid progress and time law required');
  return kind==='linear' ? u : 10*u**3-15*u**4+6*u**5;
}
function orientation(m) {
  const yaw=headAngles(m).yaw*Math.PI/180;
  const rotation=new Quaternion().setFromRotationMatrix(new Matrix4().set(...m));
  const residual=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),-yaw).multiply(rotation);
  return {yaw,residual};
}
export function interpolatePose(start, target, progress) {
  const a=rigidPose(start), b=rigidPose(target);
  if(!Number.isFinite(progress)||progress<0||progress>1)throw Error('Progress outside segment');
  if(progress===0)return a;if(progress===1)return b;
  const from=orientation(a), to=orientation(b);
  const q=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),from.yaw+(to.yaw-from.yaw)*progress)
    .multiply(from.residual.slerp(to.residual,progress));
  const out=new Matrix4().makeRotationFromQuaternion(q).elements;
  // Three stores column-major; the daemon wire and all retained poses are row-major.
  const m=Array.from({length:16},(_,i)=>out[(i%4)*4+Math.floor(i/4)]);
  for(const i of [3,7,11])m[i]=a[i]+(b[i]-a[i])*progress;
  return rigidPose(m);
}
export function channelState(value) {
  return {headPose:rigidPose(value.headPose),bodyYaw:finite(value.bodyYaw,'body yaw'),
    antennas:vector(value.antennas,2,'antenna radians')};
}
function sampleChannels(start,target,s) {
  return {headPose:interpolatePose(start.headPose,target.headPose,s),
    bodyYaw:start.bodyYaw+(target.bodyYaw-start.bodyYaw)*s,
    antennas:start.antennas.map((x,i)=>x+(target.antennas[i]-x)*s)};
}
export function curvePeaks(startValue,targetValue,durationSeconds,kind='minjerk') {
  const start=channelState(startValue),target=channelState(targetValue);
  if(!Number.isFinite(durationSeconds)||durationSeconds<=0)throw Error('Positive finite duration required');
  const a=orientation(start.headPose),b=orientation(target.headPose);
  // Triangle bound, not exact angular speed for a general coupled rotation path.
  const angle=degrees(Math.abs(b.yaw-a.yaw)+a.residual.angleTo(b.residual));
  const translation=Math.hypot(...[3,7,11].map(i=>(target.headPose[i]-start.headPose[i])*1000));
  const factor=kind==='linear'?1:kind==='minjerk'?1.875:NaN;
  if(!Number.isFinite(factor))throw Error('Unknown time law');
  return {angularSpeedBoundDegS:angle*factor/durationSeconds,translationSpeedMmS:translation*factor/durationSeconds,
    bodySpeedDegS:degrees(Math.abs(target.bodyYaw-start.bodyYaw))*factor/durationSeconds,
    antennaSpeedDegS:degrees(Math.max(...span(start.antennas,target.antennas).map(Math.abs)))*factor/durationSeconds,
    linearBoundaryVelocityJump:kind==='linear',physicalDerivativeGuarantee:false};
}
export function makePlan(reference, {rollDeltaDeg=15,durationSeconds=3,blocks=3,periodMs=20,
    observationWindowMs=10000,synthetic=true}={}) {
  const start=channelState(reference), pose={...headAngles(start.headPose),...headPositionMm(start.headPose)};
  if(![rollDeltaDeg,durationSeconds,periodMs,observationWindowMs].every(Number.isFinite)
      ||Math.abs(rollDeltaDeg)<1||Math.abs(rollDeltaDeg)>15||durationSeconds<=0||durationSeconds>30
      ||periodMs!==20||!Number.isInteger(blocks)||blocks<1||blocks>3||observationWindowMs<1000||observationWindowMs>30000)
    throw Error('Comparison configuration outside reviewed preparation scope');
  const end={...pose,roll:pose.roll+rollDeltaDeg};
  const target={...start,headPose:absoluteHeadPose(start.headPose,end.yaw,end.pitch,end.roll,end)};
  // The first comparison deliberately excludes range exploration and lowered/translated poses.
  preparationScope(start);preparationScope(target);
  const policy={telemetryMaxAgeMs:500,bodyReferenceToleranceDeg:.25,startAngleToleranceDeg:1,startTranslationToleranceMm:1,
    antennaStartToleranceDeg:1,maxAngularSpeedDegS:10,maxTranslationSpeedMmS:5,maxBodySpeedDegS:1,maxAntennaSpeedDegS:10,
    nativeCooldownAfterCompletionMs:1250,minimumMeasuredSamples:3,stationaryAngleStepDeg:.25,stationaryPositionStepMm:.25};
  const worst=curvePeaks(start,target,durationSeconds);
  if(worst.angularSpeedBoundDegS>policy.maxAngularSpeedDegS)throw Error('Duration violates comparison reference speed policy');
  const order=[ARMS,[ARMS[1],ARMS[2],ARMS[0]],[ARMS[2],ARMS[0],ARMS[1]]];
  const legs=[];
  for(let block=0;block<blocks;block++)for(const arm of order[block])for(const direction of ['out','return'])
    legs.push({id:`block-${block+1}-${arm}-${direction}`,block:block+1,arm,direction,
      start:direction==='out'?start:target,target:direction==='out'?target:start});
  return frozen({schema:'reachy.trajectory-comparison.v1',synthetic,hardwareArmed:false,
    durationSeconds,periodMs,observationWindowMs,policy,legs,
    unchanged:{gains:true,mode:true,profiles:true,protection:true,software:true},
    aimPolicy:{tracking:false,wobbling:false,speechOffsetsZero:true,otherWritersAbsent:true},
    limitations:['Native queue age/application time are not established by HTTP acceptance.',
      'Daemon goto samples its own measured start; no atomic start-time correlation is available.',
      'C uses the verified default minjerk; its ignored HTTP interpolation field is omitted.',
      'C has no endpoint correction. Task disappearance is not successful completion or arrival.',
      'The 20ms capped PC phase can stretch; actual duration and phase remain outcomes.']});
}
export function daemonRequest(plan,leg) {
  return {head_pose:{m:[...leg.target.headPose]},body_yaw:leg.target.bodyYaw,antennas:[...leg.target.antennas],duration:plan.durationSeconds};
}
export function sampleReference(plan,leg,actualStart,phaseSeconds) {
  finite(phaseSeconds,'phase');
  if(phaseSeconds<0||phaseSeconds>plan.durationSeconds)throw Error('Phase outside planned trajectory');
  const law=leg.arm==='pc-linear'?'linear':'minjerk';
  return sampleChannels(channelState(actualStart),leg.target,progressAt(phaseSeconds/plan.durationSeconds,law));
}
export function admitStart(plan,leg,actualValue) {
  const actual=channelState(actualValue),expected=leg.start,policy=plan.policy;
  preparationScope(actual);
  const progress=manualHeadProgress({...headAngles(expected.headPose),...headPositionMm(expected.headPose)},
    {...headAngles(actual.headPose),...headPositionMm(actual.headPose)});
  if(progress.angularErrorDeg>policy.startAngleToleranceDeg||progress.translationErrorMm>policy.startTranslationToleranceMm
      ||degrees(Math.abs(actual.bodyYaw-expected.bodyYaw))>policy.bodyReferenceToleranceDeg
      ||actual.antennas.some((x,i)=>degrees(Math.abs(x-expected.antennas[i]))>policy.antennaStartToleranceDeg))
    throw Error('Measured start does not match this condition; no automatic positioning');
  const peaks=curvePeaks(actual,leg.target,plan.durationSeconds,leg.arm==='pc-linear'?'linear':'minjerk');
  if(peaks.angularSpeedBoundDegS>policy.maxAngularSpeedDegS||peaks.translationSpeedMmS>policy.maxTranslationSpeedMmS
      ||peaks.bodySpeedDegS>policy.maxBodySpeedDegS||peaks.antennaSpeedDegS>policy.maxAntennaSpeedDegS)
    throw Error('Actual measured-start path exceeds frozen speed policy');
  // Numerical screening only; not a continuum/collision proof.
  for(let i=0;i<=32;i++)preparationScope(sampleChannels(actual,leg.target,i/32));
  return {actual,progress,peaks};
}

// Port contract: an exclusive guarded owner, monotonic clock, durable journal,
// cached fresh observations, one awaited write, and explicit cancellation/Stop.
// This module neither constructs a transport nor grants physical authorization.
export function comparisonAdmissionFault(sample,{now,epoch,bodyYaw,policy}){
 const r=sample?.read,failures=[];
 const timing=r&&[r.startedAt,r.completedAt,now].every(Number.isFinite)&&r.startedAt<=r.completedAt&&r.completedAt<=now;
 if(!timing)failures.push('read-timing');
 const stale=timing&&now-r.startedAt>policy.telemetryMaxAgeMs;
 if(stale)failures.push('freshness');
 // A provider may identify the controller's age-only readiness block. A fresh
 // replacement must still pass every ready/identity gate before any write.
 const ageOnly=stale&&sample.freshnessOnlyBlocked===true;
 for(const [key,ok] of Object.entries({connected:sample?.connected===true,ready:sample?.ready===true||ageOnly,
  awake:sample?.awake===true,identity:sample?.identityVerified===true||ageOnly,owner:sample?.ownerValid===true,
  certainty:!sample?.uncertain,foreignMotion:!sample?.foreignMotion,version:sample?.version==='1.10.0',mode:sample?.mode==='enabled',epoch:sample?.epoch===epoch,
  body:Number.isFinite(sample?.bodyYaw)&&degrees(Math.abs(sample.bodyYaw-bodyYaw))<=policy.bodyReferenceToleranceDeg,
  aim:sample?.aimPolicyMatches===true,configuration:sample?.configurationMatches===true}))if(!ok)failures.push(key);
 return failures.length?{kind:failures.length===1&&failures[0]==='freshness'?'telemetry-stale':'admission-failed',failures,
  at:now,epoch:sample?.epoch??null,read:r?structuredClone(r):null}:null;
}
export class ComparisonExecutor {
  constructor({plan,io,admit=admitStart,prepareReference=null,validateState=null}) {
    this.plan=frozen(structuredClone(plan));this.io=io;this.admit=admit;this.prepareReference=prepareReference;this.validateState=validateState;
    this.hash=planHash(this.plan);this.consumed=new Set();this.active=false;this.parked=false;this.index=0;
  }
  async run(id,{approvedPlanSha256}={}) {
    if(this.active||this.parked||approvedPlanSha256!==this.hash||this.consumed.has(id))throw Error('Comparison is busy/parked, plan unapproved or leg already consumed');
    const leg=this.plan.legs[this.index];if(!leg||leg.id!==id)throw Error('Next preplanned comparison leg required');
    this.active=true;this.consumed.add(id);
    const io=this.io,report={id,arm:leg.arm,planSha256:this.hash,phase:'admission',writes:[],samples:[],endpointCorrection:false,
      outcome:'not-dispatched',measuredArrival:false,modeCorrectionIncluded:false,gainsChanged:false,readRefreshes:0};
    let claimed=false,lastMono=-Infinity;
    const mono=()=>{const value=io.monoNow();if(!Number.isFinite(value)||value<lastMono)throw Error('Monotonic comparison clock failed');lastMono=value;return value;};
    const check=async()=>{
      while(true){
       const sample=await io.check(),now=io.wallNow(),fault=comparisonAdmissionFault(sample,{now,epoch:report.epoch,bodyYaw:leg.target.bodyYaw,policy:this.plan.policy});
       if(fault){
        // A running daemon task continues locally while the PC waits. Keep its
        // original Stop-on-staleness behavior; GET waits only suspend PC output
        // or stationary observation after the task is known no longer listed.
        const taskMayBeRunning=!!report.taskUuid&&!Number.isFinite(report.taskNoLongerListedAt);
        if(!taskMayBeRunning&&fault.kind==='telemetry-stale'&&typeof io.refreshRead==='function'&&report.readRefreshes<(this.plan.procedure?.telemetryRefreshAttempts??0)){
         report.readRefreshes++;await io.journal('comparison-read-wait',{...fault,attempt:report.readRefreshes,id:leg.id,phase:report.phase,noTargetWrite:true});
         await io.refreshRead();continue;
        }
        const error=Error('Comparison freshness/identity/version/epoch/ownership/body admission failed');error.comparisonFault=fault;throw error;
       }
       channelState(sample);this.validateState?.(sample,leg,this.plan);return sample;
      }
    };
    const observe=async()=>{
      const sample=await check(),at=mono();
      const progress=manualHeadProgress({...headAngles(leg.target.headPose),...headPositionMm(leg.target.headPose)},
        {...headAngles(sample.headPose),...headPositionMm(sample.headPose)});
      const rotation=m=>new Quaternion().setFromRotationMatrix(new Matrix4().set(...m));
      const row={at,read:sample.read,progress,bodyYaw:sample.bodyYaw,
        geodesicAngularErrorDeg:rotation(leg.target.headPose).angleTo(rotation(sample.headPose))*180/Math.PI};
      if(report.samples.length>=10000)throw Error('Finite comparison observation bound reached');
      report.samples.push(row);await io.journal('comparison-observation',row);return row;
    };
    try {
      const claim=await io.claim({plan:this.plan,leg,planSha256:this.hash});claimed=true;report.epoch=claim.epoch;
      if(claim.stationarityQualified!==true)throw Error('Measured stationary start required');
      const sample=await check(),admission=this.admit(this.plan,leg,sample);
      report.measuredStart=admission.actual;report.startDifference=admission.progress;report.peakReferenceBounds=admission.peaks;
      report.startMatched=admission.matched!==false;
      const reference=this.prepareReference?await this.prepareReference({plan:this.plan,leg,admission,epoch:report.epoch,io}):null;
      const duration=reference?.durationSeconds??this.plan.durationSeconds;
      if(!Number.isFinite(duration)||duration<=0||duration>120)throw Error('Bounded reference duration required');
      report.referenceEvidence=reference?.evidence??null;report.plannedGenerationMs=duration*1000;
      report.startedAt=mono();report.phase='generating';
      await io.journal('comparison-leg-intent',{...report,leg});
      if(leg.arm==='daemon-minjerk') {
        await check();
        const request=daemonRequest(this.plan,leg),intentAt=mono();
        await io.journal('goto-intent',{request,intentAt,epoch:report.epoch});
        await check(); // Durable IO can outlive freshness, ownership or a Stop.
        const task=await io.goto(request);report.dispatchAcknowledgedAt=mono();
        if(!task||typeof task.uuid!=='string'||!task.uuid)throw Error('Missing daemon task UUID');
        report.taskUuid=task.uuid;report.outcome='task-accepted';
        while(true) {
          await observe();
          const state=await io.taskState(task.uuid);
          if(state.listed===false){report.taskNoLongerListedAt=mono();break;}
          if(state.listed!==true)throw Error('Unknown daemon task state');
          if(mono()-intentAt>duration*1000+10000)throw Error('Daemon task watchdog expired');
          await io.sleep(100);
        }
        // Preserve the stock endpoint omission. Never silently flush the target.
        report.lastWriteWallTime=io.wallNow();
        report.outcome='task-no-longer-listed';
      } else {
        let phase=0,sequence=0;
        while(true) {
          const tick=mono();await check();
          const output=reference?reference.sample(phase):sampleReference(this.plan,leg,admission.actual,phase);
          const write={sequence:++sequence,phaseSeconds:phase,nominalU:phase/duration,
            startedAt:mono(),output,epoch:report.epoch,outcome:'pending',dispatchAttempted:false};
          await io.journal('target-intent',write);
          try {
            const fresh=await check(); // Never dispatch a retired intent after a slow journal.
            if(degrees(Math.abs(output.bodyYaw-fresh.bodyYaw))>this.plan.policy.bodyReferenceToleranceDeg)
              throw Error('Sampled body target exceeds ordinary fresh body-reference tolerance');
            write.dispatchAttempted=true;const ack=await io.writeTarget(output,write);
            if(ack?.stage!=='backend-accepted')throw Error('Target was ignored, rejected or has unknown outcome');
            write.completedAt=mono();write.outcome='backend-accepted';report.lastWriteWallTime=io.wallNow();
          } catch(error) {write.outcome=write.dispatchAttempted?'failed-or-unknown':'withheld';write.error=error.message;throw error;}
          finally {report.writes.push(write);await io.journal('target-outcome',write);}
          if(phase===duration){report.exactEndpointAccepted=true;break;}
          await io.sleep(Math.max(0,this.plan.periodMs-(mono()-tick)));
          const elapsed=mono()-tick;
          if(elapsed<=0)throw Error('Comparison timer made no progress');
          phase=Math.min(duration,Math.round((phase+Math.min(this.plan.periodMs,elapsed)/1000)*1e12)/1e12);
        }
        report.outcome='reference-endpoint-accepted';
      }
      report.generationCompletedAt=mono();report.actualGenerationMs=report.generationCompletedAt-report.startedAt;
      report.nominalGenerationMs=this.plan.durationSeconds*1000;report.phaseStretchMs=report.actualGenerationMs-report.nominalGenerationMs;
      // Same single stored-target observation in all arms; do not infer it from
      // an HTTP acknowledgement. It is still distinct from IK/motor execution.
      await check();report.targetReadStartedAt=mono();
      report.storedTarget=channelState(await io.readTarget());report.targetReadCompletedAt=mono();
      report.exactEndpointStored=JSON.stringify(report.storedTarget)===JSON.stringify(channelState(leg.target));
      if(leg.arm!=='daemon-minjerk'&&!report.exactEndpointStored)throw Error('Accepted PC endpoint was not observed as the stored target');
      report.phase='observing';await io.beginObservation?.();report.observationStartedAt=mono();
      const until=report.observationStartedAt+this.plan.observationWindowMs;
      while(mono()<until){await observe();await io.observationTick?.();if(mono()<until)await io.sleep(Math.min(100,until-mono()));}
      report.observationCompletedAt=mono();report.actualObservationMs=report.observationCompletedAt-report.observationStartedAt;
      const post=[...new Map(report.samples.filter(x=>x.at>=report.generationCompletedAt&&x.read.startedAt>report.lastWriteWallTime)
        .map(x=>[`${x.read.startedAt}/${x.read.completedAt}`,x])).values()];
      // Arrival classification uses a post-generation, post-write read fence.
      // io supplies a wall-time fence because wall and monotonic times differ.
      report.postGenerationSamples=post.length;
      const minimum=this.plan.policy.minimumMeasuredSamples;
      report.measuredArrival=post.length>=minimum&&post.slice(-minimum).every(x=>x.progress.withinTolerance);
      report.nativeArrivalQualified=false;report.phase='complete';this.index++;
    } catch(error) {
      this.parked=true;report.phase='parked';report.error=error.message;
      report.interruption=error.comparisonFault??(error.code==='diagnostic-stale-read'?{kind:'diagnostic-stale-read',code:error.code}:null);
      if(claimed) {
        try {report.stop=await io.stop(error);}catch(stopError){report.stopError=stopError.message;}
      }
    } finally {
      report.dispatchProof={writes:report.writes.length,accepted:report.writes.filter(x=>x.outcome==='backend-accepted').length,
       withheld:report.writes.filter(x=>x.outcome==='withheld').length,unknownOrFailed:report.writes.filter(x=>!['backend-accepted','withheld'].includes(x.outcome)).length,lastSequence:report.writes.at(-1)?.sequence??null,
       taskUuid:report.taskUuid??null,taskAccepted:!!report.taskUuid&&Number.isFinite(report.dispatchAcknowledgedAt),
       noWriteReplay:true};
      report.completedAt=Number.isFinite(lastMono)?lastMono:null;
      try {if(claimed)await io.release(report);}
      catch(error) {this.parked=true;report.phase='parked';report.releaseError=error.message;}
      finally {this.active=false;}
      await io.journal('comparison-leg-result',report);
    }
    return report;
  }
}
