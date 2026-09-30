import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadManualQueue } from '../src/head-manual-queue.mjs';
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  let time=0, timer=null, enabled=true;
  const sent=[],acknowledged=[],errors=[];
  const queue=createHeadManualQueue({now:()=>time,setTimer:(fn,delay)=>{timer={fn,delay};return timer;},clearTimer:()=>{timer=null;},eligible:()=>enabled,
    send:body=>new Promise((resolve,reject)=>sent.push({body,resolve,reject})),onAcknowledged:data=>acknowledged.push(data),onError:error=>errors.push(error)});
  return {queue,sent,acknowledged,errors,fire(){const current=timer; timer=null; current?.fn();},get delay(){return timer?.delay;},setTime:t=>{time=t;},disable:()=>{enabled=false;}};
}
test('partial axes coalesce at 10Hz and one mutation remains in flight',async()=>{
  const h=harness();
  h.queue.enqueue({yaw:5,speedLimit:null});h.queue.enqueue({pitch:3,speedLimit:null});h.fire();
  assert.deepEqual(h.sent[0].body,{action:'head-target',yaw:5,pitch:3,speedLimit:null});
  h.setTime(10);h.queue.enqueue({yaw:8,speedLimit:20});h.queue.enqueue({yaw:9,speedLimit:20});h.fire();
  assert.equal(h.sent.length,1); h.sent[0].resolve({ok:true});await tick();assert.equal(h.delay,90);
  h.setTime(100);h.fire();assert.deepEqual(h.sent[1].body,{action:'head-target',yaw:9,speedLimit:20});
  h.sent[1].resolve({ok:true});await tick();assert.equal(h.queue.outstanding,false);
});
test('Stop discards pending work and ignores late mutation error without replay',async()=>{
  const h=harness();h.queue.enqueue({yaw:5,speedLimit:null});h.fire();h.queue.enqueue({pitch:4,speedLimit:null});
  h.queue.discard();h.sent[0].reject(new Error('old failure'));await tick();h.fire();
  assert.equal(h.sent.length,1);assert.equal(h.errors.length,0);assert.equal(h.queue.outstanding,false);
});
test('fresh input after discard waits for old flight but does not replay old axis',async()=>{
  const h=harness();h.queue.enqueue({yaw:5});h.fire();h.queue.discard();h.queue.enqueue({pitch:2});h.fire();assert.equal(h.sent.length,1);
  h.sent[0].resolve({old:true});await tick();assert.equal(h.acknowledged.length,0);h.setTime(100);h.fire();
  assert.deepEqual(h.sent[1].body,{action:'head-target',pitch:2});h.sent[1].resolve({ok:true});await tick();
});
test('failure drops coalesced work; ineligible queues never replay after reconnect',async()=>{
  const h=harness();h.queue.enqueue({yaw:5});h.fire();h.queue.enqueue({pitch:3});h.sent[0].reject(new Error('failed'));await tick();h.fire();
  assert.equal(h.errors.length,1);assert.equal(h.sent.length,1);
  h.queue.enqueue({yaw:7});h.disable();h.fire();assert.equal(h.queue.outstanding,false);assert.equal(h.sent.length,1);
});
test('all six axes coalesce with independent angular and linear speeds',async()=>{
  const h=harness();
  for (const [axis,value] of Object.entries({yaw:4,pitch:3,roll:-2,x:7,y:-6,z:5})) h.queue.enqueue({[axis]:value,speedLimit:20,linearSpeedLimit:10});
  h.fire();assert.deepEqual(h.sent[0].body,{action:'head-target',yaw:4,pitch:3,roll:-2,x:7,y:-6,z:5,speedLimit:20,linearSpeedLimit:10});
  h.queue.enqueue({yaw:0,pitch:0,roll:0,speedLimit:null,linearSpeedLimit:null});
  h.queue.discard();h.sent[0].resolve({ok:true});await tick();h.fire();
  assert.equal(h.sent.length,1);assert.equal(h.acknowledged.length,0);
});
test('separate centre actions omit the other three axes',async()=>{
  const h=harness();h.queue.enqueue({yaw:0,pitch:0,roll:0,speedLimit:null,linearSpeedLimit:null});h.fire();
  assert.deepEqual(h.sent[0].body,{action:'head-target',yaw:0,pitch:0,roll:0,speedLimit:null,linearSpeedLimit:null});
  h.sent[0].resolve({ok:true});await tick();h.setTime(100);
  h.queue.enqueue({x:0,y:0,z:0,speedLimit:20,linearSpeedLimit:10});h.fire();
  assert.deepEqual(h.sent[1].body,{action:'head-target',x:0,y:0,z:0,speedLimit:20,linearSpeedLimit:10});
  h.sent[1].resolve({ok:true});await tick();
});
