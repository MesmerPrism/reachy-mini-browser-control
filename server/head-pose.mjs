export const HEAD_YAW_LIMIT = 20;
export const HEAD_PITCH_LIMIT = 15;
export const HEAD_SPEED = 20;
export const HEAD_FRAME_MS = 20;
export const HEAD_WATCHDOG_MS = 400;
export const IDENTITY_POSE = [1,0,0,0, 0,1,0,0, 0,0,1,0.177, 0,0,0,1];
export const HEAD_ROTATION_DRIFT_LIMIT = 0.005;
function determinant(r) {
  return r[0]*(r[4]*r[8]-r[5]*r[7])-r[1]*(r[3]*r[8]-r[5]*r[6])+r[2]*(r[3]*r[7]-r[4]*r[6]);
}
function rotationResidual(r) {
  let gram = 0;
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) {
    let dot=0; for (let k=0;k<3;k++) dot+=r[i*3+k]*r[j*3+k];
    gram=Math.max(gram,Math.abs(dot-(i===j?1:0)));
  }
  const det=determinant(r);
  return {gram,det,error:Math.max(gram,Math.abs(det-1))};
}
export function rigidPose(value) {
  const m = Array.isArray(value) ? value : value?.m;
  if (!Array.isArray(m) || m.length !== 16 || !m.every(Number.isFinite)) throw Error('Finite head pose matrix unavailable');
  const near = (a,b) => Math.abs(a-b) < 1e-4;
  if (![12,13,14].every(i => near(m[i],0)) || !near(m[15],1)) throw Error('Invalid rigid head pose');
  let rotation=[m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]];
  const residual=rotationResidual(rotation);
  if (residual.det<=0 || residual.error>HEAD_ROTATION_DRIFT_LIMIT) throw Error('Invalid rigid head rotation');
  // Keep strict rotation inputs byte-exact. Measured daemon poses can have
  // small numerical drift: admit only bounded near-SO(3) input, then use the
  // polar Newton iteration to remove scale/shear without changing translation.
  if (residual.error<1e-4) return [...m];
  for (let iteration=0;iteration<4;iteration++) {
    const [a,b,c,d,e,f,g,h,i]=rotation,det=determinant(rotation);
    const inverseTranspose=[e*i-f*h,f*g-d*i,d*h-e*g,c*h-b*i,a*i-c*g,b*g-a*h,b*f-c*e,c*d-a*f,a*e-b*d].map(x=>x/det);
    rotation=rotation.map((x,k)=>(x+inverseTranspose[k])/2);
  }
  const projected=rotationResidual(rotation);
  if (!rotation.every(Number.isFinite) || projected.det<=0 || projected.error>1e-10) throw Error('Invalid rigid head rotation');
  const result=[...m];
  for(let r=0;r<3;r++) for(let c=0;c<3;c++) result[r*4+c]=rotation[r*3+c];
  return result;
}
// Local baseline orientation multiplied by Rz(yaw) Ry(pitch), xyz convention.
export function relativeHeadPose(baseline,yaw,pitch) {
  const m=rigidPose(baseline);
  if (![yaw,pitch].every(Number.isFinite)) throw Error('Invalid head angles');
  const y=yaw*Math.PI/180,p=pitch*Math.PI/180,cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p);
  const d=[cy*cp,-sy,cy*sp,sy*cp,cy,sy*sp,-sp,0,cp];
  const result=[...m];
  for(let r=0;r<3;r++) for(let c=0;c<3;c++) result[r*4+c]=[0,1,2].reduce((sum,k)=>sum+m[r*4+k]*d[k*3+c],0);
  return result;
}
export function slewHead(previous,target,seconds) {
  const dy=target.yaw-previous.yaw,dp=target.pitch-previous.pitch;
  const length=Math.hypot(dy,dp),step=HEAD_SPEED*Math.max(0,Math.min(seconds,HEAD_FRAME_MS/1000));
  const scale=length ? Math.min(1,step/length):0;
  return {yaw:previous.yaw+dy*scale,pitch:previous.pitch+dp*scale};
}
export function headAngles(value) {
  const m=rigidPose(value);
  const pitch=Math.asin(Math.max(-1,Math.min(1,-m[8])));
  const nearGimbal=Math.abs(Math.cos(pitch))<1e-7;
  const yaw=nearGimbal ? Math.atan2(-m[1],m[5]) : Math.atan2(m[4],m[0]);
  const roll=nearGimbal ? 0 : Math.atan2(m[9],m[10]);
  const degrees=x=>x*180/Math.PI;
  return {yaw:degrees(yaw),pitch:degrees(pitch),roll:degrees(roll)};
}
// Daemon xyz Euler convention: Rz(yaw) Ry(pitch) Rx(roll).
export function absoluteHeadPose(baseline,yaw,pitch,roll=headAngles(baseline).roll,positionMm=null) {
  const m=rigidPose(baseline);
  if(![yaw,pitch,roll].every(Number.isFinite))throw Error('Invalid head angles');
  const radians=x=>x*Math.PI/180;
  const y=radians(yaw),p=radians(pitch),r=radians(roll);
  const cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p),cr=Math.cos(r),sr=Math.sin(r);
  const rotation=[cy*cp,cy*sp*sr-sy*cr,cy*sp*cr+sy*sr,sy*cp,sy*sp*sr+cy*cr,sy*sp*cr-cy*sr,-sp,cp*sr,cp*cr];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)m[row*4+col]=rotation[row*3+col];
  if(positionMm!==null) {
    if(!['x','y','z'].every(axis=>Number.isFinite(positionMm[axis])))throw Error('Invalid head translation');
    m[3]=positionMm.x/1000;m[7]=positionMm.y/1000;m[11]=positionMm.z/1000;
  }
  return m;
}

export const MANUAL_HEAD_AXES = ['yaw','pitch','roll','x','y','z'];
export function headPositionMm(value) {
  const m=rigidPose(value);
  return {x:m[3]*1000,y:m[7]*1000,z:m[11]*1000};
}
export function manualHeadDistance(from,to) {
  return {angular:Math.hypot(...['yaw','pitch','roll'].map(axis=>to[axis]-from[axis])),linear:Math.hypot(...['x','y','z'].map(axis=>to[axis]-from[axis]))};
}
export function slewManualHead(previous,target,seconds) {
  const distance=manualHeadDistance(previous,target),dt=Math.max(0,Math.min(seconds,HEAD_FRAME_MS/1000));
  const angular=target.speedLimit===null ? Infinity : target.speedLimit*dt;
  const linear=target.linearSpeedLimit===null ? Infinity : target.linearSpeedLimit*dt;
  const scale=Math.min(1,distance.angular ? angular/distance.angular:1,distance.linear ? linear/distance.linear:1);
  return Object.fromEntries(MANUAL_HEAD_AXES.map(axis=>[axis,previous[axis]+(target[axis]-previous[axis])*scale]));
}
