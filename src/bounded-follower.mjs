// Pure six-dimensional commanded-state planner. No timers, transport or device IO.
export const FOLLOWER_AXES = Object.freeze(['x','y','z','rx','ry','rz']);
const clone = value => structuredClone(value);
const freeze = value => { if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value; };
const vector = (v,name) => {if(!Array.isArray(v)||v.length!==6||!v.every(Number.isFinite))throw Error(`Six finite ${name} values required`);return [...v];};
const choose=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;};
const valueAt=(c,u)=>c.reduceRight((v,x)=>v*u+x,0);
function derivative(c,T){return c.slice(1).map((x,i)=>x*(i+1)/T);}
function bernstein(c){const n=c.length-1;return c.map((_,k)=>c.slice(0,k+1).reduce((s,a,i)=>s+a*choose(k,i)/choose(n,i),0));}
function split(b){let row=b.slice();const left=[row[0]],right=[row.at(-1)];while(row.length>1){row=row.slice(1).map((v,i)=>(row[i]+v)/2);left.push(row[0]);right.unshift(row.at(-1));}return [left,right];}
function pieces(b,depth){if(!depth)return [b];return split(b).flatMap(x=>pieces(x,depth-1));}
function coefficients(p,v,a,target,T){const d=target-p,V=v*T,A=a*T*T;return [p,V,A/2,10*d-6*V-1.5*A,-15*d+8*V+1.5*A,6*d-3*V-.5*A];}
function certify(coeffs,T,bounds,limits){
 const groups=[[0,1,2],[3,4,5]],names=['translation','rotation'];
 const proof={method:'subdivided-Bernstein-convex-hull',subdivisionDepth:5,float64:true,intervalCertified:false,
  position:[],velocity:{},acceleration:{},jerk:{},rotationVectorNorm:0,withinBounds:true};
 for(let order=0;order<=3;order++){
  const segments=coeffs.map(c=>{let d=c;for(let j=0;j<order;j++)d=derivative(d,T);return pieces(bernstein(d),5);});
  if(!segments.flat(2).every(Number.isFinite)){proof.withinBounds=false;return proof;}
  if(order===0){
   for(let axis=0;axis<6;axis++){
    const all=segments[axis].flat(),low=Math.min(...all),high=Math.max(...all);proof.position.push([low,high]);
    if(low<bounds[axis][0]-1e-12||high>bounds[axis][1]+1e-12)proof.withinBounds=false;
   }
  }
  for(let g=0;g<groups.length;g++){
   let peak=0;
   for(let s=0;s<32;s++)for(let k=0;k<segments[0][s].length;k++)
    peak=Math.max(peak,Math.hypot(...groups[g].map(i=>segments[i][s][k])));
   if(order===0){if(g===1){proof.rotationVectorNorm=peak;if(peak>limits.rotation.positionNorm+1e-12)proof.withinBounds=false;}}
   else {const name=['','velocity','acceleration','jerk'][order];proof[name][names[g]]=peak;if(peak>limits[names[g]][name]*(1+1e-10))proof.withinBounds=false;}
  }
 }
 return proof;
}
export function evaluateFollowerCurve(curve,time){
 if(!Number.isFinite(time)||time<0||time>curve.durationSeconds+1e-9)throw Error('Time outside follower segment');
 if(time>=curve.durationSeconds)return {position:[...curve.target],velocity:Array(6).fill(0),acceleration:Array(6).fill(0),jerk:curve.coefficients.map(c=>valueAt(derivative(derivative(derivative(c,curve.durationSeconds),curve.durationSeconds),curve.durationSeconds),1))};
 const T=curve.durationSeconds,u=time/T;
 return Object.fromEntries(['position','velocity','acceleration','jerk'].map((name,n)=>[name,curve.coefficients.map(c=>{let d=c;for(let i=0;i<n;i++)d=derivative(d,T);return valueAt(d,u);})]));
}

export class BoundedFollower {
 constructor({bounds,limits,maxStepSeconds=.02,maxDurationSeconds=60}={}){
  if(!Array.isArray(bounds)||bounds.length!==6||bounds.some(b=>!Array.isArray(b)||b.length!==2||!b.every(Number.isFinite)||b[0]>=b[1]))throw Error('Finite six-axis workspace bounds required');
  for(const group of ['translation','rotation'])for(const field of ['velocity','acceleration','jerk'])if(!(limits?.[group]?.[field]>0)||!Number.isFinite(limits[group][field]))throw Error('Positive finite derivative bounds required');
  if(!(limits.rotation.positionNorm>0&&limits.rotation.positionNorm<Math.PI)||!Number.isFinite(maxStepSeconds)||maxStepSeconds<=0||maxStepSeconds>.05||!Number.isFinite(maxDurationSeconds)||maxDurationSeconds<=0||maxDurationSeconds>120)throw Error('Bounded chart/timing policy required');
  this.config=freeze(clone({bounds,limits,maxStepSeconds,maxDurationSeconds}));this.active=false;this.sequence=0;
 }
 engage({position,velocity=Array(6).fill(0),acceleration=Array(6).fill(0),epoch}){
  this.invalidate('Engagement not qualified');
  if(epoch===undefined||epoch===null||!['number','string'].includes(typeof epoch)||(typeof epoch==='number'&&!Number.isSafeInteger(epoch)))throw Error('Explicit valid epoch required');
  const s={position:vector(position,'position'),velocity:vector(velocity,'velocity'),acceleration:vector(acceleration,'acceleration')};
  if(s.position.some((p,i)=>p<this.config.bounds[i][0]||p>this.config.bounds[i][1])||Math.hypot(...s.position.slice(3))>this.config.limits.rotation.positionNorm)throw Error('Engagement outside chart workspace');
  for(const [name,ids] of [['translation',[0,1,2]],['rotation',[3,4,5]]])for(const kind of ['velocity','acceleration'])
   if(Math.hypot(...ids.map(i=>s[kind][i]))>this.config.limits[name][kind]*(1+1e-10))throw Error('Engagement derivatives outside bounds');
  this.current=s;this.target=[...s.position];this.epoch=epoch;this.sequence=0;this.elapsed=0;this.curve=null;this.active=true;this.blockedReason=null;return this.snapshot();
 }
 invalidate(reason='Follower invalidated'){this.active=false;this.blockedReason=reason;}
 guard(epoch){if(!this.active||epoch!==this.epoch){this.invalidate('Inactive or retired follower epoch');throw Error(this.blockedReason);}}
 retarget(target,{epoch,sequence,sourceAt,now,maximumSourceAgeMs=500,minimumDurationSeconds=.02}={}){
  this.guard(epoch);
  try{
   if(!Number.isSafeInteger(sequence)||sequence<=this.sequence||![sourceAt,now,maximumSourceAgeMs,minimumDurationSeconds].every(Number.isFinite)
     ||sourceAt>now||now-sourceAt>maximumSourceAgeMs||maximumSourceAgeMs<=0||maximumSourceAgeMs>500||minimumDurationSeconds<this.config.maxStepSeconds||minimumDurationSeconds>this.config.maxDurationSeconds)
    throw Error('Fresh ordered intent and bounded duration required');
   if(!target||typeof target!=='object'||Array.isArray(target)||!Object.keys(target).length||Object.keys(target).some(k=>!FOLLOWER_AXES.includes(k)||!Number.isFinite(target[k])))throw Error('Finite named follower targets required');
   const goal=FOLLOWER_AXES.map((axis,i)=>Object.hasOwn(target,axis)?target[axis]:this.target[i]);
   if(goal.some((p,i)=>p<this.config.bounds[i][0]||p>this.config.bounds[i][1])||Math.hypot(...goal.slice(3))>this.config.limits.rotation.positionNorm)throw Error('Target outside chart workspace');
   let T=minimumDurationSeconds,curve=null;
   // Finite sufficient-feasibility search, not a time-optimal or complete solver.
   for(let attempt=0;attempt<96&&T<=this.config.maxDurationSeconds+1e-9;attempt++,T*=1.08){
    const coeffs=goal.map((p,i)=>coefficients(this.current.position[i],this.current.velocity[i],this.current.acceleration[i],p,T));
    const proof=certify(coeffs,T,this.config.bounds,this.config.limits);
    if(proof.withinBounds){curve=freeze({schema:'reachy.carried-quintic.v1',durationSeconds:T,minimumDurationSeconds,
      coefficients:coeffs,target:goal,start:clone(this.current),proof,epoch,sequence});break;}
   }
   if(!curve)throw Error('No bounded quintic found; output inhibited');
   this.curve=curve;this.target=goal;this.sequence=sequence;this.elapsed=0;return curve;
  }catch(error){this.invalidate(error.message);throw error;}
 }
 sampleAt(time){if(!this.active||!this.curve)throw Error('No active follower segment');return evaluateFollowerCurve(this.curve,time);}
 advanceTo(time,{epoch}={}){
  this.guard(epoch);
  if(!this.curve||!Number.isFinite(time)||time<0||time<this.elapsed-1e-10||time-this.elapsed>this.config.maxStepSeconds+1e-9||time>this.curve.durationSeconds+1e-9){this.invalidate('Invalid/catch-up follower step');throw Error(this.blockedReason);}
  const s=evaluateFollowerCurve(this.curve,time);this.current={position:s.position,velocity:s.velocity,acceleration:s.acceleration};this.elapsed=Math.min(time,this.curve.durationSeconds);return this.snapshot();
 }
 snapshot(){return clone({active:this.active,blockedReason:this.blockedReason,epoch:this.epoch,sequence:this.sequence,elapsed:this.elapsed,
  position:this.current?.position,velocity:this.current?.velocity,acceleration:this.current?.acceleration,target:this.target});}
}
