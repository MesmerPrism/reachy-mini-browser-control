// Offline only. No robot config, adapters, sockets, serial ports or live flags.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {IDENTITY_POSE} from '../server/head-pose.mjs';
import {parseMatrixCsv,makeMatrixPlan} from './movement-matrix.mjs';
import {planHash,interpolatePose} from './trajectory-comparison.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function prepareMatrix({appRoot=root,output='local/movement-comparison-protocol3'}={}){
 if(process.versions.node.split('.')[0]!=='24')throw Error('Node 24 required');
 const directory=path.resolve(appRoot,output),local=path.join(appRoot,'local');
 if(!directory.startsWith(local+path.sep))throw Error('Private output directory required');
 const bytes=await fs.readFile(path.join(appRoot,'docs/movement-comparison-matrix.csv')),csvSha256=hash(bytes),rows=parseMatrixCsv(bytes.toString('utf8'));
 const neutral={headPose:IDENTITY_POSE.map((x,i)=>i===11?0:x),bodyYaw:0,antennas:[0,0]},options={csvSha256,protocolVersion:3,profile:'slow'},plan=makeMatrixPlan(neutral,rows,options);
 const full=makeMatrixPlan(neutral,rows,{...options,rounds:4});
 const paths=plan.legs.filter(x=>x.arm==='pc-linear').map(leg=>({id:leg.id,axis:leg.axis,direction:leg.direction,arm:leg.arm,
  frames:Array.from({length:65},(_,i)=>({phaseSeconds:leg.durationSeconds*i/64,output:{...leg.target,headPose:interpolatePose(leg.start.headPose,leg.target.headPose,i/64)}}))}));
 const sourceNames=['src/bounded-follower.mjs','tools/follower-pose.mjs','tools/movement-matrix.mjs','tools/matrix-owner-port.mjs',
  'tools/matrix-offline-port.mjs','tools/trajectory-comparison.mjs','tools/Prepare-Movement-Matrix.mjs','tools/Run-Movement-Matrix.mjs',
  'tools/matrix-session.mjs','test/matrix-session.test.mjs','tools/matrix-centering.mjs','test/matrix-continuation.test.mjs',
  'docs/BOUNDED_FOLLOWER.md','docs/MATRIX_RUNNER_API.md','docs/MOVEMENT_COMPARISON_MATRIX.md','docs/movement-comparison-matrix.csv','test/bounded-follower.test.mjs','test/movement-matrix.test.mjs'];
 const sources={};for(const name of sourceNames)sources[name]=hash(await fs.readFile(path.join(appRoot,name)));
 const references={};
 for(const name of ['local/changed-p-roundtrip-20261016/COMPLETION.json','local/changed-p-roundtrip-20261016/post-power-audit.json'])
  try{references[name]={sha256:hash(await fs.readFile(path.join(appRoot,name))),currentHardwareVerified:false};}catch(e){if(e.code!=='ENOENT')throw e;}
 const receipt={schema:'reachy.matrix-offline-preparation.v3',at:new Date().toISOString(),synthetic:true,hardwareArmed:false,
  robotRequests:0,newFullBackups:0,installs:0,gainsChanged:false,modeCorrectionIncluded:false,sources,existingBackupReferences:references,
  planSha256:planHash(plan),fullPlanSha256:planHash(full),nominalSegments:96,fullBalancedSegments:384,geometryPaths:paths.length,
  pending:['Current device identity/version/owner/context and original software/settings verification.',
   'Actual-start full-path IK/joint and attended clearance review, not just nominal samples.',
   'Explicit Wake/visual admission and qualified native observer before any targets; explicit final Sleep outside the runner.',
   'New bounded-follower and wider profile have no physical qualification.']};
 await fs.mkdir(directory,{recursive:true});
 for(const [name,value] of Object.entries({'PLAN.json':plan,'BALANCED_PLAN.json':full,'NOMINAL_GEOMETRY.json':paths,'PREPARED.json':receipt}))await fs.writeFile(path.join(directory,name),JSON.stringify(value,null,2)+'\n');
 return {directory,plan,receipt};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==2)throw Error('Offline preparation accepts no live/device arguments');
 const {receipt}=await prepareMatrix();console.log(JSON.stringify({planSha256:receipt.planSha256,nominalSegments:96,fullBalancedSegments:384,robotRequests:0,newFullBackups:0}));
}
