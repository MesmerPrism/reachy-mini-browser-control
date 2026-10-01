import { useEffect, useRef, useState } from 'react';
import { createHeadManualQueue } from './head-manual-queue.mjs';

const AXES = ['yaw', 'pitch', 'roll', 'x', 'y', 'z'];
const DEFAULT_LIMITS = { yaw: 20, pitch: 15, roll: 15, x: 10, y: 10, z: 10 };
const limitsFor = session => Object.fromEntries(AXES.map(axis => {
  const declared = session?.headManualLimits?.[axis] ?? (['yaw', 'pitch'].includes(axis) ? session?.headTrackingLimits?.[axis] : undefined);
  return [axis, Number.isFinite(declared) ? Math.abs(declared) : DEFAULT_LIMITS[axis]];
}));

export function useHeadControl(control, onEngagementChange = () => {}) {
  const [targets, setTargets] = useState({ yaw: 0, pitch: 0, roll: 0, x: 0, y: 0, z: 0 });
  const [limitSpeed, setLimitSpeed] = useState(false);
  const [speedLimit, setSpeedLimit] = useState(20);
  const [linearSpeedLimit, setLinearSpeedLimit] = useState(10);
  const [error, setError] = useState('');
  const latest = useRef(control), targetRef = useRef(targets), callback = useRef(onEngagementChange);
  latest.current = control; callback.current = onEngagementChange;
  const policy = useRef({ limited: false, speed: 20, linearSpeed: 10 });
  const engaged = useRef(false), lastInput = useRef(-Infinity), lastAck = useRef(-Infinity), mounted = useRef(true);
  const queue = useRef(null);
  const limits = limitsFor(control.session);
  const getLimits = () => limitsFor(latest.current.session);
  const setEngaged = value => { if (engaged.current !== value) { engaged.current = value; callback.current(value); } };
  const canSend = () => {
    const c = latest.current, s = c.status;
    if (c.isCommandPending?.()) return false;
    return !document.hidden && c.session?.headManualPoseModes === true && c.session?.headTrackingMotion === true &&
      s.connected && s.ready && s.awake && !s.busy && !s.headTrackingActive &&
      !(s.adjusting && !s.headManualActive) && !c.commandPending && !c.disabled;
  };
  const resetMeasured = (angles, position) => {
    const measured = { ...angles, ...position }, pair = { ...targetRef.current };
    // A held measured pose can lie outside the selectable range. Keep the actual
    // hold target truthful; only new user requests are bounded by the controls.
    for (const axis of AXES) if (Number.isFinite(measured[axis])) pair[axis] = measured[axis];
    targetRef.current = pair; setTargets(pair);
  };
  if (!queue.current) queue.current = createHeadManualQueue({
    send: body => latest.current.sendControl(body), eligible: canSend,
    onAcknowledged: () => { lastAck.current = performance.now(); },
    onError: e => { lastAck.current = performance.now(); if (mounted.current) setError(e.message || 'Head command failed.'); },
  });
  const invalidAngularSpeed = limitSpeed && (!Number.isFinite(speedLimit) || speedLimit < 5 || speedLimit > 120);
  const invalidLinearSpeed = limitSpeed && (!Number.isFinite(linearSpeedLimit) || linearSpeedLimit < 1 || linearSpeedLimit > 50);
  const invalidSpeed = invalidAngularSpeed || invalidLinearSpeed;
  const disabled = control.session?.headManualPoseModes !== true || control.session?.headTrackingMotion !== true ||
    !control.status.connected || !control.status.ready || !control.status.awake || !!control.status.busy ||
    !!control.status.headTrackingActive || !!(control.status.adjusting && !control.status.headManualActive) || !!control.disabled || invalidSpeed;
  const submit = partial => {
    const p = policy.current;
    if (!canSend() || (p.limited && (!Number.isFinite(p.speed) || p.speed < 5 || p.speed > 120 ||
        !Number.isFinite(p.linearSpeed) || p.linearSpeed < 1 || p.linearSpeed > 50))) return false;
    if (!queue.current.enqueue({ ...partial, speedLimit: p.limited ? p.speed : null, linearSpeedLimit: p.limited ? p.linearSpeed : null })) return false;
    targetRef.current = { ...targetRef.current, ...partial }; setTargets(targetRef.current);
    lastInput.current = performance.now(); setEngaged(true); setError(''); return true;
  };
  const setAxis = (axis, value) => {
    if (!AXES.includes(axis) || !Number.isFinite(value)) return;
    const cap = getLimits()[axis];
    submit({ [axis]: Math.max(-cap, Math.min(cap, Math.round(value * 10) / 10)) });
  };
  const setPose = partial => {
    if (!partial || typeof partial !== 'object' || Array.isArray(partial)) return;
    const entries = Object.entries(partial);
    // Reject the whole gesture if malformed; never silently send half a pose.
    if (!entries.length || entries.some(([axis, value]) => !AXES.includes(axis) || !Number.isFinite(value))) return;
    const caps = getLimits();
    return submit(Object.fromEntries(entries.map(([axis, value]) => [axis, Math.max(-caps[axis], Math.min(caps[axis], Math.round(value * 10) / 10))])));
  };
  const centreRotation = () => submit({ yaw: 0, pitch: 0, roll: 0 });
  const centrePosition = () => submit({ x: 0, y: 0, z: 0 });
  const changeLimitSpeed = value => { queue.current.discard(); policy.current.limited = value; setLimitSpeed(value); };
  const changeSpeedLimit = value => { queue.current.discard(); policy.current.speed = value; setSpeedLimit(value); };
  const changeLinearSpeedLimit = value => { queue.current.discard(); policy.current.linearSpeed = value; setLinearSpeedLimit(value); };
  useEffect(() => { queue.current.discard(); }, [limits.yaw, limits.pitch, limits.roll, limits.x, limits.y, limits.z]);
  useEffect(() => {
    queue.current.discard(); setEngaged(false);
  }, [control.stopRevision]);
  useEffect(() => {
    if (!control.headQueueCancel) return;
    const cancel = () => { queue.current.discard(); setEngaged(false); };
    control.headQueueCancel.current = cancel;
    return () => { if (control.headQueueCancel.current === cancel) control.headQueueCancel.current = null; };
  }, [control.headQueueCancel]);
  useEffect(() => {
    if (control.headStopReceipt) {
      queue.current.discard(); setEngaged(false); resetMeasured(control.headStopReceipt.headAngles, control.headStopReceipt.headPositionMm);
      lastInput.current = -Infinity; lastAck.current = -Infinity;
    }
  }, [control.headStopReceipt?.revision]);
  useEffect(() => {
    const s = control.status;
    if (!s.connected || !s.ready || !s.awake || s.busy || s.headTrackingActive || (s.adjusting && !s.headManualActive) || control.session?.headManualPoseModes !== true || control.session?.headTrackingMotion !== true) {
      queue.current.discard(); setEngaged(false);
    }
    // A poll that began before a command acknowledgement cannot prove arrival.
    if (!queue.current.outstanding && !s.headManualActive && Number.isFinite(control.statusReadAt) &&
        control.statusReadAt > Math.max(lastInput.current, lastAck.current)) {
      resetMeasured(s.headAngles, s.headPositionMm); setEngaged(false);
    }
  }, [control.status, control.statusReadAt, control.session?.headManualPoseModes, control.session?.headTrackingMotion]);
  useEffect(() => {
    mounted.current = true;
    const hide = () => { if (document.hidden) { queue.current.discard(); setEngaged(false); } };
    const exit = () => { queue.current.discard(); setEngaged(false); };
    document.addEventListener('visibilitychange', hide); window.addEventListener('pagehide', exit);
    return () => { mounted.current = false; queue.current.discard(); setEngaged(false); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', exit); };
  }, []);
  return { targets, measured: { ...control.status.headAngles, ...control.status.headPositionMm }, disabled, optionsDisabled: control.session?.headManualPoseModes !== true || !control.status.connected || !control.status.ready ||
      !!control.status.busy || !!control.status.headTrackingActive || !!control.commandPending,
    limitSpeed, speedLimit, linearSpeedLimit, invalidSpeed, invalidAngularSpeed, invalidLinearSpeed,
    setAxis, setPose, centreRotation, centrePosition, changeLimitSpeed, changeSpeedLimit, changeLinearSpeedLimit, error, limits };
}
