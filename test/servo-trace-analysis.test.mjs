import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { analyzeServoCapture } from '../tools/Analyze-Servo-Trace.mjs';
import { IDENTITY_POSE } from '../server/head-pose.mjs';

const seven = x => Array(7).fill(x);
function bracket(sequence=1,error=48,pwm=56) {
  const state=()=>({target_head_pose:{m:[...IDENTITY_POSE]},target_head_joints:seven(0)});
  return {kind:'loop',before:{body:state()},after:{body:state()},diagnostic:{body:{
    motor_ids:[10,11,12,13,14,15,16],read_sequence:sequence,read_started_at:sequence*2,read_completed_at:sequence*2+.02,
    goal_position_counts:seven(2048),position_trajectory_counts:seven(2048),present_position_counts:seven(2048-error),
    present_velocity_raw:seven(1),present_pwm_raw:seven(pwm),goal_pwm_raw:seven(885),pwm_limit_raw:seven(885),
    operating_mode_values:seven(3),position_p_gain_raw:seven(300),position_i_gain_raw:seven(0),position_d_gain_raw:seven(0),
    feedforward_1st_gain_raw:seven(0),feedforward_2nd_gain_raw:seven(0),
  }}};
}
const analyze = entries => analyzeServoCapture({diagnostics:entries},IDENTITY_POSE);

test('saved bracket separates converted goal, trajectory and present error without mutation',()=>{
  const b=bracket(),original=structuredClone(b);b.diagnostic.body.position_trajectory_counts[0]=2046;
  const result=analyze([b]);assert.equal(result.stableBrackets,1);assert.equal(result.goalsMatchConvertedTargets,true);
  assert.equal(result.maximumGoalTrajectoryDifferenceCounts,2);assert.equal(result.maximumGoalPresentDifferenceCounts,48);
  assert.deepEqual(b,{...original,diagnostic:{body:{...original.diagnostic.body,position_trajectory_counts:[2046,2048,2048,2048,2048,2048,2048]}}});
  assert.equal(result.robotRequests,0);assert.equal(result.empiricalFloorModel.firmwareFormulaVerified,false);
});
test('negative one-count error uses floor rather than truncation and never recommends gains',()=>{
  const r=analyze([bracket(1,-1,-2)]);assert.equal(r.empiricalFloorModel.exactMatches,7);
  assert.equal(r.stable[0].motors[0].empiricalFloorPwm,-2);
  assert.equal(r.empiricalFloorModel.gainChangeJustified,false);
});
test('empirical mismatch is retained rather than rescaled to fit',()=>{
  const r=analyze([bracket(1,48,112)]);assert.equal(r.empiricalFloorModel.exactMatches,0);
  assert.equal(r.empiricalFloorModel.maximumAbsoluteResidual,56);assert.equal(r.stable[0].motors[0].pwmRaw,112);
});
test('nonzero I/D or feedforward and other operating modes do not qualify for the empirical model',()=>{
  for(const [field,value] of [['position_i_gain_raw',1],['position_d_gain_raw',1],['feedforward_1st_gain_raw',1],['feedforward_2nd_gain_raw',1],['operating_mode_values',5]]) {
    const b=bracket();b.diagnostic.body[field]=seven(value);
    const r=analyze([b]);assert.equal(r.stableBrackets,1);assert.equal(r.empiricalFloorModel.observations,0);assert.equal(r.empiricalFloorModel.maximumAbsoluteResidual,null);
  }
});
test('a goal delivery mismatch is visible even when the empirical PWM fit passes',()=>{
  const b=bracket();b.diagnostic.body.goal_position_counts[4]++;
  const r=analyze([b]);assert.equal(r.goalsMatchConvertedTargets,false);assert.equal(r.stable[0].motors[4].goalMinusConverted,1);
});
test('mixed or omitted destination/joint evidence stays excluded and unknown',()=>{
  for(const change of [b=>delete b.before.body.target_head_pose,b=>b.after.body.target_head_pose.m[3]+=.002,
    b=>b.after.body.target_head_joints[3]=.1,b=>delete b.after.body.target_head_joints]) {
    const b=bracket();change(b);const r=analyze([b]);assert.equal(r.stableBrackets,0);
    assert.equal(r.goalsMatchConvertedTargets,null);assert.equal(r.maximumGoalPresentDifferenceCounts,null);assert.equal(r.excluded.length,1);
  }
});
test('malformed signed/vector fields, IDs and native times cannot qualify',()=>{
  for(const change of [b=>b.diagnostic.body.present_pwm_raw[0]=32768,b=>b.diagnostic.body.present_velocity_raw[0]=2147483648,
    b=>b.diagnostic.body.present_position_counts[0]=NaN,b=>b.diagnostic.body.goal_pwm_raw=[885],
    b=>b.diagnostic.body.motor_ids.reverse(),b=>b.diagnostic.body.read_completed_at=1,
    b=>b.diagnostic.body.read_started_at='2',b=>b.diagnostic.body.read_sequence=0,
    b=>b.diagnostic.body.read_started_at=-1,b=>b.diagnostic.body.read_completed_at=12]) {
    const b=bracket();change(b);const r=analyze([b]);assert.equal(r.stableBrackets,0);assert.equal(r.excluded.length,1);
  }
});
test('duplicate and overlapping native reads are excluded',()=>{
  const b=bracket(2);b.diagnostic.body.read_started_at=2;
  assert.equal(analyze([bracket(),bracket(),b]).stableBrackets,1);
});
test('cap uses both goal and EEPROM limit and zero cap is unknown',()=>{
  const b=bracket();b.diagnostic.body.goal_pwm_raw[0]=50;b.diagnostic.body.goal_pwm_raw[1]=0;
  const r=analyze([b]);assert.equal(r.stable[0].motors[0].pwmFractionOfCap,56/50);assert.equal(r.stable[0].motors[0].sampledPwmAtCap,true);
  assert.equal(r.stable[0].motors[1].pwmFractionOfCap,null);assert.equal(r.stable[0].motors[1].sampledPwmAtCap,null);
});
test('signed dynamic velocity is retained separately from sampled stationary positions',()=>{
  const a=bracket(),b=bracket(2);b.diagnostic.body.present_velocity_raw[3]=-20;
  const r=analyze([a,b]);assert.deepEqual(r.observedRawVelocities,[-20,1]);assert(r.stablePositionSpansCounts.every(m=>m.span===0));
  assert(r.limits.some(s=>s.includes('near-rest raw velocity')));
});
test('invalid matrix and excessive receipt size reject before interpretation',()=>{
  assert.throws(()=>analyzeServoCapture({diagnostics:[]},Array(16).fill(NaN)),/Finite/);
  assert.throws(()=>analyzeServoCapture({diagnostics:Array(10001)},IDENTITY_POSE),/Bounded/);
});
test('CLI requires same-epoch acknowledged destination, writes privately and refuses receipt overwrite',async t=>{
  const localPath=fileURLToPath(new URL('../local',import.meta.url));
  await fs.mkdir(localPath,{recursive:true});
  const local=await fs.realpath(localPath);
  const directory=await fs.mkdtemp(path.join(local,'servo-trace-test-'));
  t.after(async()=>{assert(directory.startsWith(local+path.sep));await fs.rm(directory,{recursive:true,force:true});});
  const capture=path.join(directory,'capture.json'),yaw=path.join(directory,'yaw.json'),output=path.join(directory,'analysis.json');
  await fs.writeFile(capture,JSON.stringify({diagnostics:[bracket()]}));
  const saved={target:{requested:0},commands:[{body:{action:'head-target',yaw:0},outcome:'acknowledged',result:{ok:true,controlEpoch:2},startedAt:10,completedAt:10.5}],
    lastDiagnostics:{lastManualHeadWrite:{epoch:2,outcome:'acknowledged',startedAt:11,completedAt:12,sent:{yaw:0},headPose:IDENTITY_POSE}}};
  await fs.writeFile(yaw,JSON.stringify(saved));
  const args=[fileURLToPath(new URL('../tools/Analyze-Servo-Trace.mjs',import.meta.url)),'--capture',capture,'--yaw',yaw,'--output',output];
  const run=promisify(execFile);
  await run(process.execPath,args);const result=JSON.parse(await fs.readFile(output,'utf8'));
  assert.equal(result.stableBrackets,1);assert.match(result.inputsSha256.capture,/^[a-f0-9]{64}$/);
  await assert.rejects(run(process.execPath,args));
  for(const change of [s=>s.lastDiagnostics.lastManualHeadWrite.epoch=1,
    s=>{delete s.lastDiagnostics.lastManualHeadWrite.epoch;delete s.commands[0].result.controlEpoch;},
    s=>s.commands.push(structuredClone(s.commands[0])),s=>s.commands[0].body.yaw=1,
    s=>delete s.lastDiagnostics.lastManualHeadWrite.completedAt,s=>s.commands[0].completedAt=9]) {
    const invalid=structuredClone(saved);change(invalid);await fs.writeFile(yaw,JSON.stringify(invalid));
    args[args.length-1]=path.join(directory,'rejected.json');await assert.rejects(run(process.execPath,args),e=>e.stderr.includes('same command epoch'));
    await assert.rejects(fs.access(args.at(-1)));
  }
  await fs.writeFile(yaw,JSON.stringify(saved));args[args.length-1]=path.join(path.dirname(directory),'..','outside-servo-test.json');
  await assert.rejects(run(process.execPath,args),e=>e.stderr.includes('ignored local directory'));
});
