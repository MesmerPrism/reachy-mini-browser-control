import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Group,Mesh,MeshStandardMaterial,Color,Box3,Vector3,Matrix4,REVISION} from 'three';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {SOURCE_COMMIT,REPO,DESCRIPTION,hash,getBytes,sourceFile,parseXml,child,descendants,numbers,origin,mjcfOrigin,rows,sameMatrix,inspectGlb} from './reachy-model-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=path.join(root,'local/reachy-model-source'),out=path.join(root,'public/reachy-model');
await fs.mkdir(cache,{recursive:true});await fs.mkdir(out,{recursive:true});
const threeMetadata=JSON.parse(await fs.readFile(path.join(root,'node_modules/three/package.json'),'utf8'));
if(threeMetadata.version!=='0.186.1')throw Error('Exact Three 0.186.1 required');
if(REVISION!=='186')throw Error(`Pinned Three r186 required, got ${REVISION}`);
let tree;try{tree=JSON.parse(await fs.readFile(path.join(cache,'tree.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;tree=JSON.parse((await getBytes(`https://api.github.com/repos/${REPO}/git/trees/${SOURCE_COMMIT}?recursive=1`)).toString());await fs.writeFile(path.join(cache,'tree.json'),JSON.stringify(tree));}
if(tree.truncated)throw Error('Incomplete source tree');
for(const [directory,sha]of [['urdf','93343d2ea6b0a8c21bb4f04dba7351f9c5e8394a'],['urdf/assets','e3433a892196a4383549e1197e36c3944b51bfcf'],['mjcf','2787c6e57e305037a0e8a083595a31acdaa1590c']])if(tree.tree.find(item=>item.path===`${DESCRIPTION}/${directory}`)?.sha!==sha)throw Error(`Pinned subtree mismatch ${directory}`);
const sourceRows=[];async function load(repoPath){const file=await sourceFile(cache,tree,repoPath);sourceRows.push(file.row);return file;}
const urdfPath=`${DESCRIPTION}/urdf/robot_no_collision.urdf`,mjcfPath=`${DESCRIPTION}/mjcf/reachy_mini.xml`;
const urdfFile=await load(urdfPath),mjcfFile=await load(mjcfPath),kinematics=await load('src/reachy_mini/assets/kinematics_data.json');
const urdf=parseXml(urdfFile.bytes.toString()),mjcf=parseXml(mjcfFile.bytes.toString());
const links=urdf.children.filter(node=>node.tag==='link'),joints=urdf.children.filter(node=>node.tag==='joint');
const joint=name=>{const result=joints.find(node=>node.attrs.name===name);if(!result)throw Error(`Missing joint ${name}`);return result;};
const headJoint=joint('head_frame'),headToCasing=origin(child(headJoint,'origin')).invert(),bodyJoint=joint('yaw_body'),bodyZero=origin(child(bodyJoint,'origin'));
const headSite=descendants(mjcf,'site').find(node=>node.attrs.name==='head');sameMatrix(headToCasing.clone().invert(),mjcfOrigin(headSite),'head reference');
const mjcfBody=descendants(mjcf,'body').find(node=>node.attrs.name==='body_down_3dprint');sameMatrix(bodyZero,mjcfOrigin(mjcfBody),'body yaw');
const neutralHeadHeight=JSON.parse(kinematics.bytes.toString()).head_z_offset;if(neutralHeadHeight!==.177)throw Error('Unexpected SDK neutral head height');
const identity=rows(new Matrix4()),antennas={};
for(const side of ['right','left']){const source=joint(`${side}_antenna`),local=origin(child(source,'origin')),childLink=child(source,'child').attrs.link,mjcfPivot=descendants(mjcf,'body').find(node=>node.attrs.name===childLink);sameMatrix(local,mjcfOrigin(mjcfPivot),`${side} antenna pivot`);const axis=numbers(child(source,'axis').attrs.xyz);if(axis.length!==3||Math.abs(new Vector3(...axis).length()-1)>1e-8)throw Error('Invalid antenna axis');const mjcfJoint=child(mjcfPivot,'joint');if(mjcfJoint.attrs.name!==`${side}_antenna`||numbers(mjcfJoint.attrs.axis).some((value,i)=>value!==axis[i]))throw Error('Antenna source joint mismatch');antennas[side]={pivotMatrix:rows(headToCasing.clone().multiply(local)),axis,sign:1,zeroMatrix:identity,sourceJoint:`${side}_antenna`,sourceLink:childLink};}
const definitions=[{name:'base',link:'body_foot_3dprint',frame:'body_foot_3dprint',bake:new Matrix4()},{name:'body',link:'body_down_3dprint',frame:'body_down_3dprint',bake:new Matrix4()},{name:'head',link:'xl_330',frame:'head',bake:headToCasing},{name:'antenna_right',link:antennas.right.sourceLink,frame:antennas.right.sourceLink,bake:new Matrix4()},{name:'antenna_left',link:antennas.left.sourceLink,frame:antennas.left.sourceLink,bake:new Matrix4()}];
// GLTFExporter only needs these asynchronous Blob reads for embedded buffers.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();},error=>this.onerror?.(error));}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();},error=>this.onerror?.(error));}};
const binaries=new Map(),sourceMeshes=[],groups=[],loader=new STLLoader(),exporter=new GLTFExporter();
for(const definition of definitions){
  const sourceLink=links.find(node=>node.attrs.name===definition.link);if(!sourceLink)throw Error(`Missing source rigid link ${definition.link}`);
  const group=new Group();group.name=`reachy_${definition.name}`;const visuals=sourceLink.children.filter(node=>node.tag==='visual'),bindings=[];
  for(const [index,visual]of visuals.entries()){
    const meshNode=child(child(visual,'geometry'),'mesh');if(!meshNode)throw Error('Unsupported selected visual geometry');
    const relative=meshNode.attrs.filename.replace(/^package:\/\//,'');if(!/^assets\/[\w.-]+\.stl$/.test(relative))throw Error('Unexpected source mesh reference');
    const repoPath=`${DESCRIPTION}/urdf/${relative}`;let source=binaries.get(repoPath);if(!source){source=await load(repoPath);binaries.set(repoPath,source);sourceMeshes.push({...source.row,license_status:'hardware-scope/vendor-notices-unresolved-private-only'});}
    const buffer=source.bytes.buffer.slice(source.bytes.byteOffset,source.bytes.byteOffset+source.bytes.byteLength),geometry=loader.parse(buffer);
    // Some binary CAD/STL headers are parsed as all-black vertex colours.
    // glTF multiplies those by the material. URDF visual RGBA is the audited
    // material authority here, so retain geometry but discard CAD colours.
    geometry.deleteAttribute('color');
    for(const attribute of ['position','normal'])if(!geometry.getAttribute(attribute)?.array.every(Number.isFinite))throw Error(`Nonfinite source geometry ${repoPath}`);
    const scale=numbers(meshNode.attrs.scale,[1,1,1]);if(scale.length!==3||scale.some(value=>value<=0))throw Error('Invalid source mesh scale');
    const visualMatrix=definition.bake.clone().multiply(origin(child(visual,'origin'))).scale(new Vector3(...scale));geometry.applyMatrix4(visualMatrix);
    const materialNode=child(visual,'material'),rgba=numbers(child(materialNode,'color')?.attrs.rgba,[1,1,1,1]);if(rgba.length!==4||rgba.some(value=>value<0||value>1))throw Error('Invalid source material');
    const material=new MeshStandardMaterial({color:new Color().setRGB(...rgba.slice(0,3)),opacity:rgba[3],transparent:rgba[3]<1,roughness:.7,metalness:0});material.name=materialNode.attrs.name;
    const mesh=new Mesh(geometry,material);mesh.name=`${definition.link}__${index}__${path.basename(relative,'.stl')}`;group.add(mesh);
    bindings.push({link:definition.link,visual_index:index,source_line:visual.line,mesh:repoPath,origin_xyz:child(visual,'origin')?.attrs.xyz||'0 0 0',origin_rpy:child(visual,'origin')?.attrs.rpy||'0 0 0',mesh_scale:scale,baked_matrix:rows(visualMatrix),material:{name:material.name,rgba}});
  }
  const bounds=new Box3().setFromObject(group),size=bounds.getSize(new Vector3());if(![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)||size.length()>1||size.length()<.005)throw Error(`Invalid metric group bounds ${definition.name}`);
  const result=await exporter.parseAsync(group,{binary:true,onlyVisible:true,trs:false});const bytes=Buffer.from(result),metrics=inspectGlb(bytes),filename=`reachy_${definition.name}.glb`;await fs.writeFile(path.join(out,filename),bytes);
  groups.push({name:definition.name,canonical_name:group.name,url:`/reachy-model/${filename}`,file:filename,sha256:hash(bytes),...metrics,source_links:[definition.link],source_frame:definition.frame,fixed_transform:rows(definition.bake),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},visual_bindings:bindings,runtime_scale:1});console.log(`${definition.name}: ${metrics.meshes} visual meshes, ${metrics.triangles} triangles, ${metrics.bytes} bytes`);
}
for(const p of ['README.md','LICENSE']){const source=await load(p);await fs.writeFile(path.join(out,`SOURCE_${p}`),source.bytes);}
const manifest={schema:'reachy.spatial.asset_manifest.v1',source_repository:`https://github.com/${REPO}`,source_commit:SOURCE_COMMIT,robot_variant:'source-description-shared-wireless-lite',physical_revision_verified:false,source_units:'metres: URDF origins and unscaled CAD/STL assembly',output_units:'metres',runtime_scale:1,license_status:'per-asset-scope-not-yet-resolved-private-staging-only',material_policy:'URDF visual RGBA authoritative; STL/CAD vertex colours and alpha ignored',converter:{name:'Three STLLoader + GLTFExporter',version:'0.186.1',revision:REVISION},model:{neutralHeadHeight,bodyZero:rows(bodyZero),antennas},rigid_groups:groups,source_meshes:sourceMeshes,source_files:sourceRows.filter(row=>!row.path.endsWith('.stl')),basis_conversions:[{name:'asset-to-scene',matrix:identity,description:'Identity. Native robot RH x-forward/y-left/z-up. No glTF y-up bake or renderer reflection.'}],excluded:{reason:'No invented serial/closed-chain motion. Only rigid source visuals in five selected links are exported.',source_links:links.filter(link=>!definitions.some(d=>d.link===link.attrs.name)).map(link=>({name:link.attrs.name,visuals:link.children.filter(node=>node.tag==='visual').length}))},joint_bindings:joints.map(node=>({name:node.attrs.name,type:node.attrs.type,parent:child(node,'parent').attrs.link,child:child(node,'child').attrs.link,axis:numbers(child(node,'axis')?.attrs.xyz,[0,0,0]),origin:rows(origin(child(node,'origin'))),source_line:node.line})),neutral_pose_fixture:'source-metric-assembly-validated; physical matching and signed motion unverified',validation:{groups:groups.length,selected_visuals:groups.reduce((n,g)=>n+g.meshes,0),triangles:groups.reduce((n,g)=>n+g.triangles,0),missing_meshes:0,unresolved_lfs:0,source_urdf:urdfPath,source_mjcf:mjcfPath,urdf_mjcf_pivot_max_delta:2e-5,articulated_parallel_links_exported:false}};
await fs.writeFile(path.join(out,'asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(`Prepared ${groups.length} rigid GLBs; ${sourceMeshes.length} verified source binaries. Assets remain private staging.`);
