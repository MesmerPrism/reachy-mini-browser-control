import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {MatrixSession} from '../tools/matrix-session.mjs';
import {MatrixRunner,makeMatrixPlan,parseMatrixCsv} from '../tools/movement-matrix.mjs';
import {OfflineMatrixPort} from '../tools/matrix-offline-port.mjs';
const csv=fs.readFileSync(new URL('../docs/movement-comparison-matrix.csv',import.meta.url),'utf8');
function fixture(){
 const neutral={headPose:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],bodyYaw:0,antennas:[0,0]},plan=makeMatrixPlan(neutral,parseMatrixCsv(csv),{csvSha256:createHash('sha256').update(csv).digest('hex')});
 const io=new OfflineMatrixPort(neutral),runner=new MatrixRunner({plan,io}),commands=[];let awake=false,stale=false,observerFail=false;
 const control={status:async()=>({connected:true,ready:true,awake,motorMode:awake?'enabled':'disabled',busy:false,moves:[],controlEpoch:1,
  diagnostics:{snapshot:{startedAt:Date.now()-(stale?501:0),completedAt:Date.now()}}}),
  command:async body=>{commands.push(body.action);if(body.action==='wake')awake=true;if(body.action==='sleep')awake=false;return {ok:true};}};
 const session=new MatrixSession({runner,control,observer:{qualify:async()=>{if(observerFail)throw Error('Injected read delay');}},authority:async()=>({authorized:true,attended:true}),journal:async()=>{}});
 return {session,runner,io,commands,setStale:x=>stale=x,setObserverFail:x=>observerFail=x};
}
test('attended lifecycle requires explicit Wake/visual/axis and Sleep stages; read-only retries do not replay power',async()=>{
 const f=fixture(),s=f.session;await s.prepare();assert.deepEqual(f.commands,[]);
 await assert.rejects(s.runAxis({operatorReady:true}));await s.power('wake',{operatorConfirmed:true});
 await assert.rejects(s.power('wake',{operatorConfirmed:true}));await assert.rejects(s.confirmAwake({observedAwakeAndSettled:false}));
 f.setObserverFail(true);await assert.rejects(s.confirmAwake({observedAwakeAndSettled:true}));assert.equal(s.stage,'waiting-wake-visual');
 f.setObserverFail(false);await s.confirmAwake({observedAwakeAndSettled:true});
 for(let i=0;i<6;i++)await s.runAxis({operatorReady:true});
 assert.equal(s.stage,'waiting-reset-sleep');assert.deepEqual(f.commands,['wake']);
 await assert.rejects(s.runAxis({operatorReady:true}));await s.power('sleep',{operatorConfirmed:true});
 f.setStale(true);await assert.rejects(s.confirmAsleep({observedAsleepAndSettled:true}));assert.equal(s.stage,'waiting-sleep-visual');
 f.setStale(false);await s.confirmAsleep({observedAsleepAndSettled:true});assert.equal(s.stage,'waiting-wake');assert.deepEqual(f.commands,['wake','sleep']);
 await s.power('wake',{operatorConfirmed:true});await s.confirmAwake({observedAwakeAndSettled:true});
 assert.equal(s.stage,'waiting-axis');assert.equal(f.runner.pendingReset,null);assert.deepEqual(f.commands,['wake','sleep','wake']);
});
test('session Stop remains available without arming and never automatically sleeps or resumes',async()=>{
 const f=fixture();await f.session.prepare();await f.session.power('wake',{operatorConfirmed:true});await f.session.stop();
 assert.equal(f.session.stage,'parked');assert.equal(f.runner.parked,true);assert.deepEqual(f.commands,['wake','stop']);
 await assert.rejects(f.session.runAxis({operatorReady:true}));
});
test('Stop during durable power intent retires Wake before dispatch',async()=>{
 const f=fixture();await f.session.prepare();
 f.session.journal=async type=>{if(type==='matrix-power-intent')await f.session.stop();};
 await assert.rejects(f.session.power('wake',{operatorConfirmed:true}),/retired/);
 assert.deepEqual(f.commands,['stop']);assert.equal(f.session.stage,'parked');
});
test('already-disabled parked session closes with read-only visual qualification and no extra power command',async()=>{
 const f=fixture();await f.session.prepare();await f.session.stop();await f.session.confirmAsleep({observedAsleepAndSettled:true});
 assert.equal(f.session.stage,'closed');assert.deepEqual(f.commands,['stop']);
});
