// Adapts an existing guarded RobotControl owner; creates no transport/serial owner.
import {RobotControl,DemoAdapter} from '../server/control.mjs';
import {manualHeadDistance} from '../server/head-pose.mjs';
export class MatrixOwnerPort{
 constructor({owner,pathReview,axisReady,resetReview=null,continuationReview=null,offline=false}){
  if(!(owner?.control instanceof RobotControl)||typeof pathReview!=='function'||typeof axisReady!=='function')throw Error('Existing guarded owner and current path/observer providers required');
  if(offline&&!(owner.control.adapter instanceof DemoAdapter))throw Error('Offline port requires a demo adapter');
  if(!offline&&(!owner.capture||owner.capture.cooldownMs<1250))throw Error('Qualified existing-owner native capture required');
  Object.assign(this,{owner,pathReview,readyProvider:axisReady,resetReview,continuationReview,offline});this.active=false;this.stopPromise=null;
 }
 wallNow=()=>this.owner.wallNow();monoNow=()=>this.owner.monoNow();sleep=ms=>this.owner.sleep(ms);
 journal=(type,value)=>{
  if(type==='comparison-leg-result'){
   const {writes,samples,nativeBrackets,...rest}=value;
   return this.owner.journal(type,{...rest,writeCount:writes.length,sampleCount:samples.length,
    finalError:samples.at(-1)?.progress??null,nativeSequences:nativeBrackets?.map(x=>x.entry.diagnostic.body.read_sequence)||[]});
  }
  return this.owner.journal(type,value);
 };
 check=async()=>{
  const sample=await this.owner.check(),c=this.owner.control,s=c.cachedStatus?.state;
  return {...sample,freshnessOnlyBlocked:s?.connected===true&&s.blockedReason==='Robot snapshot exceeded the 500 ms freshness limit'
   &&!c.adapter.uncertain&&!c.recoveryNeeded&&!c.stopPending&&!c.stopRequests};
 };
 refreshRead=async()=>{await this.owner.allowed('matrix-read-refresh');await this.owner.control.status();};
 writeTarget=(output,write)=>{if(!this.active||this.stopPromise)throw Error('Matrix condition is stopped');this.owner.dispatchGate(output.bodyYaw);return this.owner.writeTarget(output,write);};
 goto=body=>{if(!this.active||this.stopPromise)throw Error('Matrix condition is stopped');this.owner.dispatchGate(body.body_yaw);return this.owner.goto(body);};
 taskState=id=>this.owner.taskState(id);readTarget=()=>this.owner.readTarget();
 beginObservation=()=>this.owner.beginObservation();observationTick=()=>this.owner.observationTick();
 axisReady=value=>this.readyProvider(value);
 async reviewContinuation(interruption){
  if(this.active||typeof this.continuationReview!=='function')throw Error('Released owner and read-only continuation qualification provider required');
  const c=this.owner.control;
  const idle=async()=>{
   await this.owner.allowed('matrix-continuation-review');const s=await c.status(),r=s.diagnostics?.snapshot,now=this.wallNow();
   if(!r||![r.startedAt,r.completedAt].every(Number.isFinite)||r.startedAt>r.completedAt||r.completedAt>now||now-r.startedAt>500
    ||!s.connected||!s.ready||!s.awake||s.motorMode!=='enabled'||s.busy||s.moves.length||s.recoveryNeeded||s.controlEpoch!==interruption.stop.controlEpoch
    ||c.closed||c.adapter.uncertain||c.operation||c.worker||c.headWorker||c.headManualWorker||c.headStarting||c.headManualStarting||c.headSession||c.headManualGoal||c.owned.size
    ||c.pending||c.manualGoal||c.headPending||c.headManualPending
    ||c.stopPending||c.stopRequests||c.recoveryNeeded||c.recoveryBlocked||c.autoRecovery||c.holdNeeded||c.headHoldNeeded)throw Error('Fresh idle drained controller at the confirmed Stop epoch required');
   return s;
  };
  await idle();const review=await this.continuationReview(interruption);const s=await idle();
  if(review?.verified!==true||review.originalSoftwareVerified!==true||review.aimPolicyMatches!==true||review.configurationMatches!==true
   ||review.observerQualified!==true||!review.reviewRef||review.gainsChanged!==false||review.modeCorrectionIncluded!==false)
   throw Error('Current software, aim, native configuration and observer qualification required');
  return {...review,controlEpoch:s.controlEpoch,bodyYaw:s.bodyYaw,read:s.diagnostics.snapshot,ownedTaskIdsRemaining:c.owned.size,foreignMovesRemaining:s.moves.length};
 }
 async confirmReset(checkpoint){
  if(this.active||typeof this.resetReview!=='function')throw Error('Released owner and explicit operator reset receipts required');
  // This provider verifies an externally performed reset. It must never send
  // Sleep/Wake on its own; the port exposes no power-command operation.
  const result=await this.resetReview(checkpoint),s=await this.owner.control.status(),r=s.diagnostics?.snapshot;
  if(result?.checkpointId!==checkpoint.id||!r||this.wallNow()-r.startedAt>500||!s.connected||!s.ready||!s.awake||s.motorMode!=='enabled'||s.busy||s.moves.length||s.recoveryNeeded||this.owner.control.adapter.uncertain)throw Error('Fresh post-reset awake/idle state required');
  return {...result,postWakeRead:r};
 }
 async reviewPath(path,pathSha256){
  const review=await this.pathReview(path,pathSha256);
  if(!this.offline&&(!review?.clearanceReviewRef||review.offlineOnly!==false))throw Error('Live actual-path clearance evidence required; nominal model proof is insufficient');
  return review;
 }
 async claim({plan,leg,planSha256}){
  if(plan.synthetic&&!this.offline)throw Error('Synthetic plan is not physical authorization');
  const key=plan.parentPlanSha256+':'+leg.round+':'+leg.arm;
  if(!this.active){const result=await this.owner.claim({plan,leg,planSha256});this.active=true;this.condition=key;this.stopPromise=null;return result;}
  if(key!==this.condition)throw Error('Previous condition must close before changing implementation');
  await this.owner.allowed('matrix-next-segment');
  const c=this.owner.control,deadline=this.wallNow()+8000;let last=null,count=0;
  while(this.wallNow()<deadline){
   await c.status();const s=await this.check();
   if(plan.procedure&&s.freshnessOnlyBlocked&&s.connected&&s.awake&&s.ownerValid&&!s.uncertain&&!s.foreignMotion&&s.epoch===this.owner.epoch&&s.mode==='enabled'){
    await this.journal('matrix-readiness-read-discarded',{read:s.read,noTargetWrite:true});last=null;count=0;await this.sleep(150);continue;
   }
   if(!s.connected||!s.ready||!s.awake||!s.ownerValid||s.uncertain||s.foreignMotion||s.epoch!==this.owner.epoch||s.mode!=='enabled')throw Error('Retained matrix owner no longer admitted');
   if(this.wallNow()-s.read.startedAt>500){last=null;count=0;await this.sleep(150);continue;}
   const state=c.cachedStatus.state,pose={...state.headAngles,...state.headPositionMm},distance=last&&manualHeadDistance(last.pose,pose);
   count=distance&&distance.angular<=.25&&distance.linear<=.25&&Math.abs(last.body-state.bodyYaw)<=.25*Math.PI/180?count+1:0;
   if(count>=2){
    const context=await this.owner.context({state,plan,leg,planSha256});
    if(context?.verified!==true||context.aimPolicyMatches!==true||context.configurationMatches!==true||context.originalSoftwareVerified!==true||context.modeCorrectionIncluded!==false||context.gainsChanged!==false||!this.offline&&context.observerQualified!==true)throw Error('Current matrix context changed');
    this.owner.contextEvidence=context;this.owner.nativeStart=this.owner.capture?.observations.length||0;
    return {epoch:this.owner.epoch,stationarityQualified:true};
   }
   last={pose,body:state.bodyYaw};await this.sleep(150);
  }
  throw Error('Matrix stationary-readiness ceiling reached; no destination submitted');
 }
 async stop(error){if(!this.active)return {ok:true,noOwnedCondition:true};this.stopPromise??=this.owner.stop(error);return this.stopPromise;}
 async release(report){
  if(report.phase==='parked'){await this.abortCondition(report);return;}
  if(this.owner.capture){await this.owner.capture.setPhase('paused');report.nativeBrackets=this.owner.capture.observations.slice(this.owner.nativeStart);}
  if(report.arm==='daemon-minjerk')report.gotoHttpTiming=this.owner.gotoTiming||null;
  report.postWindowPolicy='Retain existing prescribed target and owner; no extra write or measured hold';
 }
 async finishCondition(report){
  if(!this.active)throw Error('No owned condition to finish');
  try{
   await this.owner.release(report);
   const capture=this.owner.capture;
   if(capture){
    if(capture.phase!=='paused'||capture.active)throw Error('Native evidence must drain before retiring its condition window');
    await this.owner.journal('matrix-native-window-retired',{brackets:capture.observations.length,lastSequence:capture.lastSequence,nextAt:capture.nextAt});
    capture.observations=[]; // Raw brackets already durable; keep sequence/cooldown/static gates.
   }
   return {ok:report.stopAfterObservation?.ok===true,measuredHoldAfterWindow:true};
  }
  finally{this.active=false;}
 }
 async abortCondition(reason){
  if(!this.active)return;
  try{
   // Even an unconfirmed Stop must drain/retire the application reservation.
   // Existing uncertainty/recovery locks stay set; no write is retried here.
   try{await this.stop(reason);}
   finally{await this.owner.release({phase:'parked',reason:String(reason?.error||reason?.message||reason)});}
  }
  finally{this.active=false;}
 }
}
