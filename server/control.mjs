import { MANUAL_HEAD_AXES, headPositionMm, manualHeadDistance, slewManualHead, headAngles, absoluteHeadPose, rigidPose, relativeHeadPose, slewHead, IDENTITY_POSE, HEAD_FRAME_MS, HEAD_WATCHDOG_MS, HEAD_YAW_LIMIT, HEAD_PITCH_LIMIT } from './head-pose.mjs';
export const LIBRARIES = ['pollen-robotics/reachy-mini-emotions-library'];
export const UI_LIMIT = 90;
export const ANTENNA_FRAME_MS = 20;
export const ANTENNA_SPEED_MIN = 5;
export const ANTENNA_SPEED_MAX = 120;
const STATUS_REFRESH_MS = 250;
const STATUS_MAX_AGE_MS = 500;
const rad = deg => deg * Math.PI / 180;
const deg = value => value * 180 / Math.PI;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export class ControlError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}

// One application operator; robot REST has no atomic multi-client ownership.
// A generation fence discards delayed targets after stop/playback/disconnect.
export class RobotControl {
  constructor(adapter) {
    this.adapter = adapter; this.epoch = 0; this.pending = null;
    this.worker = null; this.operation = null; this.owned = new Set();
    this.activity = null; this.message = 'Ready'; this.catalog = [];
    this.lastHeartbeat = 0; this.closed = false; this.stopped = false;
    this.lastSent = null; this.stopBarrier = Promise.resolve(); this.connected = null;
    this.snapshotRead = null; this.cachedStatus = null;
    this.manualGoal = null; this.holdNeeded = false; this.lastWriteAt = 0;
    this.stopPending = false; this.stopRequests = 0;
    this.headStarting = false; this.headSession = null; this.headPending = null; this.headWorker = null; this.headHoldNeeded = false;
    this.headManualStarting = false; this.headManualPending = null; this.headManualGoal = null; this.headManualWorker = null;
    this.headManualSent = null; this.headManualRevision = 0; this.headManualNeedsRefresh = false; this.headManualWriteAt = 0;
    this.lastFault = null; this.snapshotDiagnostics = null; this.recoveryNeeded = null; this.autoRecovery = null; this.recoveryBlocked = false;
    this.policyRevision = 0; this.rampNeedsRefresh = false;
  }
  readSnapshot() {
    if (!this.snapshotRead) {
      const startedAt = Date.now();
      this.snapshotRead = Promise.resolve().then(() => this.adapter.snapshot())
        .then(info => {this.snapshotDiagnostics={startedAt,completedAt:Date.now(),readMs:Date.now()-startedAt};return { info, startedAt };})
        .catch(error=>{this.snapshotDiagnostics={startedAt,completedAt:Date.now(),readMs:Date.now()-startedAt,error:error.message,route:error.requestRoute || null};throw error;})
        .finally(() => { this.snapshotRead = null; });
    }
    return this.snapshotRead;
  }
  async status() {
    try {
      const { info, startedAt } = await this.readSnapshot();
      this.connected = true;
      this.lastHeartbeat = Date.now();
      let blockedReason = this.adapter.uncertain || info.blockedReason || null;
      if(!blockedReason && Date.now()-startedAt>STATUS_MAX_AGE_MS)blockedReason='Robot snapshot exceeded the 500 ms freshness limit';
      const foreign = info.moves.some(x => !this.owned.has(x.uuid));
      if (foreign) blockedReason = 'Another motion is running';
      if (!this.operation && this.owned.size) blockedReason = 'A previous motion needs a confirmed Stop before controls can resume';
      if (!blockedReason && (this.stopPending || this.stopRequests)) blockedReason = this.recoveryNeeded?.reason || 'Motion control needs a confirmed Stop before controls can resume';
      if (!info.awake && !this.operation) this.lastSent = null;
      let measuredHeadAngles = null; let measuredHeadPosition = null; try { measuredHeadAngles = headAngles(info.headPose); measuredHeadPosition = headPositionMm(info.headPose); } catch {}
      const state = { ...info, headAngles: measuredHeadAngles, headPositionMm: measuredHeadPosition, headManualActive: !!this.headManualWorker || !!this.headManualGoal, headManualTarget: this.headManualGoal ? {...Object.fromEntries(MANUAL_HEAD_AXES.map(axis=>[axis,this.headManualGoal[axis]])),speedLimit:this.headManualGoal.speedLimit,linearSpeedLimit:this.headManualGoal.linearSpeedLimit} : null, busy: !!this.operation || info.moves.length > 0, adjusting: !!this.worker || !!this.headWorker || !!this.headManualWorker, headTrackingEnabled: this.adapter.headTrackingEnabled === true, headTrackingLimits: this.adapter.headTrackingLimits, headManualLimits: this.adapter.headManualLimits, headTrackingActive: !!this.headSession, headTrackingSession: this.headSession?.id || null, headTrackingAngles: this.headSession ? {...this.headSession.sent} : null,
        diagnostics: this.diagnostics(), recoveryNeeded: this.recoveryNeeded, blockedReason, controlEpoch: this.epoch, activity: this.activity, message: this.message,
        ready: info.ready && !blockedReason, stopped: this.stopped };
      this.cachedStatus = { state, startedAt };
      return state;
    } catch (error) {
      if (this.connected !== false) this.invalidate();
      this.connected = false;
      this.cachedStatus = null;
      this.pending = null; this.lastSent = null;
      if (this.holdNeeded || this.headHoldNeeded) {this.stopPending = true;this.recordFault(error,'snapshot-unavailable');this.scheduleRecovery();}
      return { connected: false, ready: false, awake: false, busy: !!this.operation,
        mediaReady: false, antennas: null, headPose: null, bodyYaw: null, headAngles: null, headPositionMm: null, headManualActive: false, headManualTarget: null, headTrackingEnabled: this.adapter.headTrackingEnabled === true, headTrackingLimits: this.adapter.headTrackingLimits, headManualLimits: this.adapter.headManualLimits, headTrackingActive: false, headTrackingSession: null, headTrackingAngles: null, controlEpoch: this.epoch,
        diagnostics: this.diagnostics(), recoveryNeeded: this.recoveryNeeded, blockedReason: error.message, message: error.message, activity: this.activity };
    }
  }
  diagnostics() {
    return {snapshot:this.snapshotDiagnostics ? {...this.snapshotDiagnostics,startAgeMs:Date.now()-this.snapshotDiagnostics.startedAt} : null,lastFault:this.lastFault,requestFailure:this.adapter.lastRequestFailure || null,media:this.adapter.mediaDiagnostics || null};
  }
  recordFault(error,fallback='motion-failed') {
    const message=error.message || String(error);
    const kind=this.adapter.uncertain ? 'unknown-outcome' : /another motion|another app/i.test(message) ? 'foreign-motion' : /did not settle/i.test(message) ? 'unsettled-target' : /became stale|freshness limit/i.test(message) ? 'stale-status' : fallback;
    this.lastFault={kind,reason:message,at:Date.now(),epoch:this.epoch,details:error.motionDiagnostics || null};
    if(this.stopPending || this.holdNeeded || this.headHoldNeeded) {
      const active=this.autoRecovery && !this.autoRecovery.cancelled && !this.recoveryBlocked;
      this.recoveryNeeded=active ? {...this.lastFault,kind:this.autoRecovery.kind,automatic:true,reason:'Checking fresh robot state before holding measured position',attempts:this.autoRecovery.attempts,lastReadError:message} : {...this.lastFault,automatic:false,reason:`${message}; motion needs a confirmed Stop before controls can resume`};
    }
    return kind;
  }
  scheduleRecovery() {
    const kind=this.lastFault?.kind;
    if(this.recoveryBlocked || this.autoRecovery || this.closed || this.stopRequests || this.adapter.uncertain || this.owned.size || this.operation || !['stale-status','snapshot-unavailable','unsettled-target'].includes(kind) || !this.stopPending)return;
    // Never resume an accepted destination: fence it before waiting for a fresh
    // read and hold only what the robot actually reports after writes drain.
    this.invalidate();
    const recovery={kind,reason:this.lastFault.reason,attempts:0,startedAt:Date.now(),deadline:Date.now()+8000,cancelled:false};
    this.autoRecovery=recovery;
    this.recoveryNeeded={...this.lastFault,automatic:true,reason:'Checking fresh robot state before holding measured position',attempts:0};
    const bounded=async promise=>{
      let timer;
      try {return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Read-only recovery timed out')),Math.max(1,recovery.deadline-Date.now()));timer.unref?.();})]);}
      finally {clearTimeout(timer);}
    };
    recovery.promise=Promise.resolve().then(async()=>{
      for(const worker of [this.worker,this.headManualWorker,this.headWorker])if(worker)await bounded(worker.catch(()=>{}));
      while(!recovery.cancelled && !this.closed && !this.adapter.uncertain && recovery.attempts<8 && Date.now()<recovery.deadline) {
        recovery.attempts++;
        if(this.recoveryNeeded)this.recoveryNeeded={...this.recoveryNeeded,attempts:recovery.attempts};
        if(this.snapshotRead)await bounded(this.snapshotRead.catch(()=>{}));
        let snapshot;
        try {snapshot=await bounded(this.readSnapshot());}
        catch(error) {
          if(Date.now()>=recovery.deadline)throw error;
          this.lastFault={kind:'snapshot-unavailable',reason:error.message,at:Date.now(),epoch:this.epoch};
        }
        if(recovery.cancelled || this.closed)return;
        if(snapshot) {
          const {info,startedAt}=snapshot;
          if(info.moves.some(move=>!this.owned.has(move.uuid)) || info.blockedReason || !info.ready || !info.awake) {
            this.recoveryBlocked=true;this.recordFault(Error(info.blockedReason || (info.moves.length ? 'Another motion is running' : 'Robot is not ready and awake')),'not-ready');return;
          }
          if(info.connected && Date.now()-startedAt<=STATUS_MAX_AGE_MS) {
            // stop() performs another independent post-drain read and rechecks
            // ownership/readiness. A failed or unknown hold gets no retry.
            await this.stop({automatic:true});
            if(!recovery.cancelled)this.message=recovery.kind==='unsettled-target' ? 'Robot could not reach the requested pose; measured position held' : 'Control monitoring recovered; measured position held';
            return;
          }
        }
        await new Promise(resolve=>{const timer=setTimeout(resolve,500);timer.unref?.();});
      }
      if(!recovery.cancelled && !this.closed)throw Error('Fresh robot state unavailable within the bounded recovery window');
    }).catch(error=>{
      if(!recovery.cancelled){this.recoveryBlocked=true;this.stopPending=true;this.recordFault(error,this.adapter.uncertain?'unknown-outcome':this.lastFault?.kind==='hold-failed'?'hold-failed':'recovery-failed');this.message=`Recovery is unconfirmed: ${error.message}`;}
    }).finally(()=>{
      if(this.autoRecovery===recovery)this.autoRecovery=null;
      if(this.recoveryNeeded?.automatic)this.recoveryNeeded={...this.recoveryNeeded,automatic:false};
    });
  }
  async guard(awake = false) {
    if (this.closed) throw new ControlError('Controller is closed');
    const s = await this.status();
    if (!s.connected || !s.ready) throw new ControlError(s.blockedReason || 'Robot is not ready');
    if (awake && !s.awake) throw new ControlError('Wake Reachy before moving it');
    return s;
  }
  async emotes() {
    const errors = []; const entries = [];
    for (const library of LIBRARIES) {
      try {
        const names = await this.adapter.catalog(library);
        if (!Array.isArray(names)) throw Error('Invalid catalog response');
        for (const name of names) {
          if (typeof name !== 'string' || !name || name.length > 120 || /[\/\\\x00-\x1f]/.test(name)) continue;
          entries.push({ id: `${library}:${name}`, name, library });
        }
      } catch (e) { errors.push(e.message); }
    }
    this.catalog = entries.sort((a, b) => a.name.localeCompare(b.name));
    return { emotes: this.catalog, ...(errors.length ? { error: errors.join('; ') } : {}) };
  }
  invalidate() { this.epoch++; this.pending = null; this.manualGoal = null; this.headPending = null; this.headSession = null; this.headManualPending = null; this.headManualGoal = null; return this.epoch; }
  checkEpoch(epoch) {
    if (!Number.isSafeInteger(epoch) || epoch !== this.epoch) throw new ControlError('Controls changed; refresh state before trying again');
  }
  async command(input) {
    if (!input || typeof input !== 'object') throw new ControlError('Invalid command', 400);
    const action = input.action;
    if (!['wake', 'sleep', 'stop', 'antennas', 'emote', 'head-start', 'head-frame', 'head-stop', 'head-target'].includes(action)) throw new ControlError('Unknown action', 400);
    if (action === 'stop' || action === 'head-stop') return this.stop();
    this.checkEpoch(input.epoch);
    if (this.stopPending || this.stopRequests) throw new ControlError('Antenna control needs a confirmed Stop before controls can resume');
    if (action === 'head-target') return this.manualHead(input);
    if (action === 'head-start') return this.startHead(input);
    if (action === 'head-frame') return this.headFrame(input);
    if (this.headManualStarting || this.headManualWorker || this.headManualGoal || this.headStarting || this.headSession || this.headWorker || this.headHoldNeeded) throw new ControlError('Stop head following before other controls');
    if (action === 'antennas') {
      const sides = ['left', 'right'].filter(side => Object.hasOwn(input, side));
      if (!sides.length) throw new ControlError('Choose at least one antenna', 400);
      for (const side of sides) {
        if (typeof input[side] !== 'number' || !Number.isFinite(input[side]) || Math.abs(input[side]) > UI_LIMIT)
          throw new ControlError(`Antenna angles must be between -${UI_LIMIT} and +${UI_LIMIT} degrees`, 400);
      }
      const speedLimit = input.speedLimit ?? null;
      if (speedLimit !== null && (typeof speedLimit !== 'number' || !Number.isFinite(speedLimit) || speedLimit < ANTENNA_SPEED_MIN || speedLimit > ANTENNA_SPEED_MAX))
        throw new ControlError(`Speed limit must be between ${ANTENNA_SPEED_MIN} and ${ANTENNA_SPEED_MAX} degrees per second, or null for direct movement`, 400);
      if (this.operation) throw new ControlError('Wait for the current motion');
      // Initial command must pass a fresh check before starting the worker.
      const state = await this.guard(true); this.checkEpoch(input.epoch);
      if (this.stopPending || this.stopRequests) throw new ControlError('Antenna control needs a confirmed Stop before controls can resume');
      if (this.operation || this.headManualStarting || this.headManualWorker || this.headStarting || this.headSession || this.headWorker) throw new ControlError('Wait for the current motion');
      this.stopped = false;
      const previous = this.pending || this.manualGoal || state.antennas;
      // Changing policy starts any new ramp at measured state, not at a direct
      // destination that the motor may still be approaching.
      if (this.manualGoal?.speedLimit !== speedLimit) { this.lastSent = null; this.policyRevision++; }
      const goal = { left: previous.left, right: previous.right, ...Object.fromEntries(sides.map(side => [side, input[side]])) };
      const travel = Math.max(Math.abs(goal.left - state.antennas.left), Math.abs(goal.right - state.antennas.right));
      const timeout = speedLimit === null ? 10000 : Math.min(120000, Math.max(10000, travel / speedLimit * 2000 + 5000));
      this.pending = { ...goal, speedLimit, policyRevision: this.policyRevision, epoch: input.epoch, at: Date.now(), deadline: Date.now() + timeout };
      this.manualGoal = this.pending;
      this.startWorker();
      return { ok: true, controlEpoch: this.epoch };
    }
    if (this.operation) throw new ControlError('Wait for the current motion');
    if (this.owned.size) throw new ControlError('A previous motion needs a confirmed Stop before controls can resume');
    const epoch = this.invalidate(); this.stopped = false; this.activity = action;
    const operation = this.runAction(action, input, epoch);
    this.operation = operation;
    try { await operation; return { ok: true, controlEpoch: this.epoch }; }
    finally { if (this.operation === operation) { this.operation = null; this.activity = null; } }
  }
  async manualHead(input) {
    if (!this.adapter.headTrackingEnabled) throw new ControlError('Head controls are disabled pending operator approval');
    const axes=MANUAL_HEAD_AXES.filter(axis=>Object.hasOwn(input,axis));
    if(!axes.length) throw new ControlError('Choose at least one head axis',400);
    const limits=this.adapter.headManualLimits;
    for(const axis of axes) if(!Number.isFinite(input[axis]) || Math.abs(input[axis])>limits[axis]) throw new ControlError(`Head ${axis} must be between -${limits[axis]} and +${limits[axis]} ${['x','y','z'].includes(axis)?'millimetres':'degrees'}`,400);
    const speedLimit=input.speedLimit ?? null;
    if(speedLimit!==null && (!Number.isFinite(speedLimit) || speedLimit<ANTENNA_SPEED_MIN || speedLimit>ANTENNA_SPEED_MAX)) throw new ControlError('Speed limit must be between 5 and 120 degrees per second, or null for direct movement',400);
    const linearSpeedLimit=input.linearSpeedLimit ?? null;
    if(linearSpeedLimit!==null && (!Number.isFinite(linearSpeedLimit) || linearSpeedLimit<1 || linearSpeedLimit>50)) throw new ControlError('Linear speed limit must be between 1 and 50 millimetres per second, or null for direct movement',400);
    const blocked=()=>this.headStarting || this.headSession || this.headWorker || this.operation || this.worker || this.manualGoal || this.owned.size || (this.headHoldNeeded && !this.headManualWorker && !this.headManualGoal);
    if(blocked() || this.headManualStarting) throw new ControlError('Stop the current motion before manual head controls');
    this.headManualStarting=true;
    try {
      const state=await this.guard(true);this.checkEpoch(input.epoch);
      if(blocked() || this.stopPending || this.stopRequests) throw new ControlError('Stop the current motion before manual head controls');
      if(!state.headAngles || !state.headPositionMm || !Number.isFinite(state.bodyYaw)) throw new ControlError('Measured head and body state unavailable');
      const previous=this.headManualPending || this.headManualGoal || {...state.headAngles,...state.headPositionMm};
      const changedPolicy=this.headManualGoal && (this.headManualGoal.speedLimit!==speedLimit || this.headManualGoal.linearSpeedLimit!==linearSpeedLimit);
      if(changedPolicy) { this.headManualSent=null;this.headManualRevision++; }
      const baseline=!this.headManualGoal || changedPolicy ? rigidPose(state.headPose) : this.headManualGoal.baseline;
      const bodyYaw=!this.headManualGoal || changedPolicy ? state.bodyYaw : this.headManualGoal.bodyYaw;
      const goal={...Object.fromEntries(MANUAL_HEAD_AXES.map(axis=>[axis,previous[axis]])),...Object.fromEntries(axes.map(axis=>[axis,input[axis]]))};
      const distance=manualHeadDistance({...state.headAngles,...state.headPositionMm},goal);
      const travelSeconds=Math.max(speedLimit===null ? 0 : distance.angular/speedLimit,linearSpeedLimit===null ? 0 : distance.linear/linearSpeedLimit);
      const timeout=Math.min(120000,Math.max(10000,travelSeconds*2000+5000));
      const target={...goal,baseline,bodyYaw,speedLimit,linearSpeedLimit,revision:this.headManualRevision,epoch:this.epoch,deadline:Date.now()+timeout};
      this.headManualPending=target;this.headManualGoal=target;this.stopped=false;
      this.startManualHeadWorker();
      return {ok:true,controlEpoch:this.epoch};
    } finally {this.headManualStarting=false;}
  }
  startManualHeadWorker() {
    if(this.headManualWorker)return;
    const worker=this.pumpManualHead().catch(e=>{
      this.headManualPending=null;this.headManualGoal=null;this.headManualSent=null;
      this.stopPending ||= this.headHoldNeeded;this.message=e.message;this.recordFault(e);
    }).finally(()=>{
      if(this.headManualWorker===worker)this.headManualWorker=null;
      this.scheduleRecovery();
      if(this.headManualPending && !this.closed && !this.stopPending && !this.stopRequests)this.startManualHeadWorker();
    });
    this.headManualWorker=worker;
  }
  async pumpManualHead() {
    const refresh=()=>{this.status().catch(()=>{});};
    const monitor=setInterval(refresh,STATUS_REFRESH_MS);
    refresh();
    try {while((this.headManualPending || this.headManualGoal) && !this.closed) {
      if(this.headManualNeedsRefresh && this.headManualPending) {
        this.headManualNeedsRefresh=false;
        if(this.snapshotRead)await this.snapshotRead.catch(()=>{});
        const fresh=await this.status();
        const pending=this.headManualPending;
        if(pending && pending.epoch===this.epoch && fresh.headAngles && Number.isFinite(fresh.bodyYaw)) {
          pending.baseline=rigidPose(fresh.headPose);pending.bodyYaw=fresh.bodyYaw;
        }
        continue;
      }
      const started=performance.now(),target=this.headManualPending || this.headManualGoal;
      if(target.epoch!==this.epoch)break;
      if(Date.now()>target.deadline) {
        const error=Error('Head movement did not settle; measured hold required');
        const current=this.cachedStatus?.state;
        if(current?.headAngles && current?.headPositionMm) {
          const measured={...current.headAngles,...current.headPositionMm},distance=manualHeadDistance(measured,target);
          error.motionDiagnostics={requested:Object.fromEntries(MANUAL_HEAD_AXES.map(axis=>[axis,target[axis]])),measured,angularErrorDeg:distance.angular,translationErrorMm:distance.linear};
        }
        throw error;
      }
      const cached=this.cachedStatus;
      if(!cached || Date.now()-cached.startedAt>STATUS_MAX_AGE_MS)throw Error('Robot status became stale; head movement stopped');
      const state=cached.state;
      if(!state.connected || !state.ready || !state.awake || this.adapter.uncertain)throw Error(state.blockedReason || this.adapter.uncertain || 'Robot unavailable for head movement');
      if(this.headSession || this.headWorker || this.worker || this.operation || this.owned.size)throw Error('Another motion is running');
      if(!state.headAngles || !state.headPositionMm)throw Error('Measured head pose unavailable');
      const measured={...state.headAngles,...state.headPositionMm};
      if(!this.headManualPending) {
        const distance=manualHeadDistance(measured,target);
        if(cached.startedAt>this.headManualWriteAt && distance.angular<=1 && distance.linear<=1) {
          this.headManualGoal=null;this.headManualSent=null;this.headHoldNeeded=false;break;
        }
        await pause(HEAD_FRAME_MS);continue;
      }
      const base=this.headManualSent || measured;
      const next=slewManualHead(base,target,HEAD_FRAME_MS/1000);
      if(target.epoch!==this.epoch)break;
      this.headHoldNeeded=true;
      await this.adapter.setHead(absoluteHeadPose(target.baseline,next.yaw,next.pitch,next.roll,next),target.bodyYaw);
      this.headManualWriteAt=Date.now();
      if(this.headManualGoal && this.headManualGoal.revision!==target.revision) {
        this.headManualSent=null;this.headManualNeedsRefresh=true;
      } else this.headManualSent=next;
      const remaining=manualHeadDistance(next,target);
      if(this.headManualPending===target && remaining.angular<.01 && remaining.linear<.01)this.headManualPending=null;
      if(this.headManualPending || this.headManualGoal)await pause(Math.max(0,HEAD_FRAME_MS-(performance.now()-started)));
    }} finally {clearInterval(monitor);}
  }
  async startHead(input) {
    if (!this.adapter.headTrackingEnabled) throw new ControlError('Head following is disabled pending attended axis and body validation');
    if (this.headHoldNeeded || this.headManualStarting || this.headManualWorker || this.headManualGoal || this.headSession || this.headWorker || this.operation || this.worker || this.manualGoal || this.owned.size) throw new ControlError('Stop the current motion before head following');
    if (this.headStarting) throw new ControlError('Head following is starting');
    this.headStarting = true;
    try {
      const state = await this.guard(true); this.checkEpoch(input.epoch);
      if (this.headHoldNeeded || this.headManualStarting || this.headManualWorker || this.headManualGoal || this.headSession || this.headWorker || this.operation || this.worker || this.manualGoal || this.owned.size || this.stopPending || this.stopRequests) throw new ControlError('Stop the current motion before head following');
      let baseline; try { baseline = rigidPose(state.headPose); } catch(e) { throw new ControlError(e.message); }
      if (!Number.isFinite(state.bodyYaw)) throw new ControlError('Measured body yaw unavailable');
      const session = { id: crypto.randomUUID(), epoch: this.epoch, baseline, bodyYaw: state.bodyYaw, limits: {...this.adapter.headTrackingLimits}, sequence: -1, freshAt: Date.now(), sent: {yaw:0,pitch:0} };
      this.headSession = session; this.stopped = false; this.message = 'Head following active';
      const worker = this.pumpHead(session).catch(e => { this.message = e.message; this.headPending = null; this.stopPending ||= this.headHoldNeeded; this.recordFault(e); })
        .finally(() => {
          if (this.headWorker === worker) this.headWorker = null;
          this.scheduleRecovery();
          if (this.headSession === session || (this.headHoldNeeded && !this.stopRequests && !this.autoRecovery)) {
            this.stop().catch(e => { this.message = e.message; });
          }
        });
      this.headWorker = worker;
      return { ok: true, controlEpoch: this.epoch, headSession: session.id };
    } finally { this.headStarting = false; }
  }
  headFrame(input) {
    const session = this.headSession;
    if (!session || Date.now()-session.freshAt>HEAD_WATCHDOG_MS || input.headSession !== session.id) throw new ControlError('Head session expired; explicitly start again');
    if (!Number.isSafeInteger(input.sequence) || input.sequence <= session.sequence) throw new ControlError('Head frame sequence must increase',400);
    if (!Number.isFinite(input.ageMs) || input.ageMs < 0 || input.ageMs > 250 || !Number.isFinite(input.yaw) || Math.abs(input.yaw)>session.limits.yaw || !Number.isFinite(input.pitch) || Math.abs(input.pitch)>session.limits.pitch) throw new ControlError('Invalid or stale head frame',400);
    session.sequence=input.sequence; session.freshAt=Date.now()-input.ageMs;
    this.headPending={yaw:input.yaw,pitch:input.pitch};
    return {ok:true,controlEpoch:this.epoch};
  }
  async pumpHead(session) {
    const monitor=setInterval(()=>{this.status().catch(()=>{});},STATUS_REFRESH_MS);
    try {
      while(this.headSession===session && session.epoch===this.epoch && !this.closed) {
        const cached=this.cachedStatus;
        const sampleAge = Date.now() - session.freshAt;
        if(sampleAge>HEAD_WATCHDOG_MS) throw Error('Head frames expired; following stopped');
        if(!cached || Date.now()-cached.startedAt>STATUS_MAX_AGE_MS) throw Error('Robot status became stale; head following stopped');
        const state=cached.state;
        if(!state.connected || !state.ready || !state.awake || this.adapter.uncertain) throw Error(state.blockedReason || this.adapter.uncertain || 'Robot unavailable for head following');
        if(this.operation || this.worker || this.owned.size) throw Error('Another motion is running');
        const target=this.headPending;
        // A frame may pass validation on arrival but expire during its ramp.
        // Pause progression at the sample-age limit; the watchdog still holds
        // measured pose if fresh input does not resume before its deadline.
        if(sampleAge <= 250 && target && (target.yaw!==session.sent.yaw || target.pitch!==session.sent.pitch)) {
          const next=slewHead(session.sent,target,HEAD_FRAME_MS/1000);
          this.headHoldNeeded=true;
          await this.adapter.setHead(relativeHeadPose(session.baseline,next.yaw,next.pitch),session.bodyYaw);
          session.sent=next;
          if(this.headPending===target && next.yaw===target.yaw && next.pitch===target.pitch) this.headPending=null;
        }
        await pause(HEAD_FRAME_MS);
      }
    } finally { clearInterval(monitor); }
  }
  startWorker() {
    if (this.worker) return;
    const worker = this.pump().catch(e => { this.pending = null; this.manualGoal = null; this.lastSent = null; this.stopPending ||= this.holdNeeded; this.message = e.message; this.recordFault(e); })
      .finally(() => {
        if (this.worker === worker) this.worker = null;
        this.scheduleRecovery();
        // A new gesture can arrive between the pump completing and this
        // finalizer. Do not leave that accepted target without a worker.
        if (this.pending && !this.closed && !this.operation && !this.stopPending && !this.stopRequests) this.startWorker();
      });
    this.worker = worker;
  }
  async pump() {
    // Status I/O runs independently of the motor cadence. One shared snapshot
    // prevents browser polls and drag requests from duplicating six GETs.
    const refresh = () => { this.status().catch(() => {}); };
    const monitor = setInterval(refresh, STATUS_REFRESH_MS);
    refresh();
    try { while ((this.pending || this.manualGoal) && !this.closed) {
      if (this.rampNeedsRefresh && this.pending) {
        this.rampNeedsRefresh = false;
        if (this.snapshotRead) await this.snapshotRead.catch(() => {});
        await this.status(); continue;
      }
      const frameStarted = performance.now();
      const target = this.pending || this.manualGoal;
      if (target.epoch !== this.epoch) break;
      if (Date.now() > (target.deadline ?? target.at + 10000)) {
        const error=Error('Antenna movement did not settle; measured hold required');
        error.motionDiagnostics={requested:{left:target.left,right:target.right},measured:this.cachedStatus?.state.antennas || null};throw error;
      }
      const cached = this.cachedStatus;
      if (!cached || Date.now() - cached.startedAt > STATUS_MAX_AGE_MS) throw Error('Robot status became stale; antenna movement stopped');
      const s = cached.state;
      if (!s.connected || !s.ready || !s.awake || this.adapter.uncertain) throw Error(s.blockedReason || this.adapter.uncertain || 'Robot is not ready for antenna movement');
      if (target.epoch !== this.epoch || this.operation || this.closed) break;
      if (!this.pending) {
        // Acknowledged destination is not proof that the motor has arrived.
        // Track it without repeatedly sending the final goal.
        if (cached.startedAt > this.lastWriteAt && s.antennas && Math.abs(s.antennas.left - target.left) <= 1 && Math.abs(s.antennas.right - target.right) <= 1) {
          this.manualGoal = null; this.holdNeeded = false; this.lastSent = null;
          break;
        }
        await pause(ANTENNA_FRAME_MS); continue;
      }
      // First step starts from measured state, including an emote's end pose.
      const base = this.lastSent || s.antennas;
      if (!base || !Number.isFinite(base.left) || !Number.isFinite(base.right)) throw Error('Antenna state unavailable');
      const maxStep = target.speedLimit === null ? Infinity : target.speedLimit * ANTENNA_FRAME_MS / 1000;
      const step = side => base[side] + Math.max(-maxStep, Math.min(maxStep, target[side] - base[side]));
      const next = { left: step('left'), right: step('right') };
      // UI ±90° is a command policy, not a claimed hardware limit. An emote
      // may end outside it: smoothly return from measured state without a jump.
      if (Math.max(Math.abs(next.left), Math.abs(next.right)) > 180) throw Error('Measured antenna position is outside the audited range');
      if (target.epoch !== this.epoch) break;
      this.holdNeeded = true;
      await this.adapter.setAntennas([rad(next.right), rad(next.left)]);
      this.lastWriteAt = Date.now();
      if (this.manualGoal && this.manualGoal.policyRevision !== target.policyRevision) {
        // An older POST can finish after a policy change. Its destination
        // must not replace the measured start of the new limited gesture.
        this.lastSent = null; this.rampNeedsRefresh = true;
      } else this.lastSent = next;
      if (this.pending === target && Math.abs(next.left - target.left) < 0.01 && Math.abs(next.right - target.right) < 0.01) this.pending = null;
      // Never queue catch-up frames: slow POST acknowledgements slow motion,
      // rather than increasing the step size or accumulating commands.
      if (this.pending || this.manualGoal) await pause(Math.max(0, ANTENNA_FRAME_MS - (performance.now() - frameStarted)));
    } } finally { clearInterval(monitor); }
  }
  async runAction(action, input, epoch) {
    if (this.worker) await this.worker;
    await this.stopBarrier;
    if (epoch !== this.epoch) return;
    const s = await this.guard(action !== 'wake');
    if (epoch !== this.epoch) return;
    if (action === 'wake' && s.awake) { this.message = 'Already awake'; return; }
    let entry;
    if (action === 'emote') {
      entry = this.catalog.find(x => x.id === input.id);
      if (!entry) throw new ControlError('Select an emote from the available library', 400);
    }
    if (action === 'wake') {
      await this.adapter.enable();
      if (epoch !== this.epoch) return;
    }
    const move = await this.adapter.play(action, entry);
    if (!move?.uuid || typeof move.uuid !== 'string') throw Error('Robot did not return a motion ID');
    this.owned.add(move.uuid); this.lastSent = null; this.holdNeeded = false;
    // Stop can arrive while the play request is in flight. Own and cancel the
    // late UUID before returning; never lose that motion handle.
    if (epoch !== this.epoch) { await this.cancelOwned(move.uuid); return; }
    this.message = action === 'emote' ? `Playing ${entry.name}` : action === 'wake' ? 'Waking Reachy' : 'Putting Reachy to sleep';
    const deadline = Date.now() + 90000;
    try {
      while (epoch === this.epoch && !this.closed) {
        await pause(250);
        const active = await this.adapter.running();
        if (!active.some(x => x.uuid === move.uuid)) { this.owned.delete(move.uuid); break; }
        if (Date.now() > deadline) { await this.cancelOwned(move.uuid); throw Error('Motion timed out and was stopped'); }
      }
      if (epoch === this.epoch && !this.closed) {
        const after = await this.guard();
        if (action === 'wake' && !after.awake) throw Error('Wake did not enable movement');
        if (action === 'sleep' && after.awake) throw Error('Sleep did not disable movement');
        this.message = action === 'sleep' ? 'Asleep' : 'Ready';
      }
    } catch (e) { if (this.owned.has(move.uuid)) await this.cancelOwned(move.uuid); throw e; }
  }
  async cancelOwned(uuid) {
    try { await this.adapter.cancel(uuid); }
    catch (error) {
      const moves = await this.adapter.running();
      if (moves.some(x => x.uuid === uuid)) throw error;
    }
    this.owned.delete(uuid);
    await this.adapter.silence();
  }
  async stop({automatic=false}={}) {
    if(!automatic && this.autoRecovery)this.autoRecovery.cancelled=true;
    this.invalidate(); this.stopped = false; this.stopRequests++;
    this.message = 'Stopping motion';
    let antennas = null; let headHeld = false; let heldHeadAngles = null; let heldHeadPositionMm = null;
    const barrier = this.stopBarrier.then(async () => {
      if (this.worker) await this.worker;
      if (this.headWorker) await this.headWorker;
      if (this.headManualWorker) await this.headManualWorker;
      this.headManualSent=null;this.headManualNeedsRefresh=false;
      for (const uuid of [...this.owned]) await this.cancelOwned(uuid);
      this.lastSent = null;
      if (this.adapter.uncertain) {
        this.message = 'Stop is unconfirmed: a robot command had an unknown outcome';
        throw new ControlError(this.message, 502);
      }
      if (this.headHoldNeeded) {
        if (this.snapshotRead) await this.snapshotRead.catch(() => {});
        const {info,startedAt} = await this.readSnapshot();
        if (!info.connected || !info.ready || !info.awake || info.moves.length || Date.now()-startedAt>STATUS_MAX_AGE_MS) throw new ControlError(info.blockedReason || 'Cannot hold head while unavailable or another motion is running',502);
        const pose=rigidPose(info.headPose);
        if(!Number.isFinite(info.bodyYaw)) throw new ControlError('Fresh body yaw unavailable for Stop',502);
        await this.adapter.setHead(pose,info.bodyYaw);
        this.headHoldNeeded=false; headHeld=true; heldHeadAngles=headAngles(pose); heldHeadPositionMm=headPositionMm(pose);
      }
      if (this.holdNeeded) {
        // A read started before Stop may still be in flight. Drain it, then
        // obtain a new guarded read before choosing the position to hold.
        if (this.snapshotRead) await this.snapshotRead.catch(() => {});
        const { info, startedAt } = await this.readSnapshot();
        if (!info.connected || !info.ready || !info.awake || info.moves.length || Date.now() - startedAt > STATUS_MAX_AGE_MS)
          throw new ControlError(info.blockedReason || 'Cannot confirm an antenna hold while the robot is unavailable or another motion is running', 502);
        antennas = info.antennas;
        if (!antennas || !Number.isFinite(antennas.left) || !Number.isFinite(antennas.right) || Math.max(Math.abs(antennas.left), Math.abs(antennas.right)) > 180)
          throw new ControlError('Fresh antenna positions are unavailable for Stop', 502);
        await this.adapter.setAntennas([rad(antennas.right), rad(antennas.left)]);
        this.holdNeeded = false;
      }
      this.stopPending = false; this.recoveryBlocked=false; this.recoveryNeeded=null; this.stopped = true;
      this.message = headHeld ? 'Motion stopped - measured head and body positions held' : antennas ? 'Motion stopped — measured antenna positions held' : 'App motion stopped';
    });
    this.stopBarrier = barrier.catch(() => {});
    try { await barrier; }
    catch (error) { this.recoveryBlocked=true; this.stopPending = true; this.recordFault(error,'hold-failed'); this.message = `Stop is unconfirmed: ${error.message}`; throw error; }
    finally { this.stopRequests--; }
    return { ok: true, controlEpoch: this.epoch, antennas, headHeld, headAngles: heldHeadAngles, headPositionMm: heldHeadPositionMm };
  }
  async close() { this.closed = true; await this.stop(); if (this.operation) await this.operation.catch(() => {}); }
}

export class ReachyAdapter {
  constructor(config) {
    this.config = config; this.mediaRead = null; this.mediaState = null; this.mediaDiagnostics = null;
    const pilot = config.headTrackingPilot === true && config.headTrackingVerified !== true && config.headTrackingOperatorApproved !== true;
    this.headTrackingEnabled = config.headTrackingEnabled === true && (config.headTrackingVerified === true || config.headTrackingOperatorApproved === true || config.headTrackingPilot === true);
    this.headTrackingLimits = Object.freeze({ yaw: pilot ? 2 : HEAD_YAW_LIMIT, pitch: pilot ? 2 : HEAD_PITCH_LIMIT, pilot });
    this.headManualLimits = Object.freeze({...this.headTrackingLimits,roll:pilot?2:15,x:pilot?2:10,y:pilot?2:10,z:pilot?2:10});
    const url = new URL(config.robotUrl);
    if (url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/') throw Error('robotUrl must be a plain HTTP origin');
    if (!config.expectedHardwareId || !config.expectedVersion) throw Error('Configure the expected robot hardware ID and audited daemon version');
    this.origin = url.origin;
    this.signalUrl = `ws://${url.hostname}:8443`;
  }
  async request(route, method = 'GET', body, timeout = 3500) {
    let r; const startedAt=Date.now();
    try {
      r = await fetch(this.origin + route, { method, signal: AbortSignal.timeout(timeout),
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
      if (!r.ok) throw Error(`Reachy returned HTTP ${r.status} for ${route}`);
      return await r.json();
    } catch (e) {
      e.requestRoute=route;this.lastRequestFailure={route,method,readMs:Date.now()-startedAt,reason:e.message,at:Date.now()};
      if (method !== 'GET' && (!r || r.ok || r.status >= 500) && route !== '/api/move/stop') {
        // HTTP abort cannot retract a daemon command. Do not pretend it was
        // rejected, retry it, or unlock later controls on a successful ping.
        this.uncertain = `The outcome of ${route} is unknown. Controls are locked; inspect Reachy before restarting the controller.`;
        this.config.onUncertain?.(this.uncertain);
      }
      throw e;
    }
  }
  async snapshot() {
    // Video readiness is optional control information. A media read failure or
    // slow video stack must not invalidate motor ownership or stop controls.
    if(!this.mediaRead) {
      this.mediaRead=this.request('/api/media/status').then(media=>{
        this.mediaState=media;this.mediaDiagnostics={ready:!!media.available && !media.released && !media.no_media,at:Date.now(),error:null};
      }).catch(error=>{this.mediaState=null;this.mediaDiagnostics={ready:false,at:Date.now(),error:error.message};}).finally(()=>{this.mediaRead=null;});
    }
    const [d, lock, app, state, moves] = await Promise.all([
      '/api/daemon/status', '/api/daemon/robot-app-lock-status', '/api/apps/current-app-status',
      '/api/state/full?use_pose_matrix=true', '/api/move/running'].map(p => this.request(p)));
    const reasons = [];
    if (this.uncertain) reasons.push(this.uncertain);
    if (d.hardware_id !== this.config.expectedHardwareId) reasons.push('Robot identity differs from configuration');
    if (d.version !== this.config.expectedVersion) reasons.push('Daemon version differs from the configured adapter');
    if (d.state !== 'running' || !d.backend_status?.ready || d.error || d.backend_status?.error) reasons.push('Robot daemon is not ready');
    if (lock.state !== 'free' || app !== null) reasons.push('Another app has control of Reachy');
    const positions = state.antennas_position;
    if (!Array.isArray(positions) || positions.length !== 2 || !positions.every(Number.isFinite)) reasons.push('Antenna state unavailable');
    return { connected: true, ready: reasons.length === 0, awake: d.backend_status?.motor_control_mode === 'enabled',
      motorMode: d.backend_status?.motor_control_mode,
      headPose: state.head_pose?.m || null, bodyYaw: state.body_yaw,
      antennas: positions ? { right: deg(positions[0]), left: deg(positions[1]) } : null,
      moves, mediaReady: !!this.mediaState?.available && !this.mediaState?.released && !this.mediaState?.no_media,
      blockedReason: reasons.join('; ') || null };
  }
  catalog(library) { return this.request('/api/move/recorded-move-datasets/list/' + library.split('/').map(encodeURIComponent).join('/'), 'GET', null, 45000); }
  async setAntennas(pair) {
    const result = await this.request('/api/move/set_target', 'POST', { target_antennas: pair });
    if (result.status !== 'ok') throw Error('Reachy ignored the antenna target because another motion is running');
  }
  async setHead(pose,bodyYaw) {
    const m=rigidPose(pose);
    if(!Number.isFinite(bodyYaw)) throw Error('Finite body yaw required');
    const result=await this.request('/api/move/set_target','POST',{target_head_pose:{m},target_body_yaw:bodyYaw});
    if(result.status!=='ok') throw Error('Reachy ignored the head target because another motion is running');
  }
  async enable() { await this.request('/api/motors/set_mode/enabled', 'POST'); }
  play(action, entry) {
    const path = action === 'emote' ? 'recorded-move-dataset/' + entry.library.split('/').map(encodeURIComponent).join('/') + '/' + encodeURIComponent(entry.name)
      : action === 'wake' ? 'wake_up' : 'goto_sleep';
    return this.request('/api/move/play/' + path, 'POST', null, 45000);
  }
  running() { return this.request('/api/move/running'); }
  cancel(uuid) { return this.request('/api/move/stop', 'POST', { uuid }); }
  silence() { return this.request('/api/media/stop_sound', 'POST'); }
}

export class DemoAdapter {
  constructor() { this.headManualLimits = Object.freeze({yaw:HEAD_YAW_LIMIT,pitch:HEAD_PITCH_LIMIT,roll:15,x:10,y:10,z:10,pilot:false}); this.headTrackingLimits = Object.freeze({yaw:HEAD_YAW_LIMIT,pitch:HEAD_PITCH_LIMIT,pilot:false}); this.headTrackingEnabled = true; this.headPose = [...IDENTITY_POSE]; this.headPose[11] = 0; this.bodyYaw = 0; this.awake = false; this.pair = [0, 0]; this.moves = []; this.timers = new Map(); }
  async snapshot() { return { connected: true, ready: true, awake: this.awake, headPose: [...this.headPose], bodyYaw: this.bodyYaw, antennas: { right: deg(this.pair[0]), left: deg(this.pair[1]) }, mediaReady: false, moves: [...this.moves] }; }
  async catalog() { return ['attentive1', 'cheerful1', 'confused1', 'curious1', 'dance1', 'laughing1', 'loving1', 'sad1', 'sleep1', 'surprised1', 'thoughtful1', 'welcoming1']; }
  async setAntennas(pair) { this.pair = pair; }
  async setHead(pose,bodyYaw) { this.headPose = rigidPose(pose); this.bodyYaw = bodyYaw; }
  async enable() { this.awake = true; }
  async play(action) {
    const uuid = crypto.randomUUID(); this.moves.push({ uuid });
    this.timers.set(uuid, setTimeout(() => { this.moves = this.moves.filter(x => x.uuid !== uuid); this.timers.delete(uuid); if (action === 'sleep') this.awake = false; }, 900));
    return { uuid };
  }
  async running() { return this.moves; }
  async cancel(uuid) { clearTimeout(this.timers.get(uuid)); this.timers.delete(uuid); this.moves = this.moves.filter(x => x.uuid !== uuid); }
  async silence() {}
}
