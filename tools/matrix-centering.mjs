// Read-only starting-pose policy. No centering commands or target compensation.
import {poseToFollower} from './follower-pose.mjs';
import {planHash,channelState} from './trajectory-comparison.mjs';
const AXES=['x','y','z','roll','pitch','yaw'],rad=x=>x*Math.PI/180;
export const CENTERING_POLICY=Object.freeze({kind:'reviewed-inward-residual-v1',angularNoiseDeg:.5,translationNoiseMm:.5,
 maximumExtendedAxes:1,extraPositioningWrites:0,neutralRedefined:false});
export function matrixWorkspace(plan,value){
 const actual=channelState(value),r=poseToFollower(plan.chart,actual);
 if(r.some((x,i)=>x<plan.follower.bounds[i][0]-1e-10||x>plan.follower.bounds[i][1]+1e-10))throw Error('Actual start outside reviewed matrix drift/return envelope');
 return {actual,coordinates:r};
}
export function centeringCheckpoint(plan,leg,value,previous){
 const {coordinates}=matrixWorkspace(plan,value),active=AXES.indexOf(leg.axis),extended=[];
 const bounds=plan.follower.bounds.map(([low,high],i)=>{
  if(i===active)return [low,high];
  const baseline=i<3?.006:rad(7),noise=i<3?.0005:rad(.5),v=coordinates[i];
  if(Math.abs(v)<=baseline+1e-10)return [-baseline,baseline];
  const prior=plan.legs[plan.legs.findIndex(x=>x.id===leg.id)-1];
  if(!leg.axisCue||!prior||prior.id!==previous?.id||prior.direction!=='return'||prior.axis!==AXES[i]||prior.arm!==leg.arm||prior.round!==leg.round
   ||prior.target!==plan.neutral&&JSON.stringify(prior.target)!==JSON.stringify(plan.neutral)
   ||previous.phase!=='complete'||previous.matrixPlanSha256!==planHash(plan)||previous.releaseError||previous.abortError)
   throw Error('Extended residual requires a completed preceding-axis neutral return');
  extended.push(AXES[i]);
  return [Math.max(low,Math.min(-baseline,v-noise)),Math.min(high,Math.max(baseline,v+noise))];
 });
 if(extended.length>1)throw Error('Compound residual extension requires a separate experiment');
 const checkpoint={schema:'reachy.matrix-centering.v1',axis:leg.axis,arm:leg.arm,round:leg.round,firstLegId:leg.id,
  neutral:plan.neutral,measuredStart:channelState(value),bounds,extendedAxes:extended,
  precedingReturnId:previous?.id??null,precedingReturnAccuracyPassed:previous?.accuracyPassed??null,
  noPositioningWrite:true,accuracyToleranceUnchanged:true};
 return Object.freeze({...checkpoint,checkpointId:planHash(checkpoint)});
}
export function checkCenteringScope(plan,leg,value,checkpoint){
 const {actual,coordinates}=matrixWorkspace(plan,value);
 if(!checkpoint||checkpoint.axis!==leg.axis||checkpoint.arm!==leg.arm||checkpoint.round!==leg.round)throw Error('Exact axis centering checkpoint required');
 if(coordinates.some((v,i)=>v<checkpoint.bounds[i][0]-1e-10||v>checkpoint.bounds[i][1]+1e-10))throw Error('Measured pose exceeded the frozen axis residual envelope');
 return actual;
}
