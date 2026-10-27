// Offline preparation only. Never constructs an adapter or contacts a device.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {makePlan,planHash,sampleReference,curvePeaks} from './trajectory-comparison.mjs';
import {IDENTITY_POSE} from '../server/head-pose.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function prepareComparison({appRoot=root,output='local/trajectory-comparison-20261016'}={}) {
  if(process.versions.node.split('.')[0]!=='24')throw Error('Node 24 required');
  const local=path.join(appRoot,'local'),directory=path.resolve(appRoot,output);
  if(!directory.startsWith(local+path.sep))throw Error('Preparation output must remain under ignored local/');
  await fs.mkdir(directory,{recursive:true});
  // Synthetic task-frame neutral, not a current robot observation or a claimed head height.
  const headPose=[...IDENTITY_POSE];headPose[11]=0;
  const plan=makePlan({headPose,bodyYaw:0,antennas:[0,0]});
  const sourceNames=['tools/trajectory-comparison.mjs','tools/Prepare-Trajectory-Comparison.mjs',
    'server/control.mjs','server/head-pose.mjs','test/trajectory-comparison.test.mjs','test/fixtures/pollen-goto-reference.json',
    'docs/TRAJECTORY_COMPARISON.md'];
  const sources={};for(const name of sourceNames)sources[name]=hash(await fs.readFile(path.join(appRoot,name)));
  const references={};
  // Reuse small existing backup/audit receipts. Do not copy or make full archives.
  try {
    const previous=JSON.parse(await fs.readFile(path.join(local,'fixed-target-capture-20261016/PREPARED.json')));
    for(const key of ['existingBackupReference','priorOriginalAudit']){
      const filename=path.resolve(previous[key]);
      if(!filename.startsWith(local+path.sep))throw Error('Existing receipt must remain private');
      references[key]={path:path.relative(appRoot,filename).replaceAll('\\','/'),sha256:hash(await fs.readFile(filename)),currentHardwareVerified:false};
    }
  } catch(error) {
    if(error.code!=='ENOENT')throw error;
    references.requiredBeforeHardware='Existing reviewed backup and original-software audit receipts were not found on this checkout.';
  }
  const privatePins={};
  for(const name of ['trajectory-comparison-20261016/guarded-owner.mjs','trajectory-comparison-20261016/owner.test.mjs',
    'trajectory-comparison-20261016/pollen-oracle.py','trajectory-comparison-20261016/model-review.py',
    'fixed-target-capture-20261016/comparison.mjs',
    'fixed-target-capture-20261016/native-capture.mjs','matched-holding-20261014/fixed-plan.mjs']){
    const filename=path.join(local,name);
    try{privatePins[path.relative(appRoot,filename).replaceAll('\\','/')]=hash(await fs.readFile(filename));}
    catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const oracle=JSON.parse(await fs.readFile(path.join(appRoot,'test/fixtures/pollen-goto-reference.json')));
  const curves=plan.legs.filter(x=>x.block===1&&x.direction==='out').map(leg=>({id:leg.id,arm:leg.arm,
    nominalOnly:true,peaks:curvePeaks(leg.start,leg.target,plan.durationSeconds,leg.arm==='pc-linear'?'linear':'minjerk'),
    frames:Array.from({length:Math.round(plan.durationSeconds*1000/plan.periodMs)+1},(_,i)=>({phaseSeconds:i*.02,output:sampleReference(plan,leg,leg.start,i*.02)}))}));
  const preparation={schema:'reachy.trajectory-comparison-preparation.v1',at:new Date().toISOString(),
    planSha256:planHash(plan),sources,privatePins,oracleSources:oracle.sourceSha256,upstreamCommit:oracle.upstreamCommit,
    existingBackupReferences:references,synthetic:true,hardwareArmed:false,robotRequests:0,newFullBackups:0,
    installs:0,modeCorrectionIncluded:false,gainsChanged:false,
    pendingHardwareGates:['Current attended authorization and exclusive robot lease.',
      'Fresh identity/version, original software/motor settings and existing-backup integrity.',
      'One explicit Wake and visual confirmation; matched quiescent aims and no competing apps.',
      'Fresh stable actual nominal-height start, clearance/model review, real-plan freeze and hash approval.',
      'E0 native observer qualification at inherited >=1250ms completion-based cooldown.',
      'One owner through conditions; pauses require review; no target replay or automatic Sleep.']};
  for(const [name,value] of Object.entries({'SYNTHETIC_PLAN.json':plan,'NOMINAL_CURVES.json':curves,'PREPARED.json':preparation}))
    await fs.writeFile(path.join(directory,name),JSON.stringify(value,null,2)+'\n');
  return {directory:path.relative(appRoot,directory),planSha256:preparation.planSha256,legs:plan.legs.length,
    synthetic:true,hardwareArmed:false,robotRequests:0,newFullBackups:0,existingBackupReferences:Object.keys(references).length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==2)throw Error('Offline-only command accepts no live/device arguments');
  console.log(JSON.stringify(await prepareComparison(),null,2));
}
