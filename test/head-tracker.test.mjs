import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadTracker, headAssetBase } from '../src/head-tracker.js';

const identity = {rows:4,columns:4,data:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,-50,1]};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('head assets resolve from the document for root and relocated deployments', () => {
  for (const [base, page, expected] of [
    ['./', 'https://site.invalid/reachy-mini/#demo', 'https://site.invalid/reachy-mini/'],
    ['./', 'https://site.invalid/elsewhere/index.html', 'https://site.invalid/elsewhere/'],
    ['/reachy-mini/', 'https://site.invalid/elsewhere/', 'https://site.invalid/reachy-mini/'],
    ['/', 'https://site.invalid/index.html', 'https://site.invalid/'],
  ]) assert.equal(headAssetBase(base, page), expected);
});

function environment(t, capture) {
  const saved = new Map();
  const set = (key,value) => { saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}); };
  let stopped = 0, terminated = 0, closed = 0, frames = 0, worker;
  const stream = {getTracks: () => [track]};
  const track = {stop: () => stopped++};
  set('navigator',{mediaDevices:{getUserMedia: capture ?? (() => Promise.resolve(stream))}});
  set('createImageBitmap',async () => ({close: () => closed++}));
  set('Worker', class {
    constructor(){worker=this;}
    postMessage(message){ if(message.type==='init') queueMicrotask(() => this.onmessage({data:{type:'ready'}})); else frames++; }
    terminate(){terminated++;}
  });
  let callback;
  const video = {readyState:2,videoWidth:640,videoHeight:480,play:async()=>{},pause(){},
    requestVideoFrameCallback(fn){ callback=fn; return 1; },cancelVideoFrameCallback(){callback=null;}};
  t.after(() => {for(const [key,descriptor] of saved) {if(descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key];}});
  return {video,stream,track, fire:()=>callback?.(), reply:(matrix, timestamp=performance.now())=>worker.onmessage({data:{type:'pose',timestamp,matrix}}),
    get stopped(){return stopped;},get terminated(){return terminated;},get closed(){return closed;},get frames(){return frames;}};
}
test('explicit start, one inference in flight, explicit calibration and loss invalidation',async t => {
  const e=environment(t), poses=[];
  const tracker=createHeadTracker({video:e.video,onPose:p=>poses.push(p)});
  t.after(()=>tracker.stop());
  assert.equal(e.video.srcObject,undefined); assert.equal(tracker.calibrate(),false);
  await tracker.start(); e.fire(); await tick(); e.fire(); await tick();
  assert.equal(e.frames,1);
  e.reply(identity); assert.equal(poses.at(-1).tracked,true); assert.equal(poses.at(-1).calibrated,false);
  assert.equal(tracker.calibrate(),true); assert.equal(tracker.neutralReady,true);
  e.reply(null); assert.equal(tracker.neutralReady,false); assert.equal(poses.at(-1).tracked,false);
  e.reply(identity); assert.equal(poses.at(-1).calibrated,false);
  tracker.stop(); assert.equal(e.stopped,1); assert.equal(e.terminated,1); assert.equal(e.video.srcObject,null);
});
test('camera granted after cancellation is stopped and never attached',async t => {
  let grant;
  const e=environment(t,()=>new Promise(resolve=>{grant=resolve;}));
  const tracker=createHeadTracker({video:e.video});
  const starting=tracker.start(); tracker.stop(); grant(e.stream); await starting; await tick();
  assert.equal(e.stopped,1); assert.equal(e.video.srcObject,null); assert.equal(e.terminated,0);
});
test('bitmap completed after stop is closed without worker dispatch',async t => {
  const e=environment(t); let finish;
  globalThis.createImageBitmap=()=>new Promise(resolve=>{finish=resolve;});
  const tracker=createHeadTracker({video:e.video});
  await tracker.start(); e.fire(); tracker.stop();
  let closed=0; finish({close(){closed++;}}); await tick();
  assert.equal(closed,1); assert.equal(e.frames,0);
});
test('stale and invalid timestamps never calibrate',async t => {
  const e=environment(t),poses=[];
  const tracker=createHeadTracker({video:e.video,onPose:p=>poses.push(p)});
  t.after(()=>tracker.stop()); await tracker.start();
  for(const timestamp of [performance.now()-251,NaN,Infinity,performance.now()+500]) {
    e.reply(identity,timestamp); assert.equal(poses.at(-1).tracked,false); assert.equal(tracker.calibrate(),false);
  }
});
