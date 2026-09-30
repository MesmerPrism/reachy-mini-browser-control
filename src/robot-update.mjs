// Original MIT adapter for the stock 1.2.11 updater. No automatic requests.
import { robotBrowserLinks, parseDaemonStatus } from './setup-guidance.mjs';

const messages = { host: 'Enter a private robot address or local hostname.', busy: 'Wait for this check to finish.',
  transport: 'Reachy could not be reached. Check your network and browser permission.', protocol: 'Reachy returned an unsupported update response.',
  guard: 'Check for an update with Reachy stopped before starting.', attempted: 'An update was already requested. Check its outcome instead of starting again.', disposed: 'This update check has ended.' };
export class RobotUpdateError extends Error { constructor(code) { super(messages[code]); this.code = code; } }
const fail = code => new RobotUpdateError(code);
const stable = value => typeof value === 'string' && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value);
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i=0;i<3;i++) { if(x[i]!==y[i]) return x[i]>y[i]; } return false; };
export function createRobotUpdateClient(options) { return new RobotUpdateClient(options); }
class RobotUpdateClient {
  constructor({ host, fetchImpl = (...args) => globalThis.fetch(...args), timeoutMs = 5000, onChange = () => {}, attempted = false, attempt = null } = {}) {
    const clean = typeof host === 'string' ? host.trim().toLowerCase() : '';
    this.links = ['localhost','127.0.0.1'].includes(clean) ? { dashboard:`http://${clean}:8000/`,settings:`http://${clean}:8000/settings`,status:`http://${clean}:8000/api/daemon/status` } : robotBrowserLinks(host);
    if (!this.links || typeof fetchImpl !== 'function' || !Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000) throw fail('host');
    this.base = new URL(this.links.dashboard).origin; this.fetchImpl = (...args) => fetchImpl(...args); this.timeoutMs = timeoutMs; this.onChange = onChange;
    if(attempt && (attempt.attempted!==true || !stable(attempt.offer) || typeof attempt.originalHost!=='string'
      || !(robotBrowserLinks(attempt.originalHost) || ['localhost','127.0.0.1'].includes(attempt.originalHost))
      || !(attempt.jobId===null || (typeof attempt.jobId==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attempt.jobId)))))throw fail('protocol');
    this.attempted = attempted || Boolean(attempt); this.phase = this.attempted ? 'unknown' : 'idle'; this.active = false; this.disposed = false; this.controllers = new Set();
    this.daemon = null; this.offer = attempt?.offer ?? null; this.jobId = attempt?.jobId ?? null; this.jobStatus = null; this.failureCode = null;
    this.originalHost=attempt?.originalHost ?? clean;this.addressChanged=this.originalHost!==clean;
  }
  snapshot() { return { phase:this.phase, active:this.active, attempted:this.attempted, offer:this.offer, daemon:this.daemon ? {...this.daemon}:null,
    jobStatus:this.jobStatus, failureCode:this.failureCode, links:{...this.links}, addressChanged:this.addressChanged,
    attempt:this.attempted && this.offer ? {attempted:true,offer:this.offer,jobId:this.jobId,originalHost:this.originalHost}:null,
    ready: !this.disposed && !this.active && !this.attempted && this.phase==='offered' }; }
  emit() { try { this.onChange(this.snapshot()); } catch {} }
  alive() { if(this.disposed) throw fail('disposed'); }
  async operation(action) { this.alive(); if(this.active) throw fail('busy'); this.active=true;this.failureCode=null;this.emit();
    try { return await action(); } catch(error) { const safe=error instanceof RobotUpdateError ? error : fail('transport'); this.failureCode=safe.code; if(this.attempted && !['confirmed','reported'].includes(this.phase)) this.phase='unknown'; else if(this.phase==='checking') this.phase='unavailable'; throw safe; }
    finally { this.active=false;this.emit(); } }
  async request(path, method='GET') {
    this.alive(); const controller=new AbortController();this.controllers.add(controller);let reader,timer;
    const cancelled = new Promise((_,reject)=>{ controller.signal.addEventListener('abort',()=>{try { Promise.resolve(reader?.cancel()).catch(()=>{}); } catch {} reject(fail(this.disposed?'disposed':'transport'));},{once:true}); timer=setTimeout(()=>controller.abort(),this.timeoutMs); });
    const work=async()=>{ const response=await this.fetchImpl(this.base+path,{method,signal:controller.signal,mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',headers:{Accept:'application/json'}});
      this.alive();if(controller.signal.aborted) throw fail('transport');
      if(!response.ok || response.redirected || response.type==='opaqueredirect' || !response.body?.getReader) throw fail('protocol');
      reader=response.body.getReader();let size=0;const chunks=[];
      while(true) {const part=await reader.read();this.alive();if(controller.signal.aborted) throw fail('transport');if(part.done)break;size+=part.value.byteLength;if(size>65536)throw fail('protocol');chunks.push(part.value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail('protocol');}
    };
    try{return await Promise.race([work(),cancelled]);}finally{clearTimeout(timer);this.controllers.delete(controller);try{Promise.resolve(reader?.cancel()).catch(()=>{});}catch{}}
  }
  async readDaemon() { const value=await this.request('/api/daemon/status');try{return parseDaemonStatus(JSON.stringify(value));}catch{throw fail('protocol');} }
  safe(daemon) {return daemon.wireless && daemon.version==='1.2.11' && !daemon.hasError && ['stopped','not_initialized'].includes(daemon.state);}
  check() {return this.operation(async()=>{
    if(this.attempted) throw fail('attempted');this.offer=null;this.phase='checking';this.emit();this.daemon=await this.readDaemon();
    if(!this.safe(this.daemon)){this.phase='unsupported';return this.snapshot();}
    const value=(await this.request('/update/available?pre_release=false'))?.update?.reachy_mini;
    if(!value || typeof value.is_available!=='boolean' || value.current_version!==this.daemon.version || !stable(value.available_version)
      || value.is_available!==newer(value.available_version,value.current_version)) throw fail('protocol');
    this.offer=value.is_available ? value.available_version : null;this.phase=this.offer?'offered':'current';return this.snapshot();
  });}
  start() {return this.operation(async()=>{
    if(this.attempted)throw fail('attempted');if(!this.offer || this.phase!=='offered')throw fail('guard');
    const daemon=await this.readDaemon();this.daemon=daemon;if(!this.safe(daemon)){this.phase='unsupported';throw fail('guard');}
    // Publish the attempt before dispatch. Even malformed/failed replies never permit replay.
    this.attempted=true;this.phase='unknown';this.emit();this.alive();
    const result=await this.request('/update/start?pre_release=false','POST');
    if(!result || typeof result.job_id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.job_id))throw fail('protocol');
    this.jobId=result.job_id;this.phase='submitted';return this.snapshot();
  });}
  checkProgress() {return this.operation(async()=>{
    if(['confirmed','reported'].includes(this.phase))return this.snapshot();
    if(!this.attempted || !this.jobId)throw fail('guard');
    const value=await this.request('/update/info?job_id='+encodeURIComponent(this.jobId));
    if(!value || value.command!=='update_reachy_mini' || !['pending','in_progress','done','failed'].includes(value.status) || !Array.isArray(value.logs)
      || value.logs.length>512 || !value.logs.every(s=>typeof s==='string' && s.length<=4096))throw fail('protocol');
    this.jobStatus=value.status;this.phase=value.status==='failed'?'failed':value.status==='done'?'unconfirmed':'updating';return this.snapshot();
  });}
  verify() {return this.operation(async()=>{if(!this.attempted)throw fail('guard');const daemon=await this.readDaemon();return this.verifyDaemon(daemon);});}
  verifyPasted(text) {this.alive();if(this.active)throw fail('busy');if(!this.attempted)throw fail('guard');let daemon;try{daemon=parseDaemonStatus(text);}catch{throw fail('protocol');}return this.verifyDaemon(daemon,true);}
  verifyDaemon(daemon,pasted=false) {this.daemon=daemon;const healthy=daemon.wireless && !daemon.hasError && ['not_initialized','stopped','running'].includes(daemon.state);
    // Pasted status is user-reported evidence, never fresh transport verification or control authorization.
    this.phase=healthy && this.offer && daemon.version===this.offer ? (pasted?'reported':'confirmed') : 'unconfirmed';this.emit();return this.snapshot();}
  dispose(){this.disposed=true;for(const controller of this.controllers)controller.abort();}
}
