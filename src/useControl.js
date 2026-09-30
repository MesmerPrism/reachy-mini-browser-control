import { useEffect, useRef, useState } from 'react';

export function useControl() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState({ connected: false, ready: false, awake: false, antennas: {} });
  const [statusReadAt, setStatusReadAt] = useState(-Infinity);
  const [emotes, setEmotes] = useState([]);
  const [error, setError] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [targets, setTargets] = useState({ left: 0, right: 0 });
  const [commandPending, setCommandPending] = useState(false);
  const [stopRevision, setStopRevision] = useState(0);
  const [headStopReceipt, setHeadStopReceipt] = useState(null);
  const headQueueCancel = useRef(null);
  const [limitSpeed, setLimitSpeed] = useState(false);
  const [speedLimit, setSpeedLimit] = useState(60);
  const antennaPolicy = useRef({ limited: false, speed: 60 });
  const antennaModes = useRef(false);
  const actionFlight = useRef(null);
  const manualTarget = useRef(false);
  const epoch = useRef(0);
  const token = useRef(null), pending = useRef(null), timer = useRef(null), flight = useRef(null), generation = useRef(0), lastSent = useRef(0), targetRef = useRef(targets), statusRef = useRef(status);
  statusRef.current = status;
  const clearQueue = () => { generation.current++; pending.current = null; clearTimeout(timer.current); timer.current = null; flight.current?.abort(); flight.current = null; };
  const discardUnsent = () => { pending.current = null; clearTimeout(timer.current); timer.current = null; };
  const request = async (body, keepalive = false, signal) => {
    if (!token.current) throw new Error('Control session is unavailable.');
    const payload = body.action === 'stop' ? body : { ...body, epoch: epoch.current };
    const res = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Control-Token': token.current }, body: JSON.stringify(payload), keepalive, signal });
    const data = await res.json();
    if (Number.isInteger(data.controlEpoch)) epoch.current = Math.max(epoch.current, data.controlEpoch);
    if (!res.ok || !data.ok) throw new Error(data.error || 'Command failed.');
    return data;
  };
  const command = async (action, extra = {}) => {
    headQueueCancel.current?.();
    if (action === 'stop') setStopRevision(n => n + 1);
    manualTarget.current = false;
    clearQueue();
    actionFlight.current?.abort();
    const controller = new AbortController(); actionFlight.current = controller;
    const gen = generation.current;
    setCommandPending(true);
    setError('');
    try {
      if (action !== 'stop') {
        const stateResponse = await fetch('/api/status', { signal: controller.signal });
        const state = await stateResponse.json();
        if (!stateResponse.ok || !state.ready || state.busy) throw new Error(state.blockedReason || 'Wait until Reachy is ready.');
        if (gen !== generation.current) return;
        if (Number.isInteger(state.controlEpoch)) epoch.current = Math.max(epoch.current, state.controlEpoch);
      }
      const acknowledged = await request({ action, ...extra }, false, controller.signal);
      if (action === 'stop' && gen === generation.current && Number.isFinite(acknowledged.headAngles?.yaw) && Number.isFinite(acknowledged.headAngles?.pitch)) {
        setHeadStopReceipt(previous => ({ headAngles: acknowledged.headAngles, headPositionMm: acknowledged.headPositionMm, revision: (previous?.revision || 0) + 1 }));
        const next = { ...statusRef.current, headAngles: acknowledged.headAngles, ...(acknowledged.headPositionMm ? {headPositionMm: acknowledged.headPositionMm} : {}), headManualActive: false, headManualTarget: null, headTrackingActive: false };
        statusRef.current = next; setStatus(next);
      }
      if (action === 'stop' && gen === generation.current && Number.isFinite(acknowledged.antennas?.left) && Number.isFinite(acknowledged.antennas?.right)) {
        const pair = { left: Math.round(Math.max(-90, Math.min(90, acknowledged.antennas.left))), right: Math.round(Math.max(-90, Math.min(90, acknowledged.antennas.right))) };
        targetRef.current = pair; setTargets(pair);
        const next = { ...statusRef.current, antennas: acknowledged.antennas };
        statusRef.current = next; setStatus(next);
      }
      if (action !== 'stop' && gen === generation.current) {
        const response = await fetch('/api/status', { signal: controller.signal });
        const next = await response.json();
        if (!response.ok) throw new Error(next.error || 'Could not refresh measured robot state.');
        if (gen === generation.current) {
          if (Number.isInteger(next.controlEpoch)) epoch.current = Math.max(epoch.current, next.controlEpoch);
          setStatus(next); statusRef.current = next;
          if (Number.isFinite(next.antennas?.left) && Number.isFinite(next.antennas?.right)) {
            const pair = { left: Math.max(-90, Math.min(90, Math.round(next.antennas.left))), right: Math.max(-90, Math.min(90, Math.round(next.antennas.right))) };
            targetRef.current = pair; setTargets(pair);
          }
        }
      }
    }
    catch (e) { if (e.name !== 'AbortError' && gen === generation.current) setError(e.message); }
    finally { if (actionFlight.current === controller) { actionFlight.current = null; setCommandPending(false); } }
  };
  const flush = async () => {
    timer.current = null;
    if (!pending.current || flight.current) return;
    const current = statusRef.current;
    if (document.hidden || !antennaModes.current || actionFlight.current || !current.connected || !current.ready || current.busy || current.headTrackingActive || current.headManualActive) { pending.current = null; return; }
    const pair = pending.current; pending.current = null;
    const gen = generation.current, controller = new AbortController(); flight.current = controller; lastSent.current = Date.now();
    try { await request({ action: 'antennas', ...pair }, false, controller.signal); }
    catch (e) { if (e.name !== 'AbortError' && gen === generation.current) setError(e.message); }
    finally { if (gen === generation.current) { flight.current = null; if (pending.current) timer.current = setTimeout(flush, Math.max(0, 100 - (Date.now() - lastSent.current))); } }
  };
  const setAngle = (side, value) => {
    const policy = antennaPolicy.current;
    if (!antennaModes.current || !Number.isFinite(value) || (policy.limited && (!Number.isFinite(policy.speed) || policy.speed < 5 || policy.speed > 120))) return;
    manualTarget.current = true;
    const pair = { ...targetRef.current, [side]: Math.max(-90, Math.min(90, Math.round(value))) };
    targetRef.current = pair; setTargets(pair); pending.current = { ...pending.current, [side]: pair[side], speedLimit: policy.limited ? policy.speed : null }; setError('');
    if (!timer.current && !flight.current) timer.current = setTimeout(flush, Math.max(0, 100 - (Date.now() - lastSent.current)));
  };
  const centre = () => {
    const policy = antennaPolicy.current;
    if (!antennaModes.current || (policy.limited && (!Number.isFinite(policy.speed) || policy.speed < 5 || policy.speed > 120))) return;
    manualTarget.current = true; targetRef.current = { left: 0, right: 0 }; setTargets(targetRef.current);
    pending.current = { ...targetRef.current, speedLimit: policy.limited ? policy.speed : null };
    if (!timer.current && !flight.current) timer.current = setTimeout(flush, Math.max(0, 100 - (Date.now() - lastSent.current)));
  };
  const changeLimitSpeed = limited => { discardUnsent(); antennaPolicy.current = { ...antennaPolicy.current, limited }; setLimitSpeed(limited); };
  const changeSpeedLimit = value => { discardUnsent(); antennaPolicy.current = { ...antennaPolicy.current, speed: value }; setSpeedLimit(value); };
  useEffect(() => {
    let disposed = false, pollTimer; const controller = new AbortController();
    const read = async path => { const r = await fetch(path, { signal: controller.signal }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Bridge unavailable.'); return d; };
    const poll = async () => {
      const pollGeneration = generation.current;
      const readStartedAt = performance.now();
      try { const d = await read('/api/status'); if (!disposed) {
        if (Number.isInteger(d.controlEpoch)) epoch.current = Math.max(epoch.current, d.controlEpoch);
        setStatus(d);
        setStatusReadAt(readStartedAt);
        if (!d.connected || (d.busy && (pending.current || flight.current))) clearQueue();
        if (pollGeneration === generation.current && !manualTarget.current && !pending.current && !flight.current && !actionFlight.current && !d.busy && !d.adjusting && Number.isFinite(d.antennas?.left) && Number.isFinite(d.antennas?.right)) {
          const pair = { left: Math.max(-90, Math.min(90, Math.round(d.antennas.left))), right: Math.max(-90, Math.min(90, Math.round(d.antennas.right))) };
          targetRef.current = pair; setTargets(pair);
        }
      } }
      catch (e) { if (!disposed) { setStatus(s => ({ ...s, connected: false, ready: false })); clearQueue(); setError(e.message); } }
      if (!disposed) pollTimer = setTimeout(poll, 750);
    };
    (async () => {
      try { const d = await read('/api/session'); if (disposed) return; token.current = d.token; epoch.current = d.controlEpoch || 0; antennaModes.current = d.antennaModes === true; setSession(d); }
      catch (e) { if (!disposed) setError(e.message); }
      await poll();
      try { const d = await read('/api/emotes'); if (!disposed) { setEmotes(d.emotes || []); setCatalogError(d.error || ''); } }
      catch (e) { if (!disposed) setCatalogError(e.message); }
    })();
    const suspend = () => { if (document.hidden) stopOnExit(); };
    const stopOnExit = () => { headQueueCancel.current?.(); clearQueue(); actionFlight.current?.abort(); actionFlight.current = null; setCommandPending(false); if (token.current) request({ action: 'stop' }, true).catch(() => {}); };
    document.addEventListener('visibilitychange', suspend); window.addEventListener('pagehide', stopOnExit);
    return () => { disposed = true; controller.abort(); actionFlight.current?.abort(); clearTimeout(pollTimer); clearQueue(); document.removeEventListener('visibilitychange', suspend); window.removeEventListener('pagehide', stopOnExit); };
  }, []);
  return { session, status, statusReadAt, emotes, error, catalogError, targets, command, commandPending, headQueueCancel, headStopReceipt, cancelAntennaQueue: discardUnsent, sendControl: request, stopRevision, setAngle, centre, limitSpeed, speedLimit, changeLimitSpeed, changeSpeedLimit, invalidSpeed: limitSpeed && (!Number.isFinite(speedLimit) || speedLimit < 5 || speedLimit > 120), disabled: !session || !status.connected || !status.ready || !!status.busy || commandPending };
}
