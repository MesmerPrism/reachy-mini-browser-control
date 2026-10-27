// Fixed body-aligned SE(3) chart; no hardware IO. Derivative bounds are chart bounds.
import {Matrix4,Quaternion,Vector3} from 'three';
import {rigidPose} from '../server/head-pose.mjs';
import {channelState} from './trajectory-comparison.mjs';
export function makePoseChart(neutral){
 const base=channelState(neutral),q=new Quaternion().setFromRotationMatrix(new Matrix4().set(...base.headPose));
 return {schema:'reachy.fixed-pose-chart.v1',neutral:base,quaternion:q.toArray(),maximumRotationVectorNorm:Math.PI/3};
}
export function poseToFollower(chart,value){
 const state=channelState(value),n=chart.neutral.headPose,q=new Quaternion().fromArray(chart.quaternion),inverse=q.clone().invert();
 const p=new Vector3(...[3,7,11].map(i=>state.headPose[i]-n[i])).applyQuaternion(inverse);
 const r=inverse.multiply(new Quaternion().setFromRotationMatrix(new Matrix4().set(...state.headPose))).normalize();
 if(r.w<0)r.set(-r.x,-r.y,-r.z,-r.w);
 const length=Math.hypot(r.x,r.y,r.z),angle=2*Math.atan2(length,r.w),factor=length>1e-12?angle/length:2;
 if(angle>chart.maximumRotationVectorNorm+1e-10)throw Error('Orientation outside fixed chart');
 return [...p.toArray(),r.x*factor,r.y*factor,r.z*factor];
}
export function followerToPose(chart,position){
 if(!Array.isArray(position)||position.length!==6||!position.every(Number.isFinite))throw Error('Finite chart coordinates required');
 const v=new Vector3(...position.slice(3)),angle=v.length();if(angle>chart.maximumRotationVectorNorm+1e-10)throw Error('Orientation outside fixed chart');
 const base=new Quaternion().fromArray(chart.quaternion),relative=angle>1e-12?new Quaternion().setFromAxisAngle(v.multiplyScalar(1/angle),angle):new Quaternion();
 const matrix=new Matrix4().makeRotationFromQuaternion(base.clone().multiply(relative)),p=new Vector3(...position.slice(0,3)).applyQuaternion(base);
 matrix.setPosition(p.x+chart.neutral.headPose[3],p.y+chart.neutral.headPose[7],p.z+chart.neutral.headPose[11]);
 const e=matrix.elements,m=Array.from({length:16},(_,i)=>e[(i%4)*4+Math.floor(i/4)]);
 return {...chart.neutral,headPose:rigidPose(m)};
}
