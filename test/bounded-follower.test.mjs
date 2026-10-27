import test from 'node:test';
import assert from 'node:assert/strict';
import {BoundedFollower,evaluateFollowerCurve} from '../src/bounded-follower.mjs';
import {FOLLOWER_POLICY} from '../tools/movement-matrix.mjs';
const zeros=()=>Array(6).fill(0);
function follower(){const f=new BoundedFollower(FOLLOWER_POLICY);f.engage({position:zeros(),epoch:7});return f;}
const intent=(sequence=1,minimumDurationSeconds=6)=>({epoch:7,sequence,sourceAt:100,now:100,minimumDurationSeconds});
const near=(a,b,e=1e-9)=>{assert.equal(a.length,b.length);a.forEach((x,i)=>assert.ok(Math.abs(x-b[i])<e,`${x} != ${b[i]}`));};
test('full-segment norm bounds and exact rest endpoint across all six coordinates',()=>{
 for(let axis=0;axis<6;axis++)for(const sign of [-1,1]){
  const f=follower(),target=sign*(axis<3?.008:.2),curve=f.retarget({[['x','y','z','rx','ry','rz'][axis]]:target},intent());
  assert.equal(curve.proof.withinBounds,true);assert.equal(curve.proof.intervalCertified,false);
  for(let i=0;i<=1000;i++){
   const s=evaluateFollowerCurve(curve,curve.durationSeconds*i/1000);
   for(const [name,part] of [['translation',[0,3]],['rotation',[3,6]]])for(const kind of ['velocity','acceleration','jerk'])
    assert.ok(Math.hypot(...s[kind].slice(...part))<=FOLLOWER_POLICY.limits[name][kind]*(1+1e-9));
   s.position.forEach((p,j)=>assert.ok(p>=FOLLOWER_POLICY.bounds[j][0]-1e-10&&p<=FOLLOWER_POLICY.bounds[j][1]+1e-10));
  }
  near(evaluateFollowerCurve(curve,0).position,zeros());near(evaluateFollowerCurve(curve,curve.durationSeconds).velocity,zeros());
  assert.equal(evaluateFollowerCurve(curve,curve.durationSeconds).position[axis],target);
 }
});
test('mid-flight reversal carries commanded position, velocity and acceleration without resetting',()=>{
 const f=follower();f.retarget({rz:.4},intent());
 for(let phase=.02;phase<=1.5+.0001;phase+=.02)f.advanceTo(phase,{epoch:7});
 const before=f.snapshot();assert.ok(Math.abs(before.velocity[5])>.01);
 const reverse=f.retarget({rz:-.4},intent(2,6));
 const start=evaluateFollowerCurve(reverse,0);near(start.position,before.position);near(start.velocity,before.velocity);near(start.acceleration,before.acceleration);
 assert.ok(reverse.proof.withinBounds);assert.equal(f.snapshot().position[5],before.position[5]);
});
test('omitted coordinates retain the previous target while retargeting carries current state',()=>{
 const f=follower();f.retarget({x:.005,ry:.1},intent());f.advanceTo(.02,{epoch:7});
 const curve=f.retarget({ry:-.1},intent(2));assert.equal(curve.target[0],.005);assert.equal(curve.target[4],-.1);
});
test('freshness, epochs, ordering, nonfinite targets and failed solves inhibit further output',()=>{
 for(const bad of [{sequence:0},{sourceAt:101},{now:601},{epoch:8}]){
  const f=follower();f.retarget({rz:.1},intent());assert.throws(()=>f.retarget({rz:.2},{...intent(2),...bad}));
  assert.throws(()=>f.advanceTo(.02,{epoch:7}));
 }
 for(const target of [{rz:NaN},{rz:Infinity},{rz:null},{yaw:1},{rz:4},{}]){const f=follower();assert.throws(()=>f.retarget(target,intent()));assert.throws(()=>f.advanceTo(.02,{epoch:7}));}
 const f=new BoundedFollower({...FOLLOWER_POLICY,maxDurationSeconds:.02});f.engage({position:zeros(),epoch:7});
 assert.throws(()=>f.retarget({rz:.4},intent(1,.02)),/No bounded quintic/);assert.equal(f.snapshot().active,false);
 const g=follower();g.retarget({rz:.1},intent());assert.throws(()=>g.engage({position:[NaN,...zeros().slice(1)],epoch:7}));
 assert.throws(()=>g.advanceTo(.02,{epoch:7}));
 const huge=new BoundedFollower({...FOLLOWER_POLICY,bounds:[[-1e308,1e308],...FOLLOWER_POLICY.bounds.slice(1)]});
 huge.engage({position:[-9e307,...zeros().slice(1)],epoch:7});
 assert.throws(()=>huge.retarget({x:9e307},intent()),/No bounded quintic/);assert.equal(huge.snapshot().active,false);
});
test('timer stalls cannot become catch-up jumps and invalidation cannot resume an old curve',()=>{
 const f=follower();f.retarget({rz:.1},intent());assert.throws(()=>f.advanceTo(.2,{epoch:7}),/catch-up/);assert.throws(()=>f.advanceTo(.02,{epoch:7}));
 const g=follower();g.retarget({rz:.1},intent());g.invalidate('Explicit Stop');assert.throws(()=>g.advanceTo(.02,{epoch:7}));
});
test('duration extends explicitly when needed, and an infeasible near-edge reversal is never clipped',()=>{
 const f=follower(),curve=f.retarget({rz:.3},intent(1,.02));assert.ok(curve.durationSeconds>.02);assert.ok(curve.proof.withinBounds);
 const g=follower(),position=zeros(),velocity=zeros();position[0]=.0119;velocity[0]=.004;
 g.engage({position,velocity,epoch:7});assert.throws(()=>g.retarget({x:-.01},intent(1,.02)),/No bounded quintic/);
 assert.equal(g.snapshot().active,false);assert.throws(()=>g.sampleAt(0));
});
test('bounded multi-axis retargets preserve C2 state and bound vector norms',()=>{
 const f=follower();let sequence=0;
 for(let n=0;n<24;n++){
  const before=f.snapshot(),curve=f.retarget({x:.005*Math.sin(n),y:.006*Math.cos(n),rx:.15*Math.sin(n*.7),rz:.22*Math.cos(n*.3)},intent(++sequence,4));
  const s=evaluateFollowerCurve(curve,0);near(s.position,before.position);near(s.velocity,before.velocity);near(s.acceleration,before.acceleration);
  for(let i=1;i<=25;i++)f.advanceTo(i*.02,{epoch:7});
  assert.ok(curve.proof.withinBounds);
 }
});
