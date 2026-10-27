import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { rigidPose } from '../server/head-pose.mjs';

const IDS = Object.freeze([10, 11, 12, 13, 14, 15, 16]);
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const array = (value,name,min,max) => {
  if (!Array.isArray(value) || value.length !== 7 || !value.every(x => Number.isInteger(x) && x >= min && x <= max))
    throw Error(`Invalid seven-motor ${name}`);
  return value;
};
const finite = value => typeof value === 'number' && Number.isFinite(value);
const matches = (state,matrix) => Array.isArray(state?.target_head_pose?.m) && state.target_head_pose.m.length === 16 &&
  state.target_head_pose.m.every((x,i) => finite(x) && Math.abs(x-matrix[i]) <= 1e-12);
const loopRanges = Object.freeze({
  goal_position_counts:[-2147483648,2147483647], present_position_counts:[-2147483648,2147483647],
  position_trajectory_counts:[-2147483648,2147483647], present_velocity_raw:[-2147483648,2147483647],
  present_pwm_raw:[-32768,32767], goal_pwm_raw:[-32768,32767], pwm_limit_raw:[0,65535],
  operating_mode_values:[0,255], position_p_gain_raw:[0,65535], position_i_gain_raw:[0,65535],
  position_d_gain_raw:[0,65535], feedforward_1st_gain_raw:[0,65535], feedforward_2nd_gain_raw:[0,65535],
});

// Pure saved-receipt analysis. It does not import a controller or contact hardware.
export function analyzeServoCapture(capture, destinationMatrix) {
  const matrix = rigidPose(destinationMatrix);
  if (!Array.isArray(capture?.diagnostics) || capture.diagnostics.length > 10000) throw Error('Bounded diagnostic receipt required');
  const stable = [], excluded = [], allVelocities = new Set();
  let previousSequence = -1, previousEnd = -Infinity, loopSamples = 0;
  for (const [index,entry] of capture.diagnostics.entries()) {
    if (entry?.kind !== 'loop') continue;
    loopSamples++;
    try {
      const body = entry.diagnostic?.body;
      if (!equal(body?.motor_ids,IDS)) throw Error('Motor order differs from the fixed seven-motor profile');
      for (const [name,range] of Object.entries(loopRanges)) array(body[name],name,...range);
      if (!Number.isSafeInteger(body.read_sequence) || body.read_sequence <= 0 || body.read_sequence <= previousSequence ||
          !finite(body.read_started_at) || !finite(body.read_completed_at) ||
          body.read_started_at <= 0 || body.read_started_at < previousEnd || body.read_completed_at < body.read_started_at ||
          body.read_completed_at-body.read_started_at > .200001)
        throw Error('Native sequence/timing is not ordered');
      previousSequence = body.read_sequence; previousEnd = body.read_completed_at;
      body.present_velocity_raw.forEach(x => allVelocities.add(x));
      const before = entry.before?.body, after = entry.after?.body;
      if (!matches(before,matrix) || !matches(after,matrix)) throw Error('Destination matrix not stable across the read bracket');
      const joints = before.target_head_joints;
      if (!Array.isArray(joints) || joints.length !== 7 || !joints.every(finite) || !equal(joints,after.target_head_joints))
        throw Error('Joint targets not finite and stable across the read bracket');
      const converted = joints.map(x => Math.trunc(4096*(Math.PI+x)/(2*Math.PI)));
      array(converted,'converted target counts',-2147483648,2147483647);
      const motors = IDS.map((motorId,i) => {
        const goal = body.goal_position_counts[i], present = body.present_position_counts[i], trajectory = body.position_trajectory_counts[i];
        const pwm = body.present_pwm_raw[i], cap = Math.min(body.pwm_limit_raw[i],Math.abs(body.goal_pwm_raw[i]));
        const eligible = body.operating_mode_values[i] === 3 && body.position_i_gain_raw[i] === 0 &&
          body.position_d_gain_raw[i] === 0 && body.feedforward_1st_gain_raw[i] === 0 && body.feedforward_2nd_gain_raw[i] === 0;
        // Empirical integer-floor model only; neither documented firmware scaling
        // nor a tuning recommendation. Negative errors must retain floor semantics.
        const empiricalPwm = eligible ? Math.floor(body.position_p_gain_raw[i]*(trajectory-present)/256) : null;
        return { motorId, convertedTargetCounts:converted[i], goalCounts:goal, trajectoryCounts:trajectory, presentCounts:present,
          goalMinusConverted:goal-converted[i], goalMinusTrajectory:goal-trajectory, goalMinusPresent:goal-present,
          trajectoryMinusPresent:trajectory-present, pwmRaw:pwm, pwmCapRaw:cap,
          pwmFractionOfCap:cap > 0 ? Math.abs(pwm)/cap : null, sampledPwmAtCap:cap > 0 ? Math.abs(pwm) >= cap : null,
          positionPGainRaw:body.position_p_gain_raw[i], presentVelocityRaw:body.present_velocity_raw[i],
          empiricalFloorPwm:empiricalPwm, empiricalFloorResidual:empiricalPwm === null ? null : pwm-empiricalPwm };
      });
      stable.push({ sequence:body.read_sequence, nativeStartedAt:body.read_started_at, nativeCompletedAt:body.read_completed_at, motors });
    } catch(error) { excluded.push({ diagnosticIndex:index, reason:error.message }); }
  }
  const rows = stable.flatMap(s => s.motors), eligible = rows.filter(m => m.empiricalFloorPwm !== null);
  const maximum = (key) => rows.length ? Math.max(...rows.map(m => Math.abs(m[key]))) : null;
  return {
    analysisOnly:true, robotRequests:0, captureCompleted:capture.complete === true,
    captureReportedError:typeof capture.error === 'string' ? capture.error : null,
    motorIds:[...IDS], loopSamples, stableBrackets:stable.length, excluded,
    goalsMatchConvertedTargets:rows.length ? rows.every(m => m.goalMinusConverted === 0) : null,
    maximumGoalTrajectoryDifferenceCounts:maximum('goalMinusTrajectory'), maximumGoalPresentDifferenceCounts:maximum('goalMinusPresent'),
    empiricalFloorModel:{ formula:'floor(P_raw * (trajectory_counts - present_counts) / 256)',
      observations:eligible.length, exactMatches:eligible.filter(m => m.empiricalFloorResidual === 0).length,
      maximumAbsoluteResidual:eligible.length ? Math.max(...eligible.map(m => Math.abs(m.empiricalFloorResidual))) : null,
      firmwareFormulaVerified:false, gainChangeJustified:false },
    stablePositionSpansCounts:stable.length ? IDS.map((id,i) => ({motorId:id,
      span:Math.max(...stable.map(s => s.motors[i].presentCounts))-Math.min(...stable.map(s => s.motors[i].presentCounts))})) : [],
    observedRawVelocities:[...allVelocities].sort((a,b) => a-b), stable,
    limits:[
      'Saved non-atomic brackets only; no command/device nonce or physical arrival guarantee.',
      'An empirical quantized fit is not verified firmware conversion or a reason to scale raw feedback or change gains.',
      'PWM cap observations cannot exclude transient saturation or establish static load/friction.',
      'Servo encoder counts are not head yaw; near-rest raw velocity does not prove sustained physical rotation.',
      'Excluded or absent evidence is unknown; it does not demonstrate a healthy motor.',
    ],
  };
}

async function cli(args) {
  const options = {};
  for(let i=0;i<args.length;i+=2) {
    if (!['--capture','--yaw','--output'].includes(args[i]) || !args[i+1] || Object.hasOwn(options,args[i]))
      throw Error('Use --capture <saved.json> --yaw <saved.json> --output <new local/file.json>');
    options[args[i]]=args[i+1];
  }
  if(Object.keys(options).length !== 3) throw Error('Capture, yaw and private output paths are required');
  const load = async file => {
    if((await fs.stat(file)).size > 16*1024*1024) throw Error('Saved receipt exceeds 16 MiB');
    const bytes=await fs.readFile(file);return {bytes,value:JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''))};
  };
  const capture=await load(options['--capture']), yaw=await load(options['--yaw']);
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), local=await fs.realpath(path.join(root,'local'));
  const output=path.resolve(options['--output']), parent=await fs.realpath(path.dirname(output));
  if(parent !== local && !parent.startsWith(local+path.sep)) throw Error('Output must stay in this project’s existing ignored local directory');
  const details=yaw.value.lastDiagnostics?.lastFault?.details;
  const write=details?.lastWrite || yaw.value.final?.diagnostics?.lastManualHeadWrite || yaw.value.lastDiagnostics?.lastManualHeadWrite;
  const commands=yaw.value.commands?.filter(c => c.body?.action === 'head-target' && c.outcome === 'acknowledged' && c.result?.ok === true);
  const command=commands?.length === 1 ? commands[0] : null;
  if (!command || write?.outcome !== 'acknowledged' ||
      !Number.isSafeInteger(write.epoch) || write.epoch < 0 || !Number.isSafeInteger(command.result.controlEpoch) ||
      command.result.controlEpoch < 0 || write.epoch !== command.result.controlEpoch ||
      !finite(write.startedAt) || !finite(command.startedAt) || write.startedAt < command.startedAt ||
      command.startedAt <= 0 || !finite(command.completedAt) || command.completedAt < command.startedAt ||
      !finite(write.completedAt) || write.completedAt < write.startedAt ||
      !finite(yaw.value.target?.requested) || command.body.yaw !== yaw.value.target.requested || write.sent?.yaw !== yaw.value.target.requested)
    throw Error('Acknowledged destination from the same command epoch required');
  const result=analyzeServoCapture(capture.value,write.headPose);
  result.inputsSha256={capture:crypto.createHash('sha256').update(capture.bytes).digest('hex'),yaw:crypto.createHash('sha256').update(yaw.bytes).digest('hex')};
  await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({analysisOnly:true,robotRequests:0,stableBrackets:result.stableBrackets,
    goalsMatchConvertedTargets:result.goalsMatchConvertedTargets,empiricalFloorModel:result.empiricalFloorModel}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch(error => { console.error(error.message);process.exitCode=1; });
}
