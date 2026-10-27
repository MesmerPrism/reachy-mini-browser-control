// Four-condition six-axis experiment. Injected owner only; no transport creation.
import {absoluteHeadPose,headAngles,headPositionMm,manualHeadProgress} from '../server/head-pose.mjs';
import {BoundedFollower,FOLLOWER_AXES,evaluateFollowerCurve} from '../src/bounded-follower.mjs';
import {ComparisonExecutor,channelState,planHash,interpolatePose,progressAt,curvePeaks} from './trajectory-comparison.mjs';
import {makePoseChart,poseToFollower,followerToPose} from './follower-pose.mjs';
import {CENTERING_POLICY,matrixWorkspace,centeringCheckpoint,checkCenteringScope} from './matrix-centering.mjs';
export const MATRIX_ARMS=Object.freeze(['pc-linear','pc-minjerk','bounded-follower','daemon-minjerk']);
const orders=[MATRIX_ARMS,[MATRIX_ARMS[1],MATRIX_ARMS[3],MATRIX_ARMS[0],MATRIX_ARMS[2]],
 [MATRIX_ARMS[3],MATRIX_ARMS[2],MATRIX_ARMS[1],MATRIX_ARMS[0]],
 [MATRIX_ARMS[2],MATRIX_ARMS[0],MATRIX_ARMS[3],MATRIX_ARMS[1]]];
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const rad=x=>x*Math.PI/180;
export const FOLLOWER_POLICY=freeze({bounds:[[-.013,.012],[-.024,.024],[-.026,.012],[-rad(22),rad(22)],[-rad(20),rad(20)],[-rad(32),rad(32)]],
 limits:{translation:{velocity:.005,acceleration:.008,jerk:.04},rotation:{velocity:rad(10),acceleration:rad(12),jerk:rad(40),positionNorm:Math.PI/3}},maxStepSeconds:.02,maxDurationSeconds:60});
const TARGETS={yaw:[-30,30],pitch:[-18,18],roll:[-20,20],x:[-11,10],y:[-22,22],z:[-24,10]};
const CSV_FIELDS=['matrix_version','case_id','axis','unit','excursion_target','neutral_target','standard_duration_s','slow_duration_s','observation_window_s','historical_basis','selection_note'];
export function parseMatrixCsv(text){
 const lines=text.trim().split(/\r?\n/),headers=lines.shift().split(',');
 if(JSON.stringify(headers)!==JSON.stringify(CSV_FIELDS)||lines.some(line=>line.split(',').length!==headers.length))throw Error('Canonical unquoted matrix CSV fields required');
 const rows=lines.map(line=>Object.fromEntries(line.split(',').map((x,i)=>[headers[i],x])));
 if(rows.length!==12||new Set(rows.map(x=>x.case_id)).size!==12)throw Error('Exact twelve-case matrix required');
 for(const [axis,values] of Object.entries(TARGETS))for(const value of values){
  const found=rows.filter(x=>x.axis===axis&&Number(x.excursion_target)===value);
  if(found.length!==1)throw Error('Unreviewed matrix target');const r=found[0],rotation=['yaw','pitch','roll'].includes(axis);
  if(r.case_id!==axis+(value<0?'-negative':'-positive')||r.matrix_version!=='1'||r.unit!==(rotation?'deg':'mm')||Number(r.neutral_target)!==0||Number(r.standard_duration_s)!==(rotation?6:10)
    ||Number(r.slow_duration_s)!==(rotation?10:15)||Number(r.observation_window_s)!==10)throw Error('Unreviewed matrix units/timing');
 }
 return rows;
}
export function makeMatrixPlan(neutral,rows,{rounds=1,profile='standard',synthetic=true,cohort='offline-preview',csvSha256,resetPolicy='operator-sleep-wake',protocolVersion=2}={}){
 if(![2,3].includes(protocolVersion))throw Error('Reviewed matrix protocol required');
 if(!['operator-sleep-wake','retain-awake'].includes(resetPolicy)||typeof synthetic!=='boolean'||!Number.isSafeInteger(rounds)||rounds<1||rounds>4||!['standard','slow'].includes(profile)||typeof cohort!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(cohort)||!/^[a-f0-9]{64}$/.test(csvSha256||''))throw Error('Frozen cohort/profile/CSV hash required');
 // Validate even callers supplying parsed rows directly.
 parseMatrixCsv([Object.keys(rows[0]||{}).join(','),...rows.map(r=>Object.values(r).join(','))].join('\n'));
 const reference=channelState(neutral),angles=headAngles(reference.headPose),position=headPositionMm(reference.headPose);
 if(Math.abs(angles.yaw-reference.bodyYaw*180/Math.PI)>1e-6||Math.abs(angles.pitch)>1e-6||Math.abs(angles.roll)>1e-6||Object.values(position).some(x=>Math.abs(x)>1e-6)||reference.antennas.some(x=>Math.abs(x)>Math.PI/2))throw Error('Fixed nominal neutral/body/antenna policy required');
 const chart=makePoseChart(reference),legs=[];
 for(let round=1;round<=rounds;round++)for(const arm of orders[round-1])for(const axis of Object.keys(TARGETS))for(const sign of [-1,1]){
  const row=rows.find(r=>r.axis===axis&&Math.sign(Number(r.excursion_target))===sign),v=Number(row.excursion_target),local={yaw:0,pitch:0,roll:0,x:0,y:0,z:0};local[axis]=v;
  // Build the task pose in the fixed body-aligned chart (XYZ then rotvec XYZ).
  const chartTarget=[local.x/1000,local.y/1000,local.z/1000,rad(local.roll),rad(local.pitch),rad(local.yaw)];
  const excursion=followerToPose(chart,chartTarget),durationSeconds=Number(row[profile+'_duration_s']);
  for(const direction of ['out','return'])legs.push({id:`v${protocolVersion}-${cohort}-${profile}-r${round}-${arm}-${row.case_id}-${direction}`,
   round,arm,axis,sign,direction,caseId:row.case_id,durationSeconds,axisCue:sign===-1&&direction==='out',
   start:direction==='out'?reference:excursion,target:direction==='out'?excursion:reference});
 }
 return freeze({schema:`reachy.six-axis-comparison.v${protocolVersion}`,geometryVersion:1,cohort,profile,csvSha256,rounds,synthetic,hardwareArmed:false,
  ...(protocolVersion===3?{procedure:{centering:CENTERING_POLICY,telemetryRefreshAttempts:3,interruption:'explicit-known-stop-consume-v1'}}:{}),
  periodMs:20,observationWindowMs:10000,neutral:reference,chart,follower:FOLLOWER_POLICY,cases:structuredClone(rows),resetPolicy,legs,
  policy:{telemetryMaxAgeMs:500,bodyReferenceToleranceDeg:.25,startAngleToleranceDeg:1,startTranslationToleranceMm:1,
   antennaStartToleranceDeg:1,maxAngularSpeedDegS:10,maxTranslationSpeedMmS:5,maxBodySpeedDegS:1,maxAntennaSpeedDegS:10,
   nativeCooldownAfterCompletionMs:1250,minimumMeasuredSamples:3,offAxisMeasuredAngleDeg:7,offAxisMeasuredTranslationMm:6},
  aimPolicy:{tracking:false,wobbling:false,speechOffsetsZero:true,otherWritersAbsent:true},
  unchanged:{gains:true,mode:true,profiles:true,protection:true,software:true},
  limitsAreExperimentalChartBounds:true,clearanceQualified:false,physicalJointDerivativeGuarantee:false});
}
// A separate canonical experiment, not a truncated or completed six-axis matrix.
// Reuse its geometry, measured-arrival rules and actual-path admission unchanged.
export function makeVerticalPlan(neutral,rows,{arm,profile='slow',synthetic=true,cohort='vertical-preview',csvSha256,animationDurationSeconds}={}){
 if(!['daemon-minjerk','bounded-follower'].includes(arm))throw Error('Reviewed vertical execution path required');
 if(animationDurationSeconds!==undefined&&(arm!=='daemon-minjerk'||![1,2].includes(animationDurationSeconds)))throw Error('Animation-speed comparison admits only explicit daemon-local one/two-second vertical paths');
 const parent=makeMatrixPlan(neutral,rows,{rounds:1,profile,synthetic,cohort,csvSha256,protocolVersion:3});
 return freeze({...parent,schema:'reachy.vertical-comparison.v1',parentMatrixPlanSha256:planHash(parent),
  selection:{arm,axis:'z',fullMatrix:false,...(animationDurationSeconds===undefined?{}:{animationDurationSeconds})},
  ...(animationDurationSeconds===undefined?{}:{policy:{...parent.policy,maxTranslationSpeedMmS:50/animationDurationSeconds}}),
  legs:parent.legs.filter(l=>l.arm===arm&&l.axis==='z').map(l=>animationDurationSeconds===undefined?l:{...l,durationSeconds:animationDurationSeconds})});
}
export function matrixScope(plan,leg,value,checkpoint){
 if(plan.procedure)return checkCenteringScope(plan,leg,value,checkpoint);
 const actual=channelState(value),r=poseToFollower(plan.chart,actual);
 if(r.some((x,i)=>x<plan.follower.bounds[i][0]-1e-10||x>plan.follower.bounds[i][1]+1e-10))throw Error('Actual start outside reviewed matrix drift/return envelope');
 const local=followerToPose(makePoseChart({...plan.neutral,headPose:absoluteHeadPose(plan.neutral.headPose,0,0,0,{x:0,y:0,z:0})}),r);
 const a={...headAngles(local.headPose),...headPositionMm(local.headPose)};
 for(const axis of Object.keys(TARGETS))if(axis!==leg.axis&&Math.abs(a[axis])>(['yaw','pitch','roll'].includes(axis)?7:6)+1e-9)throw Error('Off-axis start drift requires separate review');
 return actual;
}
export function matrixAdmission(plan,leg,value,checkpoint){
 const actual=matrixScope(plan,leg,value,checkpoint),p={...headAngles(actual.headPose),...headPositionMm(actual.headPose)},expected={...headAngles(leg.start.headPose),...headPositionMm(leg.start.headPose)};
 const progress=manualHeadProgress(expected,p),body=Math.abs(actual.bodyYaw-leg.target.bodyYaw)*180/Math.PI;
 if(body>.25)throw Error('Fixed body reference no longer admitted');
 const matched=progress.withinTolerance&&actual.antennas.every((x,i)=>Math.abs(x-leg.start.antennas[i])*180/Math.PI<=1);
 return {actual,progress,matched,peaks:curvePeaks(actual,leg.target,leg.durationSeconds,leg.arm==='pc-linear'?'linear':'minjerk')};
}
export class MatrixRunner{
 constructor({plan,io}){
  const vertical=plan?.schema==='reachy.vertical-comparison.v1';
  if(!['reachy.six-axis-comparison.v2','reachy.six-axis-comparison.v3','reachy.vertical-comparison.v1'].includes(plan?.schema)||!plan.legs?.length||plan.legs.length!==(vertical?4:plan.rounds*96))throw Error('Canonical matrix or focused vertical plan required');
  const expected=vertical?makeVerticalPlan(plan.neutral,plan.cases,{arm:plan.selection?.arm,profile:plan.profile,synthetic:plan.synthetic,cohort:plan.cohort,csvSha256:plan.csvSha256,animationDurationSeconds:plan.selection?.animationDurationSeconds})
   :makeMatrixPlan(plan.neutral,plan.cases,{rounds:plan.rounds,profile:plan.profile,synthetic:plan.synthetic,cohort:plan.cohort,csvSha256:plan.csvSha256,resetPolicy:plan.resetPolicy,protocolVersion:plan.schema.endsWith('v3')?3:2});
  if(planHash(expected)!==planHash(plan))throw Error('Matrix policy/targets changed after preparation');
  this.plan=freeze(structuredClone(plan));this.hash=planHash(this.plan);this.io=io;this.index=0;this.active=false;this.parked=false;this.results=[];this.follower=null;this.intentSequence=0;this.pendingReset=null;this.centering=null;
 }
 async prepareReference({plan,leg,admission,epoch,io}){
  let durationSeconds=leg.durationSeconds,sample,evidence={algorithm:leg.arm};
  if(leg.arm==='bounded-follower'){
   if(!this.follower){this.follower=new BoundedFollower(this.plan.follower);this.follower.engage({position:poseToFollower(this.plan.chart,admission.actual),epoch});}
   const before=this.follower.snapshot(),goal=poseToFollower(this.plan.chart,leg.target),now=io.wallNow();
   const curve=this.follower.retarget(Object.fromEntries(FOLLOWER_AXES.map((a,i)=>[a,goal[i]])),{epoch,sequence:++this.intentSequence,sourceAt:now,now,minimumDurationSeconds:leg.durationSeconds});
   durationSeconds=curve.durationSeconds;
   sample=phase=>{const s=this.follower.advanceTo(phase,{epoch});return phase===durationSeconds?channelState(leg.target):followerToPose(this.plan.chart,s.position);};
   evidence={algorithm:'carried-bounded-quintic',stateBefore:before,curve,chart:this.plan.chart,endpointPreserved:true,derivatives:'fixed-chart only'};
  }else{
   if(admission.peaks.angularSpeedBoundDegS>plan.policy.maxAngularSpeedDegS||admission.peaks.translationSpeedMmS>plan.policy.maxTranslationSpeedMmS||admission.peaks.bodySpeedDegS>plan.policy.maxBodySpeedDegS||admission.peaks.antennaSpeedDegS>plan.policy.maxAntennaSpeedDegS)throw Error('Actual-start path violates frozen comparison speed policy');
   sample=phase=>({...leg.target,headPose:interpolatePose(admission.actual.headPose,leg.target.headPose,progressAt(phase/durationSeconds,leg.arm==='pc-linear'?'linear':'minjerk'))});
  }
  const preview=Array.from({length:65},(_,i)=>{const phase=durationSeconds*i/64;return {phaseSeconds:phase,output:leg.arm==='bounded-follower'?(i===64?channelState(leg.target):followerToPose(this.plan.chart,evaluateFollowerCurve(evidence.curve,phase).position)):sample(phase)};});
  const path={schema:'reachy.matrix-actual-path.v1',rootPlanSha256:this.hash,id:leg.id,epoch,actualStart:admission.actual,target:leg.target,durationSeconds,evidence,preview,
   ...(this.plan.procedure?{centering:this.centering}:{})};
  path.commandedStart=preview[0].output;
  for(const frame of preview)matrixScope(this.plan,leg,frame.output,this.centering);
  const pathSha256=planHash(path);
  if(typeof io.reviewPath!=='function')throw Error('Actual full-path model/clearance review required');
  const review=await io.reviewPath(path,pathSha256);
  if(review?.approved!==true||review.pathSha256!==pathSha256||review.scope!=='actual-start-full-path'||typeof review.modelSha256!=='string'||!/^[a-f0-9]{64}$/.test(review.modelSha256))throw Error('Exact actual-path model and clearance evidence required');
  if(this.plan.procedure&&(review.centeringCheckpointId!==this.centering.checkpointId||this.centering.extendedAxes.length&&review.residualEnvelopeApproved!==true))throw Error('Explicit exact centering/residual path review required');
  await io.journal('matrix-path-review',{pathSha256,path,review});
  return {durationSeconds,sample:phase=>{const output=sample(phase);matrixScope(this.plan,leg,output,this.centering);return output;},evidence:{...evidence,pathSha256,review,durationExtended:durationSeconds>leg.durationSeconds+1e-9}};
 }
 async runNext({approvedPlanSha256}={}){
  if(this.pendingReset)throw Error('Explicit between-condition reset confirmation required');
  if(this.active||this.parked||approvedPlanSha256!==this.hash||this.index>=this.plan.legs.length)throw Error('Current idle approved matrix/next leg required');
  this.active=true;const leg=this.plan.legs[this.index];
  try{
   if(leg.axisCue){if(typeof this.io.axisReady!=='function'||await this.io.axisReady({id:leg.id,axis:leg.axis,arm:leg.arm,round:leg.round})!==true)throw Error('Explicit axis-block readiness required');}
   const subplan={...this.plan,parentPlanSha256:this.hash,durationSeconds:leg.durationSeconds,legs:[leg]};
   const currentCentering=()=>this.centering?.axis===leg.axis&&this.centering.arm===leg.arm&&this.centering.round===leg.round?this.centering:null;
   const admit=(p,l,s)=>{
    if(this.plan.procedure&&!currentCentering()){
     this.centering=freeze(centeringCheckpoint(this.plan,leg,s,this.results.at(-1)));
    }
    return matrixAdmission(p,l,s,currentCentering());
   };
   const executor=new ComparisonExecutor({plan:subplan,io:this.io,admit,prepareReference:args=>this.prepareReference(args),
    validateState:s=>this.plan.procedure&&!currentCentering()?matrixWorkspace(this.plan,s):matrixScope(this.plan,leg,s,currentCentering())});
   const result=await executor.run(leg.id,{approvedPlanSha256:executor.hash});
   Object.assign(result,{matrixPlanSha256:this.hash,axis:leg.axis,sign:leg.sign,direction:leg.direction,round:leg.round,
    accuracyPassed:result.measuredArrival===true,matchedDynamicSample:result.phase==='complete'&&result.startMatched===true&&!result.referenceEvidence?.durationExtended&&!result.readRefreshes,
    visualRating:null,geodesicAngularErrorDeg:result.samples.at(-1)?.geodesicAngularErrorDeg??null,
    ...(this.plan.procedure?{centeringCheckpointId:currentCentering()?.checkpointId??null}:{})});
   if(executor.parked){
    this.parked=true;this.follower?.invalidate(result.error||result.releaseError||'Matrix parked');
    try{await this.io.abortCondition?.(result);}catch(error){result.abortError=error.message;}
   }
   else{
    this.index++;
    const next=this.plan.legs[this.index];
    if(!next||next.arm!==leg.arm||next.round!==leg.round){
     if(typeof this.io.finishCondition!=='function')throw Error('Owned condition closure required');
     try{
      result.conditionClosure=await this.io.finishCondition(result);
      if(result.conditionClosure?.ok!==true)throw Error('Condition owner did not drain/hold');
     }catch(error){
      this.parked=true;result.phase='parked';result.releaseError=error.message;result.matchedDynamicSample=false;
      try{await this.io.abortCondition?.(error);}catch(e){result.abortError=e.message;}
     }
     this.follower?.invalidate('Condition completed');this.follower=null;
     if(!this.parked&&next&&this.plan.resetPolicy==='operator-sleep-wake'){
      this.pendingReset=freeze({id:`${this.hash}:before:${next.id}`,planSha256:this.hash,nextLegId:next.id,afterLegId:leg.id});
      await this.io.journal('matrix-reset-checkpoint',this.pendingReset);
     }
    }
   }
   // Raw per-frame evidence belongs in the caller's bounded/segmented journal.
   const {writes,samples,nativeBrackets,referenceEvidence,...compact}=result;
   const record={...compact,writeCount:writes.length,sampleCount:samples.length,
    nativeBracketCount:nativeBrackets?.length||0,pathSha256:referenceEvidence?.pathSha256??null,
    finalError:samples.at(-1)?.progress??null};
   await this.io.journal('matrix-segment-result',record);this.results.push(record);return result;
  }catch(error){
   this.parked=true;this.follower?.invalidate(error.message);
   try{await this.io.stop(error);}finally{await this.io.abortCondition?.(error);}
   throw error;
  }finally{this.active=false;}
 }
 async confirmReset({approvedPlanSha256,checkpointId}={}){
  if(this.active||this.parked||approvedPlanSha256!==this.hash||!this.pendingReset||checkpointId!==this.pendingReset.id||typeof this.io.confirmReset!=='function')throw Error('Exact pending operator reset checkpoint required');
  const review=await this.io.confirmReset(this.pendingReset);
  if(review?.confirmed!==true||review.checkpointId!==checkpointId||review.operatorConfirmedAwake!==true
   ||!review.sleepReceiptRef||!review.wakeReceiptRef||review.modeCorrectionIncluded!==false||review.gainsChanged!==false)throw Error('Sleep/Wake receipts and current visual readiness required');
  await this.io.journal('matrix-reset-confirmed',{checkpoint:this.pendingReset,review,neutralUnchanged:true});this.pendingReset=null;return review;
 }
 async reviewInterruption({approvedPlanSha256,id,operatorConfirmed,guard=()=>{}}={}){
  const row=this.results.at(-1),leg=this.plan.legs[this.index],proof=row?.dispatchProof;
  if(!this.plan.procedure||this.active||!this.parked||this.pendingReset||approvedPlanSha256!==this.hash||operatorConfirmed!==true
   ||row?.id!==id||leg?.id!==id||row.phase!=='parked'||this.results.length!==this.index+1||row.interruptionReview
   ||!['telemetry-stale','diagnostic-stale-read'].includes(row.interruption?.kind)||row.stopError||row.releaseError||row.abortError
   ||row.stop?.ok!==true||!Number.isSafeInteger(row.epoch)||row.stop.controlEpoch!==row.epoch+1
   ||!proof||![proof.writes,proof.accepted,proof.withheld,proof.unknownOrFailed].every(x=>Number.isSafeInteger(x)&&x>=0)
   ||proof.unknownOrFailed!==0||proof.accepted+proof.withheld!==proof.writes||proof.writes!==row.writeCount
   ||(leg.arm==='daemon-minjerk'?(proof.writes!==0||(!proof.taskAccepted||!proof.taskUuid)&&row.outcome!=='not-dispatched'):(proof.taskAccepted||proof.taskUuid||proof.lastSequence!==(proof.writes||null)))
   ||(proof.accepted>0||proof.taskAccepted)&&row.stop.headHeld!==true||typeof this.io.reviewContinuation!=='function')
   throw Error('Exact known interrupted trial, acknowledged writes and confirmed drained Stop required');
  this.active=true;
  try{
   guard();const current=await this.io.reviewContinuation(row);guard();
   const read=current?.read,now=this.io.wallNow();
   if(current?.verified!==true||current.controlEpoch!==row.stop.controlEpoch||current.ownedTaskIdsRemaining!==0||current.foreignMovesRemaining!==0
    ||!read||![read.startedAt,read.completedAt,now].every(Number.isFinite)||read.startedAt>read.completedAt||read.completedAt>now||now-read.startedAt>500
    ||!Number.isFinite(current.bodyYaw)||Math.abs(current.bodyYaw-leg.target.bodyYaw)>.25*Math.PI/180
    ||current.originalSoftwareVerified!==true||current.aimPolicyMatches!==true||current.configurationMatches!==true||current.observerQualified!==true
    ||current.gainsChanged!==false||current.modeCorrectionIncluded!==false||!current.reviewRef)throw Error('Current continuation qualification failed');
   const review={id,reviewRef:current.reviewRef,controlEpoch:current.controlEpoch,read:current.read,noWriteReplay:true,noWake:true,noSleep:true,
    resultRemainsInterrupted:true,nextId:this.plan.legs[this.index+1]?.id??null};
   await this.io.journal('matrix-interruption-reviewed',{review,current});guard();
   row.interruptionReview=review;row.accuracyPassed=false;row.matchedDynamicSample=false;this.index++;this.parked=false;this.follower=null;
   const next=this.plan.legs[this.index];
   if(next&&(next.arm!==leg.arm||next.round!==leg.round)&&this.plan.resetPolicy==='operator-sleep-wake')
    this.pendingReset=freeze({id:`${this.hash}:before:${next.id}`,planSha256:this.hash,nextLegId:next.id,afterLegId:leg.id});
   return review;
  }finally{this.active=false;}
 }
 restoreHistoricalPrefix({approvedPlanSha256,sourcePlan,sourceResults,receipt}={}){
  if(!this.plan.procedure||this.active||this.parked||this.index||this.results.length||approvedPlanSha256!==this.hash
   ||receipt?.closedAsleep!==true||receipt.coordinatorExited!==true||receipt.sleepVisualConfirmed!==true||!receipt.reference
   ||receipt.sourcePlanSha256!==planHash(sourcePlan)||receipt.sourceResultsSha256!==planHash(sourceResults))throw Error('New idle plan and exact closed historical prefix receipt required');
  // Validate the old canonical plan without constructing a transport or trusting
  // historical device facts as current admission.
  new MatrixRunner({plan:sourcePlan,io:{}});
  const prefix=sourceResults.segments;
  if(!Array.isArray(prefix)||!prefix.length||prefix.length>=this.plan.legs.length||prefix.length!==receipt.prefixLength
   ||sourcePlan.profile!==this.plan.profile||sourcePlan.rounds!==this.plan.rounds||sourcePlan.csvSha256!==this.plan.csvSha256
   ||JSON.stringify(sourcePlan.neutral)!==JSON.stringify(this.plan.neutral)||sourcePlan.resetPolicy!==this.plan.resetPolicy)
   throw Error('Historical geometry/reference/profile must match');
  const records=prefix.map((row,i)=>{
   const prior=sourcePlan.legs[i],next=this.plan.legs[i],{id:oldId,...oldGeometry}=prior,{id:newId,...newGeometry}=next;
   if(JSON.stringify(oldGeometry)!==JSON.stringify(newGeometry)||row.id!==oldId||row.matrixPlanSha256!==receipt.sourcePlanSha256
    ||!['complete','parked'].includes(row.phase)||row.gainsChanged!==false||row.modeCorrectionIncluded!==false
    ||row.phase==='parked'&&(row.interruptionReview?.noWriteReplay!==true||row.stop?.ok!==true||row.stop.headHeld!==true
     ||row.stopError||row.releaseError||row.abortError))throw Error('Historical result order, provenance or interruption closure failed');
   return {id:newId,arm:next.arm,axis:next.axis,sign:next.sign,direction:next.direction,round:next.round,matrixPlanSha256:this.hash,
    phase:'historical',source:{reference:receipt.reference,planSha256:receipt.sourcePlanSha256,id:oldId,outcome:row.phase,
     accuracyPassed:row.accuracyPassed,finalError:row.finalError??null},accuracyPassed:false,matchedDynamicSample:false,visualRating:null,gainsChanged:false,modeCorrectionIncluded:false};
  });
  if(!this.plan.legs[prefix.length].axisCue)throw Error('Historical prefix must end at a whole axis boundary');
  this.results=records;this.index=prefix.length;
  const last=sourcePlan.legs[prefix.length-1],next=this.plan.legs[prefix.length];
  if((last.arm!==next.arm||last.round!==next.round)&&this.plan.resetPolicy==='operator-sleep-wake')
   this.pendingReset=freeze({id:`${this.hash}:before:${next.id}`,planSha256:this.hash,nextLegId:next.id,afterLegId:last.id});
  return {prefixLength:records.length,nextId:next.id,historicalResultsUnchanged:true,newProtocolScoresImported:0,currentHardwareAdmission:false};
 }
 restoreClosedSession({approvedPlanSha256,sourcePlan,sourceResults,receipt}={}){
  // A new controller may resume after an explicitly inspected terminal reset.
  // This never clears the old owner's uncertainty or upgrades its failed row.
  const flags=['closedAsleep','coordinatorExited','sleepAcknowledged','sleepVisualConfirmed','disabledNativeVerified',
   'originalSoftwareVerified','priorWritesDrained','operatorStationaryConfirmed','oldUncertaintyReceiptRetained'];
  if(!this.plan.procedure||this.active||this.parked||this.index||this.results.length||approvedPlanSha256!==this.hash
   ||flags.some(k=>receipt?.[k]!==true)||!receipt.reference||!receipt.sleepReceiptRef||!receipt.uncertaintyReceiptRef
   ||receipt.sourcePlanSha256!==this.hash||planHash(sourcePlan)!==this.hash
   ||receipt.sourceResultsSha256!==planHash(sourceResults))throw Error('New idle session and exact inspected closed-reset evidence required');
  const rows=sourceResults?.segments,last=rows?.at(-1),proof=last?.dispatchProof;
  const unknown=proof?.unknownOrFailed===1&&Number.isSafeInteger(proof.writes)&&proof.writes>0
   &&proof.accepted===proof.writes-1&&proof.withheld===0&&proof.lastSequence===proof.writes
   &&receipt.storedTargetExactlyMatches===true&&['pc-linear','pc-minjerk','bounded-follower'].includes(last?.arm);
  const noDispatch=proof?.writes===0&&proof.accepted===0&&proof.withheld===0&&proof.unknownOrFailed===0&&proof.lastSequence===null
   &&last?.outcome==='not-dispatched'&&last.stop?.ok===true&&last.stop.headHeld===true
   &&Number.isSafeInteger(last.epoch)&&last.stop.controlEpoch===last.epoch+1&&!last.stopError&&!last.releaseError&&!last.abortError;
  if(!Array.isArray(rows)||!rows.length||rows.length>=this.plan.legs.length||rows.length!==receipt.prefixLength
   ||last.phase!=='parked'||last.interruptionReview||!proof||proof.taskAccepted||proof.taskUuid
   ||last.writeCount!==proof.writes||!unknown&&!noDispatch)throw Error('Exact terminal unknown target or confirmed zero-dispatch trial required');
  for(const [i,row] of rows.entries()){
   const leg=this.plan.legs[i];
   if(row.id!==leg.id||row.matrixPlanSha256!==this.hash||row.arm!==leg.arm||row.axis!==leg.axis||row.direction!==leg.direction
    ||row.gainsChanged!==false||row.modeCorrectionIncluded!==false
    ||!['complete','historical','parked'].includes(row.phase)
    ||row.phase==='complete'&&row.dispatchProof?.unknownOrFailed>0
    ||row.phase==='parked'&&i!==rows.length-1&&row.closedSessionRecovery?.noWriteReplay!==true&&row.interruptionReview?.noWriteReplay!==true)
    throw Error('Closed session prefix order or unchanged-setting provenance failed');
  }
  const next=this.plan.legs[rows.length],boundary=next.arm!==last.arm||next.round!==last.round,sleep=receipt.sleepCommandReceipt;
  if(boundary&&(!sleep||sleep.action!=='sleep'||sleep.outcome!=='acknowledged'||sleep.result?.ok!==true
   ||!sleep.reference||!Number.isFinite(sleep.startedAt)||!Number.isFinite(sleep.completedAt)||sleep.completedAt<sleep.startedAt))throw Error('Exact acknowledged boundary Sleep command receipt required');
  this.results=structuredClone(rows);this.index=rows.length;this.follower=null;this.centering=null;
  const closure={reference:receipt.reference,sleepReceiptRef:receipt.sleepReceiptRef,uncertaintyReceiptRef:receipt.uncertaintyReceiptRef,
   noWriteReplay:true,oldOutcomeRemainsUnresolved:unknown,resultRemainsInterrupted:true,nextId:next.id,newCurrentAdmissionRequired:true};
  this.results.at(-1).closedSessionRecovery=closure;
  if(boundary&&this.plan.resetPolicy==='operator-sleep-wake'){
   this.closedResetSleepReceipt=structuredClone(sleep);
   this.pendingReset=freeze({id:`${this.hash}:before:${next.id}`,planSha256:this.hash,nextLegId:next.id,afterLegId:last.id});
  }
  return {prefixLength:rows.length,nextId:next.id,sourceResultsUnchanged:true,failedTrialReplayed:false,currentHardwareAdmission:false};
 }
 selectFinalAxis({approvedPlanSha256,arm,axis,operatorConfirmed,reference}={}){
  const tail=this.plan.legs.slice(this.index),selected=this.plan.legs.slice(-4),excluded=this.plan.legs.slice(this.index,-4);
  if(!this.plan.procedure||this.active||this.parked||this.follower||this.selection||this.results.length!==this.index
   ||approvedPlanSha256!==this.hash||operatorConfirmed!==true||!reference||!excluded.length
   ||!tail.every(l=>l.arm===arm&&l.round===selected[0].round)||!selected[0].axisCue||!selected.every(l=>l.axis===axis)
   ||excluded.some(l=>l.axis===axis)||!this.plan.legs[this.index].axisCue)throw Error('Explicit idle selection of the final complete axis in the remaining condition required');
  this.selection=freeze({schema:'reachy.matrix-axis-selection.v1',planSha256:this.hash,reference,arm,axis,
   selectedIds:selected.map(l=>l.id),excludedIds:excluded.map(l=>l.id)});
  for(const l of excluded)this.results.push({id:l.id,matrixPlanSha256:this.hash,arm:l.arm,axis:l.axis,sign:l.sign,direction:l.direction,round:l.round,
   phase:'excluded',reason:'operator-selected-final-axis-only',selectionSha256:planHash(this.selection),accuracyPassed:false,matchedDynamicSample:false,
   visualRating:null,gainsChanged:false,modeCorrectionIncluded:false});
  this.index=this.plan.legs.length-4;
  if(this.pendingReset)this.pendingReset=freeze({...this.pendingReset,id:`${this.hash}:before:${selected[0].id}`,nextLegId:selected[0].id});
  return structuredClone(this.selection);
 }
 restoreStoppedSession({approvedPlanSha256,sourcePlan,sourceResults,receipt}={}){
  const required=['coordinatorExited','operatorPresent','explicitStopConfirmed','priorWritesDrained','originalSoftwareVerified','settingsVerified','unknownWriteAbsent','oldUncertaintyReceiptRetained'];
  const rows=sourceResults?.segments,last=rows?.at(-1),proof=last?.dispatchProof,stop=receipt?.stopReceipt;
  if(!this.plan.procedure||this.active||this.parked||this.index||this.results.length||approvedPlanSha256!==this.hash
   ||required.some(k=>receipt?.[k]!==true)||!receipt.reference||!receipt.stopReceiptRef
   ||receipt.sourcePlanSha256!==this.hash||planHash(sourcePlan)!==this.hash||receipt.sourceResultsSha256!==planHash(sourceResults)
   ||!Array.isArray(rows)||rows.length!==receipt.prefixLength||!rows.length||rows.length>=this.plan.legs.length
   ||last.phase!=='parked'||proof?.writes!==0||proof.accepted!==0||proof.unknownOrFailed!==0||proof.withheld!==0||proof.lastSequence!==null
   ||proof.taskAccepted!==true||typeof proof.taskUuid!=='string'||!/^[a-zA-Z0-9-]{1,128}$/.test(proof.taskUuid)||proof.taskUuid!==receipt.taskUuid||last.writeCount!==0
   ||stop?.ok!==true||stop.headHeld!==true||!Number.isSafeInteger(last.epoch)||!Number.isSafeInteger(stop.controlEpoch)||stop.controlEpoch<=last.epoch
   ||!Number.isFinite(receipt.stopCompletedAt)||!Number.isFinite(receipt.failedAt)||receipt.stopCompletedAt<=receipt.failedAt)
   throw Error('Exact retired known-task session and later confirmed drained Stop required');
  for(const [i,row] of rows.entries()){
   const l=this.plan.legs[i];
   if(row.id!==l.id||row.matrixPlanSha256!==this.hash||row.arm!==l.arm||row.axis!==l.axis||row.direction!==l.direction
    ||row.gainsChanged!==false||row.modeCorrectionIncluded!==false||!['complete','parked','historical','excluded'].includes(row.phase)
    ||row.phase==='complete'&&row.dispatchProof?.unknownOrFailed>0
    ||row.phase==='parked'&&i!==rows.length-1&&!row.closedSessionRecovery?.noWriteReplay&&!row.stoppedSessionRecovery?.noWriteReplay&&!row.interruptionReview?.noWriteReplay)
    throw Error('Stopped-session source prefix provenance failed');
  }
  const next=this.plan.legs[rows.length];if(next.arm!==last.arm||next.round!==last.round)throw Error('Retained-awake resume must stay within its condition');
  this.results=structuredClone(rows);this.index=rows.length;this.follower=null;this.centering=null;this.retainedAwakeSession=true;
  this.results.at(-1).stoppedSessionRecovery={reference:receipt.reference,stopReceiptRef:receipt.stopReceiptRef,stopControlEpoch:stop.controlEpoch,
   noWriteReplay:true,resultRemainsInterrupted:true,noWake:true,noSleep:true,nextId:next.id,newCurrentAdmissionRequired:true};
  return {prefixLength:rows.length,nextId:next.id,currentHardwareAdmission:false,noPowerCommand:true,sourceResultsUnchanged:true};
 }
 async recordVisualRating({id,watched,scores,confidence,contact='unknown',notes=''}){
  const row=this.results.find(r=>r.id===id),keys=['interior','transitions','coordination'];
  if(this.active||!row||row.visualRating!==null||typeof watched!=='boolean'||!['low','medium','high'].includes(confidence)
   ||!['none','brushing','pressure','unknown'].includes(contact)||typeof notes!=='string'||notes.length>2000
   ||!scores||Object.keys(scores).length!==3||keys.some(k=>watched?(!Number.isSafeInteger(scores[k])||scores[k]<0||scores[k]>4):scores[k]!==null))throw Error('One explicit observed/missing visual rating per recorded segment required');
  const rating={watched,scores:structuredClone(scores),confidence,contact,notes};
  await this.io.journal('matrix-visual-rating',{id,rating});row.visualRating=rating;
  if(contact==='pressure'){this.parked=true;this.follower?.invalidate('Operator pressure concern');try{await this.io.stop();}finally{await this.io.abortCondition?.('Operator pressure concern');}}
  return structuredClone(rating);
 }
 summary(){const exhausted=this.index===this.plan.legs.length&&!this.parked;return {schema:`reachy.matrix-results.v${this.plan.procedure?3:2}`,planSha256:this.hash,planned:this.plan.legs.length,recorded:this.results.length,
  ...(this.plan.schema==='reachy.vertical-comparison.v1'?{scope:'vertical-only',fullMatrix:false}:{}),
  complete:exhausted&&this.results.length===this.plan.legs.length&&this.results.every(x=>x.phase==='complete'),exhausted,completed:this.results.filter(x=>x.phase==='complete').length,
  interrupted:this.results.filter(x=>x.phase==='parked').length,historical:this.results.filter(x=>x.phase==='historical').length,excluded:this.results.filter(x=>x.phase==='excluded').length,
  unissued:this.plan.legs.length-this.results.length,parked:this.parked,pendingReset:this.pendingReset,resetPolicy:this.plan.resetPolicy,
  accuracyPassed:this.results.filter(x=>x.accuracyPassed).length,matchedDynamicSamples:this.results.filter(x=>x.matchedDynamicSample).length,
  visualRated:this.results.filter(x=>x.visualRating?.watched===true).length,
  visualFeedbackRecorded:this.results.filter(x=>x.visualRating!==null).length,gainsChanged:false,modeCorrectionIncluded:false};}
}
