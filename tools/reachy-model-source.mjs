import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Matrix4, Vector3, Quaternion, Euler } from 'three';
export const SOURCE_COMMIT='7f54717586369155900eeeb43fd4bbbb62064f22';
export const REPO='pollen-robotics/reachy_mini';
export const DESCRIPTION='src/reachy_mini/descriptions/reachy_mini';
export const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitHash=bytes=>crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export async function getBytes(url){const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`Source fetch ${response.status}: ${url}`);return Buffer.from(await response.arrayBuffer());}
export async function sourceFile(cache,tree,repoPath){
  const entry=tree.tree.find(row=>row.path===repoPath&&row.type==='blob');if(!entry)throw Error(`Missing pinned source ${repoPath}`);
  const target=path.join(cache,'git',repoPath);let bytes;
  try{bytes=await fs.readFile(target);}catch(error){if(error.code!=='ENOENT')throw error;bytes=await getBytes(`https://raw.githubusercontent.com/${REPO}/${SOURCE_COMMIT}/${repoPath}`);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
  if(gitHash(bytes)!==entry.sha)throw Error(`Git blob mismatch ${repoPath}`);
  const pointer=bytes.toString('utf8').match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})\r?\nsize (\d+)/);
  const row={path:repoPath,git_blob:entry.sha,lfs_sha256:pointer?.[1]||null,lfs_bytes:pointer?Number(pointer[2]):null};
  if(pointer){const binary=path.join(cache,'lfs',pointer[1]);try{bytes=await fs.readFile(binary);}catch(error){if(error.code!=='ENOENT')throw error;bytes=await getBytes(`https://media.githubusercontent.com/media/${REPO}/${SOURCE_COMMIT}/${repoPath}`);await fs.mkdir(path.dirname(binary),{recursive:true});await fs.writeFile(binary,bytes);}if(hash(bytes)!==pointer[1]||bytes.length!==Number(pointer[2]))throw Error(`LFS binary mismatch ${repoPath}`);}
  if(bytes.subarray(0,80).toString().startsWith('version https://git-lfs'))throw Error(`Unresolved LFS pointer ${repoPath}`);
  return {bytes,row:{...row,sha256:hash(bytes),bytes:bytes.length}};
}
// A strict bounded reader for the generated URDF/MJCF used here; never resolves
// external entities and rejects unknown declarations or mismatched tags.
export function parseXml(text){
  const root={tag:'#document',attrs:{},children:[]},stack=[root];
  for(const match of text.matchAll(/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]+>/g)){
    const token=match[0];if(token.startsWith('<!--')||token.startsWith('<?'))continue;
    if(token.startsWith('<!'))throw Error('Unsupported XML declaration');
    if(token.startsWith('</')){const name=token.slice(2,-1).trim();if(stack.pop()?.tag!==name)throw Error('Mismatched XML close');continue;}
    const tag=token.match(/^<([\w:-]+)/)?.[1];if(!tag)throw Error('Invalid XML tag');
    const attrs=Object.fromEntries([...token.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(m=>[m[1],m[2]]));
    const node={tag,attrs,children:[],line:text.slice(0,match.index).split('\n').length};stack.at(-1).children.push(node);
    if(!token.endsWith('/>'))stack.push(node);
  }
  if(stack.length!==1)throw Error('Unclosed XML nodes');return root.children[0];
}
export const child=(node,tag)=>node.children.find(item=>item.tag===tag);
export function descendants(node,tag){return [...(node.tag===tag?[node]:[]),...node.children.flatMap(item=>descendants(item,tag))];}
export function numbers(value,fallback){const result=value?value.trim().split(/\s+/).map(Number):fallback;if(!result.every(Number.isFinite))throw Error('Invalid numeric source');return result;}
export function origin(node){const xyz=numbers(node?.attrs.xyz,[0,0,0]),rpy=numbers(node?.attrs.rpy,[0,0,0]);if(xyz.length!==3||rpy.length!==3)throw Error('Invalid URDF origin');return new Matrix4().compose(new Vector3(...xyz),new Quaternion().setFromEuler(new Euler(...rpy,'ZYX')),new Vector3(1,1,1));}
export function mjcfOrigin(node){const xyz=numbers(node.attrs.pos,[0,0,0]),[w,x,y,z]=numbers(node.attrs.quat,[1,0,0,0]);return new Matrix4().compose(new Vector3(...xyz),new Quaternion(x,y,z,w).normalize(),new Vector3(1,1,1));}
export const rows=m=>[0,1,2,3].flatMap(r=>[0,1,2,3].map(c=>m.elements[c*4+r]));
export function sameMatrix(a,b,label,tolerance=2e-5){if(Math.max(...a.elements.map((value,i)=>Math.abs(value-b.elements[i])))>tolerance)throw Error(`URDF/MJCF frame mismatch ${label}`);}
export function inspectGlb(bytes){
  if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw Error('Invalid GLB header');
  const jsonLength=bytes.readUInt32LE(12);if(bytes.readUInt32LE(16)!==0x4e4f534a)throw Error('Missing GLB JSON');
  const json=JSON.parse(bytes.subarray(20,20+jsonLength).toString().trim());
  const binOffset=20+jsonLength;
  if(bytes.readUInt32LE(binOffset+4)!==0x004e4942 || binOffset+8+bytes.readUInt32LE(binOffset)!==bytes.length || (json.buffers?.[0]?.byteLength||0)>bytes.readUInt32LE(binOffset))throw Error('Invalid embedded GLB buffer');
  for(const view of json.bufferViews||[])if((view.byteOffset||0)+view.byteLength>json.buffers[0].byteLength)throw Error('GLB buffer view out of bounds');
  for(const accessor of json.accessors||[])if(!Number.isSafeInteger(accessor.count)||accessor.count<=0||(accessor.min && !accessor.min.every(Number.isFinite))||(accessor.max && !accessor.max.every(Number.isFinite)))throw Error('Invalid GLB accessor');
  if(json.skins?.length||json.animations?.length||json.extensionsRequired?.length)throw Error('Unexpected GLB articulation/extensions');
  let triangles=0;for(const mesh of json.meshes||[])for(const primitive of mesh.primitives){if((primitive.mode??4)!==4)throw Error('Nontriangle model primitive');if(primitive.attributes.COLOR_0!==undefined)throw Error('Unexpected CAD vertex colour; URDF material must be authoritative');triangles+=(primitive.indices!==undefined?json.accessors[primitive.indices].count:json.accessors[primitive.attributes.POSITION].count)/3;}
  if(!Number.isInteger(triangles)||triangles<=0)throw Error('Empty GLB');return {meshes:json.meshes.length,triangles,materials:json.materials.length,bytes:bytes.length};
}
