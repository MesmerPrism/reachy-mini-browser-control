// Explicit attended lifecycle around MatrixRunner. No adapter/config discovery.
// Power commands exist only in operator-invoked methods, never in runAxis.
export class MatrixSession{
 constructor({runner,control,observer,authority,journal}){
  if(!runner||typeof control?.status!=='function'||typeof control?.command!=='function'||typeof observer?.qualify!=='function'||typeof authority!=='function'||typeof journal!=='function')throw Error('Existing guarded controller, observer and explicit authority required');
   Object.assign(this,{runner,control,observer,authority,journal});this.stage='new';this.busy=false;this.receipts=runner.closedResetSleepReceipt?[structuredClone(runner.closedResetSleepReceipt)]:[];this.generation=0;
 }
 state(){return {stage:this.stage,busy:this.busy,planSha256:this.runner.hash,nextLeg:this.runner.plan.legs[this.runner.index]?.id??null,pendingReset:this.runner.pendingReset,closed:this.stage==='closed'};}
 async allowed(){const a=await this.authority();if(a?.authorized!==true||a.attended!==true)throw Error('Current explicit attended authority required');}
 async ready(awake){
  const s=await this.control.status(),r=s.diagnostics?.snapshot,now=Date.now();
  if(!r||![r.startedAt,r.completedAt].every(Number.isFinite)||r.startedAt>r.completedAt||r.completedAt>now||now-r.startedAt>500
   ||!s.connected||!s.ready||s.awake!==awake||s.motorMode!==(awake?'enabled':'disabled')||s.busy||!Array.isArray(s.moves)||s.moves.length||s.recoveryNeeded||s.blockedReason)throw Error('Fresh idle power/identity/version admission required');
  return s;
 }
 async exclusive(fn){if(this.busy)throw Error('Session operation in progress');this.busy=true;const generation=this.generation,guard=()=>{if(generation!==this.generation)throw Error('Session operation retired by Stop');};try{const result=await fn(guard);guard();return result;}finally{this.busy=false;}}
 async prepare(){return this.exclusive(async guard=>{
  if(this.stage!=='new')throw Error('New session required');await this.allowed();await this.ready(false);await this.observer.qualify('disabled');await this.ready(false);
  guard();this.stage='waiting-wake';await this.journal('matrix-session-stage',this.state());return this.state();
 });}
  async prepareRetainedAwake(){return this.exclusive(async guard=>{
   if(this.stage!=='new'||this.runner.retainedAwakeSession!==true)throw Error('Verified stopped-session preparation required');
   await this.allowed();await this.ready(true);guard();this.stage='waiting-held-visual';await this.journal('matrix-session-stage',this.state());return this.state();
  });}
  async confirmRetainedAwake({observedAwakeAndSettled}={}){return this.exclusive(async guard=>{
   if(this.stage!=='waiting-held-visual'||observedAwakeAndSettled!==true)throw Error('Current held-awake visual confirmation required');await this.allowed();
   await this.journal('matrix-held-visual',{observedAwakeAndSettled:true,noWake:true});await this.observer.qualify('awake');await this.ready(true);
   guard();this.stage=this.runner.plan.legs[this.runner.index]?.axisCue?'waiting-axis':'waiting-remainder';await this.journal('matrix-session-stage',this.state());return this.state();
  });}
 async power(action,{operatorConfirmed}={}){return this.exclusive(async guard=>{
  const valid=action==='wake'?this.stage==='waiting-wake':action==='sleep'&&['waiting-reset-sleep','waiting-final-sleep','parked'].includes(this.stage);
  if(!valid||operatorConfirmed!==true)throw Error('Exact operator power stage required');await this.allowed();const s=await this.ready(action==='sleep');
  guard();const receipt={action,startedAt:Date.now(),outcome:'intent',reference:'matrix-power-'+this.receipts.length};this.receipts.push(receipt);
  this.stage=action==='wake'?'waking':'sleeping';
  try{
   await this.journal('matrix-power-intent',receipt);
   guard();receipt.result=await this.control.command({action,epoch:s.controlEpoch});guard();if(receipt.result?.ok!==true)throw Error('Power command not acknowledged');
   receipt.outcome='acknowledged';this.stage=action==='wake'?'waiting-wake-visual':'waiting-sleep-visual';
  }catch(error){receipt.outcome=this.control.adapter?.uncertain?'unknown':'failed';receipt.error=error.message;this.stage='parked';throw error;}
  finally{receipt.completedAt=Date.now();await this.journal('matrix-power-outcome',receipt);}
  return this.state();
 });}
 async confirmAwake({observedAwakeAndSettled}={}){return this.exclusive(async guard=>{
  if(this.stage!=='waiting-wake-visual'||observedAwakeAndSettled!==true)throw Error('Current Wake visual confirmation required');await this.allowed();
  // Read/observer failure leaves this read-only stage retryable; it never sends Wake again.
  await this.journal('matrix-wake-visual',{observedAwakeAndSettled:true});await this.observer.qualify('awake');await this.ready(true);
  guard();if(this.runner.pendingReset)await this.runner.confirmReset({approvedPlanSha256:this.runner.hash,checkpointId:this.runner.pendingReset.id});guard();
   this.stage=this.runner.plan.legs[this.runner.index]?.axisCue?'waiting-axis':'waiting-remainder';await this.journal('matrix-session-stage',this.state());return this.state();
 });}
 async runAxis({operatorReady}={}){return this.exclusive(async guard=>{
  if(this.stage!=='waiting-axis'||operatorReady!==true)throw Error('Explicit axis-block readiness required');await this.allowed();
  guard();const first=this.runner.plan.legs[this.runner.index];if(!first?.axisCue)throw Error('Whole next axis block required');this.stage='running-axis';
  try{
   for(let n=0;n<4;n++){
    await this.allowed();guard();const r=await this.runner.runNext({approvedPlanSha256:this.runner.hash});guard();if(r.phase!=='complete')throw Error(r.error||r.releaseError||'Matrix parked');
   }
   this.stage=this.runner.pendingReset?'waiting-reset-sleep':this.runner.index===this.runner.plan.legs.length?'waiting-final-sleep':'waiting-axis';
  }catch(error){this.stage='parked';throw error;}
  await this.journal('matrix-session-stage',this.state());return this.state();
 });}
 async continueAfterInterruption({operatorConfirmed,id,approvedPlanSha256}={}){return this.exclusive(async guard=>{
  if(this.stage!=='parked'||operatorConfirmed!==true)throw Error('Explicit parked-trial continuation review required');await this.allowed();
  const review=await this.runner.reviewInterruption({operatorConfirmed,id,approvedPlanSha256,guard});guard();
  this.stage=this.runner.pendingReset?'waiting-reset-sleep':this.runner.index===this.runner.plan.legs.length?'waiting-final-sleep':this.runner.plan.legs[this.runner.index].axisCue?'waiting-axis':'waiting-remainder';
  await this.journal('matrix-session-stage',this.state());return review;
 });}
 async runRemainder({operatorReady}={}){return this.exclusive(async guard=>{
  if(this.stage!=='waiting-remainder'||operatorReady!==true)throw Error('Explicit remaining-axis readiness required');await this.allowed();
  const first=this.runner.plan.legs[this.runner.index];this.stage='running-axis';
  try{
   while(this.runner.index<this.runner.plan.legs.length){const next=this.runner.plan.legs[this.runner.index];if(next.arm!==first.arm||next.axis!==first.axis||next.round!==first.round)break;
    await this.allowed();guard();const r=await this.runner.runNext({approvedPlanSha256:this.runner.hash});guard();if(r.phase!=='complete')throw Error(r.error||r.releaseError||'Matrix parked');}
   this.stage=this.runner.pendingReset?'waiting-reset-sleep':this.runner.index===this.runner.plan.legs.length?'waiting-final-sleep':'waiting-axis';
  }catch(error){this.stage='parked';throw error;}
  await this.journal('matrix-session-stage',this.state());return this.state();
 });}
 async confirmAsleep({observedAsleepAndSettled}={}){return this.exclusive(async guard=>{
  const wasParked=this.stage==='parked';
  if(!['waiting-sleep-visual','parked'].includes(this.stage)||observedAsleepAndSettled!==true)throw Error('Current Sleep visual confirmation required');await this.allowed();
  await this.journal('matrix-sleep-visual',{observedAsleepAndSettled:true});await this.observer.qualify('disabled');await this.ready(false);
  guard();this.stage=!wasParked&&this.runner.pendingReset?'waiting-wake':'closed';await this.journal('matrix-session-stage',this.state());return this.state();
 });}
 async stop(){
  this.generation++;this.runner.parked=true;this.runner.follower?.invalidate('Explicit session Stop');this.stage='parked';
  if(this.runner.io.active){try{return await this.runner.io.stop();}finally{await this.runner.io.abortCondition?.('Explicit session Stop');}}
  return this.control.command({action:'stop'});
 }
}
