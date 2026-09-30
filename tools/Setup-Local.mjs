import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {ReachyAdapter} from '../server/control.mjs';

export const SUPPORTED_DAEMON_VERSION='1.10.0';
export const HELP=`Reachy Mini local setup (read-only daemon discovery)

Interactive: npm run setup
Unattended:  npm run setup -- --url http://reachy-mini.local:8000 --yes
Head opt-in: npm run setup -- --head-follow

Options:
  --url ORIGIN    Plain HTTP daemon origin; no credentials, path, query or hash
  --head-follow   Approve normal head controls (20 deg turn / 15 deg nod)
  --yes           Save without the final prompt; requires an explicit --url
  --replace       Explicitly allow replacing existing local/config.json
  --help, -h      Show help without network or file changes

Only GET /api/daemon/status is requested. No motor, motion, daemon or Wi-Fi
settings are changed. Configuration stays in ignored local/config.json.
Supported daemon version: ${SUPPORTED_DAEMON_VERSION}.
`;

export function parseArgs(argv){
  const options={help:false,yes:false,replace:false,headFollow:false,url:null};
  for(let i=0;i<argv.length;i++){
    const argument=argv[i];
    if(argument==='--help'||argument==='-h')options.help=true;
    else if(argument==='--yes')options.yes=true;
    else if(argument==='--replace')options.replace=true;
    else if(argument==='--head-follow')options.headFollow=true;
    else if(argument==='--url'||argument.startsWith('--url=')){
      if(options.url!==null)throw Error('Specify --url only once');
      const value=argument==='--url'?argv[++i]:argument.slice(6);
      if(!value||value.startsWith('--'))throw Error('--url requires a daemon HTTP origin');
      options.url=value;
    }else throw Error(`Unknown setup option: ${argument}. Use --help.`);
  }
  if(options.yes&&!options.url&&!options.help)throw Error('--yes requires an explicit --url');
  return options;
}
export function validateDaemonOrigin(value){
  if(typeof value!=='string'||!value.trim())throw Error('Enter the daemon HTTP origin');
  let url;try{url=new URL(value.trim());}catch{throw Error('Daemon address must be a full HTTP origin, for example http://reachy-mini.local:8000');}
  if(url.protocol!=='http:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Use a plain HTTP origin without credentials, path, query or hash');
  return url.origin;
}
export function configFromStatus(origin,status,{headFollow=false}={}){
  const robotUrl=validateDaemonOrigin(origin);
  if(!status||typeof status!=='object'||Array.isArray(status))throw Error('Invalid daemon status response');
  if(typeof status.hardware_id!=='string'||!status.hardware_id||status.hardware_id.length>128||!/^[A-Za-z0-9._:-]+$/.test(status.hardware_id))throw Error('Daemon status did not contain a valid hardware_id');
  if(status.version!==SUPPORTED_DAEMON_VERSION)throw Error(`Unsupported daemon version. This app requires the audited ${SUPPORTED_DAEMON_VERSION} adapter; setup will not write configuration for another version.`);
  const config={robotUrl,expectedHardwareId:status.hardware_id,expectedVersion:SUPPORTED_DAEMON_VERSION,port:18750,headTrackingEnabled:headFollow===true,headTrackingOperatorApproved:headFollow===true,headTrackingVerified:false,headTrackingPilot:false};
  // Reuse runtime identity/origin guards. Construction sends no requests.
  new ReachyAdapter(config);
  return config;
}
export async function probeDaemon(origin,{fetchImpl=globalThis.fetch,headFollow=false}={}){
  const robotUrl=validateDaemonOrigin(origin);let response,status;
  try{
    response=await fetchImpl(`${robotUrl}/api/daemon/status`,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    status=await response.json();
  }catch(error){throw Error(`Could not read daemon status (${error.message}). Check that the daemon is running and reachable from this computer.`);}
  return configFromStatus(robotUrl,status,{headFollow});
}
export async function readExistingConfig(root){
  const target=path.join(root,'local','config.json');
  try{const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink())throw Error('local/config.json must be a regular file');return await fs.readFile(target);}catch(error){if(error.code==='ENOENT')return null;throw error;}
}
export async function writeLocalConfig(root,config,{replace=false,expectedExisting=null}={}){
  const target=path.join(root,'local','config.json'),contents=JSON.stringify(config,null,2)+'\n';
  await fs.mkdir(path.dirname(target),{recursive:true});
  if(!replace){try{await fs.writeFile(target,contents,{flag:'wx',mode:0o600});}catch(error){if(error.code==='EEXIST')throw Error('Existing local/config.json was preserved; explicit replacement is required');throw error;}return;}
  const current=await readExistingConfig(root);
  if(!Buffer.isBuffer(expectedExisting)||!current?.equals(expectedExisting))throw Error('Configuration changed while setup was running; nothing was replaced. Run setup again.');
  await fs.writeFile(target,contents,{mode:0o600});
}
export async function runSetup({argv=[],root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),fetchImpl=globalThis.fetch,ask=null,log=console.log,interactive=!!stdin.isTTY}={}){
  const options=parseArgs(argv);if(options.help){log(HELP);return {written:false,help:true};}
  const existing=await readExistingConfig(root);let replace=options.replace;
  if(existing&&!replace){
    if(!interactive||!ask)throw Error('Existing local/config.json was preserved. Use --replace only if you intend to replace it.');
    const choice=await ask('local/config.json already exists. Type REPLACE to replace it, or press Enter to keep it: ');
    if(choice!=='REPLACE'){log('Kept existing configuration; no robot request or file change was made.');return {written:false,preserved:true};}
    replace=true;
  }
  let origin=options.url;
  if(!origin){if(!interactive||!ask)throw Error('Provide --url for noninteractive setup');origin=await ask('Daemon HTTP origin (Wireless: http://reachy-mini.local:8000; Lite: http://localhost:8000): ');}
  const config=await probeDaemon(origin,{fetchImpl,headFollow:options.headFollow});
  log(`Verified supported daemon ${SUPPORTED_DAEMON_VERSION}. Its hardware identity will remain in the local configuration.`);
  if(options.headFollow)log('Head control opt-in selected: 20 deg turn / 15 deg nod. Motion still requires explicit controls in the local UI. This does not claim physical axis validation.');
  else log('Head movement stays disabled. Use --head-follow when you intend to approve attended head controls.');
  if(!options.yes){
    if(!interactive||!ask)throw Error('Saving requires interactive confirmation or --yes with --url');
    const choice=await ask('Save this local configuration? [y/N] ');
    if(!/^y(?:es)?$/i.test(choice.trim())){log('Not saved; existing configuration was preserved.');return {written:false};}
  }
  await writeLocalConfig(root,config,{replace:!!existing&&replace,expectedExisting:existing});
  log('Saved ignored local/config.json. Next: npm run build, then npm start. Open http://localhost:18750. Setup sent no motion commands.');
  return {written:true};
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  let reader;
  try{if(stdin.isTTY)reader=createInterface({input:stdin,output:stdout});await runSetup({argv:process.argv.slice(2),ask:reader?question=>reader.question(question):null});}
  catch(error){console.error(`Setup failed: ${error.message}`);process.exitCode=1;}
  finally{reader?.close();}
}
