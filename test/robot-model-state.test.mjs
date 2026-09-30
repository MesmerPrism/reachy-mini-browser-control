import test from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITY_MATRIX, buildRobotTransforms, deriveRobotModelState, toColumnMajor } from '../src/robot-model-state.mjs';
const pose = () => [...IDENTITY_MATRIX];
const translation = (x,y,z) => { const m=pose();m[3]=x;m[7]=y;m[11]=z;return m; };
const model = { neutralHeadHeight: .177, bodyZero: translation(0,0,.0348), antennas: {
  right:{pivotMatrix:translation(0,-.04,.08),axis:[1,0,0],sign:-1},
  left:{pivotMatrix:translation(0,.04,.08),axis:[1,0,0],sign:1},
} };
const status = () => ({connected:true,ready:true,headPose:pose(),bodyYaw:0,antennas:{left:0,right:0},diagnostics:{snapshot:{startAgeMs:100}}});
const derive = (state,extra={}) => deriveRobotModelState({session:{mode:'real'},status:state,statusReadAt:1000,now:1100,model,...extra});
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('body-only asymmetric yaw never rotates the fixed measured head a second time',()=>{
  const state=status();state.bodyYaw=Math.PI/3;state.headPose=translation(.01,-.02,.005);
  const transforms=buildRobotTransforms(state,model);
  near(transforms.body[0],.5);near(transforms.body[4],Math.sqrt(3)/2);near(transforms.body[11],.0348);
  near(transforms.head[0],1);near(transforms.head[3],.01);near(transforms.head[7],-.02);near(transforms.head[11],.182);
});
test('nominal head height appears exactly once; nested measured pose and column-major memory retain translations',()=>{
  const state=status();const flat=translation(.03,.02,-.011);state.headPose=Array.from({length:4},(_,row)=>flat.slice(row*4,row*4+4));
  const head=buildRobotTransforms(state,model).head;near(head[11],.166);
  const columns=toColumnMajor(head);near(columns[12],.03);near(columns[13],.02);near(columns[14],.166);assert.deepEqual(toColumnMajor(columns),head);
});
test('bridge left feedback drives source right geometry with its signed axis and head parent',()=>{
  const state=status();state.bodyYaw=Math.PI/2;state.antennas={left:30,right:0};
  const result=buildRobotTransforms(state,model);near(result.antennas.right[6],.5);near(result.antennas.right[9],-.5);
  near(result.antennas.left[5],1);near(result.antennas.left[7],.04);near(result.antennas.right[11],.257);
  near(result.antennaLocal.right[11],.08);
});
test('bridge right feedback drives only source left geometry; swapping values preserves each source pivot',()=>{
  const state=status();state.antennas={left:0,right:30};
  const result=buildRobotTransforms(state,model);
  near(result.antennas.right[5],1);near(result.antennas.right[6],0);
  near(result.antennas.left[6],-.5);near(result.antennas.left[9],.5);
  near(result.antennas.left[7],.04);near(result.antennas.right[7],-.04);
  near(result.antennas.left[11],.257);near(result.antennas.right[11],.257);
});
test('invalid and reflected measured pose cannot qualify; bounded daemon numeric drift is projected',()=>{
  for(const [index,value] of [[0,NaN],[0,-1],[4,.03],[15,0]]) {
    const state=status();state.headPose[index]=value;assert.equal(derive(state).qualified,false);
  }
  const state=status();state.headPose[0]=1.001;
  const result=derive(state);assert.equal(result.qualified,true);near(result.transforms.head[0],1);
});
test('freshness, identity and current snapshot errors freeze confirmed view; historical fault and control lock do not',()=>{
  const confirmed=derive(status());assert.equal(confirmed.qualified,true);
  for(const state of [{...status(),connected:false},{...status(),blockedReason:'Robot daemon is not ready'},
    {...status(),blockedReason:'Robot identity differs from configuration'},
    {...status(),diagnostics:{snapshot:{startAgeMs:501}}},{...status(),diagnostics:{snapshot:{startAgeMs:10,error:'timeout'}}}]) {
    const result=derive(state,{lastConfirmed:confirmed});assert.equal(result.frozen,true);assert.equal(result.transforms,confirmed.transforms);
  }
  const stale=derive(status(),{now:2501,lastConfirmed:confirmed});assert.equal(stale.qualified,false);assert.match(stale.label,/Frozen/);
  assert.equal(derive(status(),{now:999}).qualified,false);
  const held=derive({...status(),ready:false,blockedReason:'Another app has control of Reachy',diagnostics:{snapshot:{startAgeMs:10},lastFault:{reason:'historic failure'}}});
  assert.equal(held.qualified,true);assert.match(held.label,/Control held/);
});
test('targets are never read and missing model/feedback never fabricates neutral state',()=>{
  const state=status();const confirmed=derive(state);
  Object.defineProperty(state,'headManualTarget',{get(){throw Error('Target read');}});
  Object.defineProperty(state,'target_head_pose',{get(){throw Error('Target read');}});
  Object.defineProperty(state,'targets',{get(){throw Error('Target read');}});
  assert.deepEqual(derive(state).transforms,confirmed.transforms);
  assert.equal(derive(state,{model:null}).transforms,null);
  assert.equal(derive({...status(),antennas:{left:0}}).transforms,null);
  assert.equal(derive(state,{session:{mode:'demo'}}).provenance,'simulated');
});
test('late pre-Stop epoch and older same-epoch poll cannot replace newer confirmed transforms',()=>{
  const newest=derive({...status(),controlEpoch:8},{statusReadAt:1050});
  const oldEpoch=derive({...status(),controlEpoch:7,headPose:translation(.05,0,0)},{lastConfirmed:newest,statusReadAt:1080});
  assert.equal(oldEpoch.qualified,false);assert.equal(oldEpoch.transforms,newest.transforms);assert.match(oldEpoch.reason,/older control epoch/);
  const oldRead=derive({...status(),controlEpoch:8,headPose:translation(.05,0,0)},{lastConfirmed:newest,statusReadAt:1040});
  assert.equal(oldRead.qualified,false);assert.equal(oldRead.transforms,newest.transforms);assert.match(oldRead.reason,/out of order/);
  const equal=derive({...status(),controlEpoch:8},{lastConfirmed:newest,statusReadAt:1050});assert.equal(equal.qualified,true);
  const newerRead=derive({...status(),controlEpoch:8},{lastConfirmed:newest,statusReadAt:1080});assert.equal(newerRead.qualified,true);
  const futureEpoch=derive({...status(),controlEpoch:9},{lastConfirmed:newest,statusReadAt:1040});assert.equal(futureEpoch.qualified,true);
});
test('declared token, mode or boot change resets read/epoch fence and discards old frozen scene',()=>{
  const originalSession={mode:'real',token:'session-a',robotBootId:'boot-a'};
  const previous=derive({...status(),controlEpoch:9},{session:originalSession,statusReadAt:1080});
  for(const session of [{...originalSession,token:'session-b'},{...originalSession,mode:'demo'},{...originalSession,robotBootId:'boot-b'}]) {
    const reset=derive({...status(),controlEpoch:0},{session,lastConfirmed:previous,statusReadAt:1000});
    assert.equal(reset.qualified,true);assert.equal(reset.controlEpoch,0);assert.equal(reset.statusReadAt,1000);
    const unavailable=derive({...status(),connected:false,controlEpoch:0},{session,lastConfirmed:previous});
    assert.equal(unavailable.frozen,false);assert.equal(unavailable.transforms,null);
  }
});
