import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SOURCE_COMMIT,hash,inspectGlb} from './reachy-model-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'public/reachy-model');
const manifest=JSON.parse(await fs.readFile(path.join(out,'asset-manifest.json'),'utf8'));
if(manifest.source_commit!==SOURCE_COMMIT||manifest.runtime_scale!==1||manifest.output_units!=='metres')throw Error('Unexpected model source/scale');
if(manifest.rigid_groups.length!==5||new Set(manifest.rigid_groups.map(g=>g.name)).size!==5)throw Error('Invalid five-group model');
let triangles=0,bytes=0;
for(const group of manifest.rigid_groups){
  const binary=await fs.readFile(path.join(out,group.file)),metrics=inspectGlb(binary);
  if(hash(binary)!==group.sha256||metrics.triangles!==group.triangles||metrics.meshes!==group.visual_bindings.length||group.runtime_scale!==1)throw Error(`Invalid group ${group.name}`);
  if(![...group.bounds.min,...group.bounds.max].every(Number.isFinite))throw Error('Invalid metric bounds');triangles+=metrics.triangles;bytes+=metrics.bytes;
}
for(const source of manifest.source_meshes){if(!source.lfs_sha256||source.lfs_sha256!==source.sha256||source.lfs_bytes!==source.bytes)throw Error('Unverified source mesh');}
for(const side of ['right','left']){const binding=manifest.model.antennas[side];if(binding.pivotMatrix.length!==16||binding.axis.join(',')!=='0,0,1'||binding.sign!==1)throw Error('Invalid source antenna binding');}
if(manifest.model.neutralHeadHeight!==.177||manifest.validation.unresolved_lfs!==0||manifest.validation.missing_meshes!==0)throw Error('Incomplete model');
console.log(JSON.stringify({ok:true,groups:5,sourceBinaries:manifest.source_meshes.length,visuals:manifest.validation.selected_visuals,triangles,bytes,sourceCommit:SOURCE_COMMIT,physicalRevisionVerified:false,license:'private staging; redistribution unresolved'}));
