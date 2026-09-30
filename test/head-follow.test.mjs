import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadFollow } from '../src/head-follow.mjs';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const pose = { yaw: 4, pitch: 2, ageMs: 0, tracked: true, calibrated: true };

test('release during a delayed start fences every frame and stops the late session', async () => {
  let resolveStart; const calls = [];
  const follow = createHeadFollow({ send: async body => {
    calls.push(body);
    if (body.action === 'head-start') return new Promise(resolve => { resolveStart = resolve; });
    return { ok: true };
  } });
  const starting = follow.start(); follow.push(pose); await pause(1);
  await follow.stop(); resolveStart({ headSession: 'late' }); await starting;
  assert.equal(follow.active, false);
  assert.equal(calls.filter(x => x.action === 'head-frame').length, 0);
  assert.equal(calls.at(-1).action, 'head-stop');
});

test('frames coalesce during one delayed request and stop discards pending angles', async () => {
  const calls = []; let resolveFrame;
  const follow = createHeadFollow({ send: async body => {
    calls.push(body);
    if (body.action === 'head-start') return { headSession: 'one' };
    if (body.action === 'head-frame') return new Promise(resolve => { resolveFrame = resolve; });
    return { ok: true };
  } });
  await follow.start(); follow.push(pose); await pause(10);
  for (let i=0;i<10;i++) follow.push({ ...pose, yaw:i });
  assert.equal(calls.filter(x => x.action === 'head-frame').length, 1);
  await follow.stop(); resolveFrame({ok:true}); await pause(80);
  assert.equal(calls.filter(x => x.action === 'head-frame').length, 1);
});

test('queued samples age while a start is delayed and cannot become fresh on send', async () => {
  let time=0, resolveStart; const calls=[];
  const follow=createHeadFollow({now:()=>time,send:async body=>{
    calls.push(body); if(body.action==='head-start') return new Promise(resolve=>{resolveStart=resolve;}); return {ok:true};
  }});
  const starting=follow.start(); follow.push(pose); await pause(1); time=300;
  resolveStart({headSession:'stale'}); await starting; await pause(5);
  assert.equal(calls.filter(x=>x.action==='head-frame').length,0);
  assert.equal(calls.at(-1).action,'head-stop'); assert.equal(follow.active,false);
});

test('tracking loss and rejected frames disarm without automatic restart', async () => {
  const calls=[], errors=[];
  const follow=createHeadFollow({onError:e=>errors.push(e),send:async body=>{
    calls.push(body); if(body.action==='head-start') return {headSession:'one'};
    if(body.action==='head-frame') throw Error('Session expired'); return {ok:true};
  }});
  await follow.start(); follow.push(pose); await pause(15);
  follow.push(pose); await pause(10);
  assert.equal(follow.active,false); assert.deepEqual(errors,['Session expired']);
  assert.equal(calls.filter(x=>x.action==='head-start').length,1);
});

test('fresh status showing watchdog termination disarms quietly; pre-start reads are ignored', async () => {
  let time = 100; const calls = [], errors = [];
  const follow = createHeadFollow({ now: () => time, onError: e => errors.push(e), send: async body => {
    calls.push(body); return body.action === 'head-start' ? { headSession: 'one' } : { ok: true };
  } });
  await follow.start();
  follow.observeStatus({ headTrackingActive: false, headTrackingSession: null }, 99);
  assert.equal(follow.active, true);
  time = 200;
  follow.observeStatus({ headTrackingActive: false, headTrackingSession: null }, 200);
  follow.push(pose); await pause(10);
  assert.equal(follow.active, false); assert.deepEqual(errors, []);
  assert.deepEqual(calls.map(x => x.action), ['head-start']);
});

test('pilot transport clamps a tracked pose to both advertised two-degree bounds', async () => {
  const calls = [];
  const follow = createHeadFollow({ getLimits: () => ({ yaw: 2, pitch: 2 }), send: async body => {
    calls.push(body); return body.action === 'head-start' ? { headSession: 'pilot' } : { ok: true };
  } });
  await follow.start(); follow.push({ ...pose, yaw: 15, pitch: -10 }); await pause(15);
  const frame = calls.find(x => x.action === 'head-frame');
  assert.equal(frame.yaw, 2); assert.equal(frame.pitch, -2);
  await follow.stop();
});
