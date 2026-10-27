// Demonstration CLI is synthetic only. A physical port must be supplied separately.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMatrix} from './Prepare-Movement-Matrix.mjs';
import {MatrixRunner} from './movement-matrix.mjs';
import {OfflineMatrixPort} from './matrix-offline-port.mjs';
export async function runOfflineMatrix(){
 const {directory,plan}=await prepareMatrix(),io=new OfflineMatrixPort(plan.neutral),runner=new MatrixRunner({plan,io});
 while(runner.index<plan.legs.length){
  if(runner.pendingReset)await runner.confirmReset({approvedPlanSha256:runner.hash,checkpointId:runner.pendingReset.id});
  const r=await runner.runNext({approvedPlanSha256:runner.hash});if(runner.parked)throw Error(r.error||r.releaseError||'Offline matrix parked');
 }
 const summary={...runner.summary(),offlineOnly:true,synthetic:true,robotRequests:0,newFullBackups:0,
  modelReviewsAreSynthetic:true,physicalQualification:false,axisCues:io.cues.length,ownedConditions:io.conditionCount,
  powerCommands:io.requestedPowerCommands,simulatedResetCycles:io.simulatedResets,observer:'Synthetic coalesced cached snapshots; no native GETs or hardware'};
 await fs.writeFile(path.join(directory,'OFFLINE_RUN.json'),JSON.stringify({summary,segments:runner.results},null,2)+'\n');return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--demo')throw Error('Only --demo is supported; this CLI cannot control a robot');
 console.log(JSON.stringify(await runOfflineMatrix(),null,2));
}
