import test from 'node:test';
import assert from 'node:assert/strict';
import { createTalkLifecycle } from '../src/talk-lifecycle.mjs';
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject}; };
function harness(overrides={}) {
  const attachments=[],states=[],errors=[];let cleared=0,stopped=0,allowed=true;
  const track={enabled:true,readyState:'live',stop(){stopped++;this.readyState='ended';}};
  const stream={getAudioTracks:()=>[track],getTracks:()=>[track]};
  const talk=createTalkLifecycle({capture:async()=>stream,attach:async next=>attachments.push(next),clear:async()=>{cleared++;},allowed:()=>allowed,
    onState:(state,talking)=>states.push({state,talking}),onError:error=>errors.push(error),...overrides});
  return {talk,track,stream,attachments,states,errors,get cleared(){return cleared;},get stopped(){return stopped;},disallow(){allowed=false;}};
}
test('enable captures once disabled, explicit hold speaks, release disables synchronously',async()=>{
  const h=harness();await h.talk.enable();assert.equal(h.track.enabled,false);assert.equal(h.attachments.length,0);
  await h.talk.press();assert.equal(h.track.enabled,true);assert.equal(h.states.at(-1).talking,true);
  h.talk.release();assert.equal(h.track.enabled,false);await tick();assert.equal(h.attachments.at(-1),null);assert.equal(h.cleared,1);
  h.talk.disable();await tick();assert.equal(h.stopped,1);
});
test('permission granted after release is stopped and never attached',async()=>{
  const capture=deferred(),h=harness({capture:()=>capture.promise});
  const pressing=h.talk.press();await tick();h.talk.release();capture.resolve(h.stream);await pressing;await tick();
  assert.equal(h.track.enabled,false);assert.equal(h.stopped,1);assert.ok(h.attachments.every(track=>track===null));
});
test('release during authorization never captures or enables microphone',async()=>{
  const authorization=deferred();let captures=0;
  const h=harness({authorize:()=>authorization.promise,capture:async()=>{captures++;return h.stream;}});
  const pressing=h.talk.press();h.talk.release();authorization.resolve();await pressing;await tick();assert.equal(captures,0);assert.equal(h.cleared,1);
});
test('late sender replacement after release cannot enable speech',async()=>{
  const replacement=deferred();const h=harness({attach:track=>track?replacement.promise:Promise.resolve()});
  await h.talk.enable();const pressing=h.talk.press();await tick();h.talk.release();assert.equal(h.track.enabled,false);
  replacement.resolve();await pressing;await tick();assert.equal(h.track.enabled,false);assert.equal(h.states.some(s=>s.talking),false);
  h.talk.disable();
});
test('disconnect while awaiting sender prevents transmission; failed preflight never captures',async()=>{
  const replacement=deferred(),h=harness({attach:track=>track?replacement.promise:Promise.resolve()});
  await h.talk.enable();const pressing=h.talk.press();await tick();h.disallow();replacement.resolve();await pressing;
  assert.equal(h.track.enabled,false);h.talk.disable();
  let capture=0;const failed=harness({authorize:async()=>{throw new Error('Foreign owner');},capture:async()=>{capture++;return h.stream;}});
  await failed.talk.press();await tick();assert.equal(capture,0);assert.equal(failed.errors[0].message,'Foreign owner');
});
test('capture failure can be retried by another explicit press',async()=>{
  let captures=0;
  const h=harness({capture:async()=>{if(++captures===1) throw new Error('Permission denied');return h.stream;}});
  await h.talk.press();h.talk.release();await h.talk.press();
  assert.equal(captures,2);assert.equal(h.track.enabled,true);h.talk.disable();await tick();
});
