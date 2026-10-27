// Synthetic experiment port. No sockets, config lookup, hardware or real timers.
import {absoluteHeadPose,headAngles,headPositionMm} from '../server/head-pose.mjs';
import {channelState} from './trajectory-comparison.mjs';
export class OfflineMatrixPort{
 constructor(neutral,{residual={},ackMs=0,reviewApproved=true,failWriteAt=null}={}){
  this.state=channelState(neutral);this.target=channelState(neutral);this.time=10000;this.epoch=1;this.active=false;this.writes=0;
  Object.assign(this,{residual,ackMs,reviewApproved,failWriteAt});this.neutral=channelState(neutral);this.cues=[];this.reviews=[];this.events={};this.stopCount=0;this.conditionCount=0;this.requestedPowerCommands=0;this.simulatedResets=0;
 }
 wallNow=()=>this.time;monoNow=()=>this.time;sleep=async ms=>{this.time+=Math.max(0,ms);};
 journal=async type=>{this.events[type]=(this.events[type]||0)+1;};
 axisReady=async value=>{this.cues.push(value);return true;};
 claim=async({plan})=>{if(plan.synthetic!==true)throw Error('Offline fixture cannot admit a physical plan');if(!this.active){this.active=true;this.conditionCount++;}return {epoch:this.epoch,stationarityQualified:true};};
 confirmReset=async checkpoint=>{this.simulatedResets++;this.epoch++;this.state=channelState(this.neutral);this.target=channelState(this.neutral);
  return {confirmed:true,checkpointId:checkpoint.id,operatorConfirmedAwake:true,sleepReceiptRef:'synthetic-sleep-'+this.simulatedResets,
   wakeReceiptRef:'synthetic-wake-'+this.simulatedResets,offlineOnly:true,modeCorrectionIncluded:false,gainsChanged:false};};
 apply(output){
  this.target=channelState(output);const p={...headAngles(output.headPose),...headPositionMm(output.headPose)};
  for(const [axis,delta] of Object.entries(this.residual))p[axis]+=delta;
  this.state={...this.target,headPose:absoluteHeadPose(output.headPose,p.yaw,p.pitch,p.roll,p)};
 }
 check=async()=>{
  if(this.task&&this.time>=this.task.finish){this.apply(this.task.target);this.task=null;}
  // A coalesced synthetic 100ms telemetry cadence, not a new GET per output.
  const startedAt=Math.floor(this.time/100)*100;
  return {...this.state,read:{startedAt,completedAt:startedAt},connected:true,ready:true,awake:true,identityVerified:true,
   ownerValid:this.active,uncertain:false,foreignMotion:false,version:'1.10.0',mode:'enabled',epoch:this.epoch,aimPolicyMatches:true,configurationMatches:true};
 };
 writeTarget=async output=>{this.writes++;this.time+=this.ackMs;if(this.writes===this.failWriteAt)throw Error('Injected unknown synthetic write; no replay');this.apply(output);return {stage:'backend-accepted'};};
 goto=async body=>{if(this.task)throw Error('Overlapping synthetic goto');this.task={uuid:'synthetic-task-'+this.writes++,finish:this.time+body.duration*1000,target:{headPose:body.head_pose.m,bodyYaw:body.body_yaw,antennas:body.antennas}};return {uuid:this.task.uuid};};
 taskState=async()=>({listed:!!this.task});readTarget=async()=>structuredClone(this.target);
 beginObservation=async()=>{};observationTick=async()=>{};
 reviewPath=async(path,pathSha256)=>{this.reviews.push({id:path.id,pathSha256,centering:path.centering??null});return {approved:this.reviewApproved,pathSha256,scope:'actual-start-full-path',modelSha256:'0'.repeat(64),offlineOnly:true,
  ...(path.centering?{centeringCheckpointId:path.centering.checkpointId,residualEnvelopeApproved:true}:{}),note:'Synthetic review fixture; no physical clearance proof'};};
 refreshRead=async()=>{};
 reviewContinuation=async()=>({verified:true,reviewRef:'synthetic-read-only-qualification',controlEpoch:this.epoch,
  read:{startedAt:this.time,completedAt:this.time},bodyYaw:this.state.bodyYaw,ownedTaskIdsRemaining:0,foreignMovesRemaining:this.task?1:0,
  originalSoftwareVerified:true,aimPolicyMatches:true,configurationMatches:true,observerQualified:true,gainsChanged:false,modeCorrectionIncluded:false,offlineOnly:true});
 stop=async()=>{if(this.active){this.stopCount++;this.epoch++;this.task=null;this.active=false;}return {ok:true,controlEpoch:this.epoch,headHeld:true};};
 release=async report=>{if(report.phase==='parked')await this.stop();};
 finishCondition=async()=>this.stop();abortCondition=async()=>this.stop();
}
