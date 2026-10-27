#!/usr/bin/env python3
"""Offline mathematical comparators; no robot, network, daemon, or serial imports.

Run: python benchmark.py --output ./results
Requires numpy and scipy. These deliberately simple comparators are NOT a
qualified controller and NOT implementations of Pollen, Ruckig, or rsruckig.
Units in scalar experiments are arbitrary; time is seconds. Polynomial derivatives
and extrema are analytic; critical-damping peaks are sampled. Boundary derivative jumps are reported separately, not hidden in
finite-difference maxima. Hardware execution and IK are outside this benchmark.
"""
from __future__ import annotations
import argparse, asyncio, csv, importlib.util, json, math, platform, sys, threading, time
from dataclasses import dataclass
from pathlib import Path
import numpy as np
import scipy
from numpy.polynomial import Polynomial
from scipy.spatial.transform import Rotation

@dataclass(frozen=True)
class State:
    p: float = 0.0
    v: float = 0.0
    a: float = 0.0

class Quintic:
    """Normalized-time Hermite quintic with analytic physical-time derivatives."""
    def __init__(self, start: State, finish: State, duration: float):
        values = (*vars(start).values(), *vars(finish).values(), duration)
        if not all(math.isfinite(x) for x in values) or duration <= 0:
            raise ValueError('Finite states and positive finite duration required')
        self.T = duration
        c = np.array([start.p, start.v * duration, start.a * duration**2 / 2, 0., 0., 0.])
        rhs = np.array([finish.p-c[:3].sum(), finish.v*duration-c[1]-2*c[2],
                        finish.a*duration**2-2*c[2]])
        c[3:] = np.linalg.solve(np.array([[1,1,1],[3,4,5],[6,12,20]],dtype=float),rhs)
        self.poly = Polynomial(c)
        self.derivatives = [self.poly.deriv(k)/duration**k for k in range(4)]
    def at(self, t: float) -> tuple[State,float]:
        if not math.isfinite(t) or t < -1e-10 or t > self.T+1e-10:
            raise ValueError('Sampling outside the defined segment is forbidden')
        u = min(1.,max(0.,t/self.T))
        p,v,a,j = [float(d(u)) for d in self.derivatives]
        return State(p,v,a),j
    def extrema(self, stop: float | None = None) -> dict[str,float]:
        """Endpoint + all real stationary points, not a sampled maximum."""
        hi = 1. if stop is None else min(1.,stop/self.T)
        out = {}
        for name,d in zip(('p','v','a','j'),self.derivatives):
            points = [0.,hi]
            points += [float(z.real) for z in d.deriv().roots()
                       if abs(z.imag)<1e-8 and 0 <= z.real <= hi]
            vals = [float(d(u)) for u in points]
            out['max_abs_'+name] = max(abs(x) for x in vals)
            if name == 'p': out.update(min_p=min(vals),max_p=max(vals))
        return out

def validate_segment(seg: Quintic, vmax=1., amax=3., jmax=30.) -> bool:
    ex = seg.extrema()
    return all(ex['max_abs_'+k] <= bound*(1+1e-8) for k,bound in
               [('v',vmax),('a',amax),('j',jmax)])

def choose_quintic(state: State, goal: State, horizon=.35) -> Quintic:
    """Bounded geometric duration search, NOT a completeness/time-optimality proof."""
    T = horizon
    for _ in range(28):
        seg = Quintic(state,goal,T)
        if validate_segment(seg): return seg
        T *= 1.17
        if T>8.: break
    raise ValueError('No verified duration in the bounded search')

def signal(name: str, t: float) -> tuple[float,float]:
    if name == 'step': return (0. if t<.5 else .6),0.
    if name == 'constant_velocity': return .3*t,.3
    if name == 'reversal': return (0. if t<.5 else (.6 if t<2. else -.6)),0.
    if name in ('chirp','noisy_irregular','timer_delay'):
        phase = 2*math.pi*(.15*t+.035*t*t)
        w = 2*math.pi*(.15+.07*t)
        return .25*math.sin(phase), .25*w*math.cos(phase)
    raise ValueError(name)

def run_case(name: str, method: str, seed=46) -> tuple[dict,list[dict]]:
    rng = np.random.default_rng(seed)
    state = State(); t=0.; last_j=0.
    peaks={'v':0.,'a':0.,'j':0.}; jumps={'v':0.,'a':0.,'j':0.}
    records=[]; costs=[]; failures=0; stalls=0; terminal=False
    # Time stops at 6 s; irregular runs use actual nonuniform timestamps.
    while t<6.-1e-10 and not terminal:
        dt=.02
        if name=='noisy_irregular': dt=float(np.clip(rng.lognormal(math.log(.025),.3),.012,.06))
        if name=='timer_delay' and t<2.<=t+dt:
            dt=.16; stalls+=1
        dt=min(dt,6.-t)
        raw,raw_v=signal(name,t)
        target=raw+(float(rng.normal(0,.01)) if name=='noisy_irregular' else 0.)
        clock=time.perf_counter_ns()
        previous=state
        start_j=0.
        if method=='capped_slew':
            # Diagnostic reproduction of only the nominal-step policy, not project code.
            step=float(np.clip(target-state.p,-min(dt,.02),min(dt,.02)))
            v=step/dt
            jumps['v']=max(jumps['v'],abs(v-state.v))
            state=State(state.p+step,v,0.)
            peaks['v']=max(peaks['v'],abs(v))
        elif method=='critical_damping':
            # Exact solution of p''+2*w*p'+w^2*(p-target)=0 for piecewise constant target.
            # No clipping. This comparator intentionally has NO a/j-limit guarantee.
            w=8.; x=state.p-target; b=state.v+w*x
            a_start=-2*w*state.v-w*w*x
            jumps['a']=max(jumps['a'],abs(a_start-state.a))
            tau=np.linspace(0,dt,33)
            exp=np.exp(-w*tau); xx=(x+b*tau)*exp; vv=(b-w*(x+b*tau))*exp
            aa=-2*w*vv-w*w*xx; jj=-2*w*aa-w*w*vv
            state=State(float(target+xx[-1]),float(vv[-1]),float(aa[-1]))
            start_j=float(jj[0]); last_j_new=float(jj[-1])
            for key,arr in [('v',vv),('a',aa),('j',jj)]: peaks[key]=max(peaks[key],float(np.max(np.abs(arr))))
            # Peaks here are sampled; label this explicitly in output.
        else:
            start=State(state.p,0.,0.) if method=='restart_quintic' else state
            target_v=raw_v if method=='carried_with_target_velocity' else 0.
            goal=State(target,target_v,0.)
            try:
                seg=choose_quintic(start,goal) if method=='bounded_duration_quintic' else Quintic(start,goal,.35)
            except ValueError:
                # No unbounded command is substituted; this run ends at solver failure.
                failures+=1; terminal=True; break
            if dt>seg.T: raise AssertionError('Test step must fit segment')
            jumps['v']=max(jumps['v'],abs(start.v-state.v))
            jumps['a']=max(jumps['a'],abs(start.a-state.a))
            _,start_j=seg.at(0)
            state,last_j_new=seg.at(dt)
            ex=seg.extrema(dt)
            for key in peaks: peaks[key]=max(peaks[key],ex['max_abs_'+key])
        if method!='capped_slew':
            jumps['j']=max(jumps['j'],abs(start_j-last_j)); last_j=last_j_new
        costs.append((time.perf_counter_ns()-clock)/1000.)
        t+=dt
        truth,_=signal(name,t)
        records.append(dict(case=name,method=method,t=t,dt=dt,source_target=raw,
                            target_used=target,target_at_output_time=truth,p=state.p,v=state.v,a=state.a))
    if not records: raise RuntimeError('No output samples')
    errors=np.array([r['p']-r['target_at_output_time'] for r in records])
    tail=np.array([r['target_at_output_time']-r['p'] for r in records if r['t']>=4.])
    # For a ramp, signed distance / ramp velocity is a useful steady lag, not general latency.
    lag=float(tail.mean()/.3) if name=='constant_velocity' and len(tail) else None
    maxv_jump=jumps['v']; maxa_jump=jumps['a']
    summary=dict(case=name,method=method,samples=len(records),rmse=float(np.sqrt(np.mean(errors**2))),
                 max_abs_error=float(np.max(np.abs(errors))),constant_velocity_equivalent_lag_s=lag,
                 segment_peak_velocity=peaks['v'],segment_peak_acceleration=peaks['a'],segment_peak_jerk=peaks['j'],
                 max_velocity_boundary_jump=maxv_jump,max_acceleration_boundary_jump=maxa_jump,
                 max_jerk_boundary_jump=jumps['j'],
                 observed_acceleration_within_limit_without_velocity_jump=False if maxv_jump>1e-8 else peaks['a']<=3.*(1+1e-8),
                 observed_jerk_within_limit_without_lower_derivative_jump=False if maxv_jump>1e-8 or maxa_jump>1e-8 else peaks['j']<=30.*(1+1e-8),
                 peak_method='33-point per segment sample' if method=='critical_damping' else 'analytic extrema / explicit boundary jumps',
                 calculation_median_us=float(np.median(costs)),calculation_p99_us=float(np.quantile(costs,.99)),
                 calculation_max_us=float(max(costs)),solver_failures=failures,injected_stalls=stalls,
                 endpoint_error=float(errors[-1]),domain='scalar mathematical reference, not actuator output')
    return summary,records

def skew(r: np.ndarray) -> np.ndarray:
    x,y,z=r
    return np.array([[0,-z,y],[z,0,-x],[-y,x,0]],float)

def right_jacobian(r: np.ndarray) -> np.ndarray:
    theta=float(np.linalg.norm(r)); K=skew(r)
    if theta<1e-5: return np.eye(3)-.5*K+K@K/6
    return np.eye(3)-(1-math.cos(theta))/theta**2*K+(theta-math.sin(theta))/theta**3*K@K

async def coroutine_lock_test() -> int:
    lock=threading.RLock(); depth=0; maximum=0
    async def work():
        nonlocal depth,maximum
        assert lock.acquire(blocking=False)
        depth+=1;maximum=max(maximum,depth)
        await asyncio.sleep(0)
        depth-=1;lock.release()
    await asyncio.gather(work(),work())
    return maximum

class IntentGate:
    """Ideal-clock protocol fixture; not a network implementation."""
    def __init__(self): self.epoch=1; self.seq=-1; self.source=-math.inf; self.armed=True; self.latest=None
    def accept(self,epoch,seq,source_time,received_time,target):
        if not self.armed or epoch!=self.epoch or seq<=self.seq: return False
        if source_time<=self.source or not 0<=received_time-source_time<=.25: return False
        self.seq=seq;self.source=source_time;self.latest=target
        return True
    def release(self):
        self.epoch+=1;self.armed=False;self.latest=None

def run_assertions() -> dict:
    first=Quintic(State(0,.4,.1),State(1,0,0),1.)
    s,j1=first.at(.3);second=Quintic(s,State(-.2,0,0),.7);s2,j2=second.at(0)
    assert np.allclose([s.p,s.v,s.a],[.2428275,1.375675,3.493],rtol=0,atol=1e-10)
    assert np.allclose(list(vars(s).values()),list(vars(s2).values()),atol=1e-12)
    assert abs(j1+13.53)<1e-8
    rest=Quintic(State(),State(1,0,0),1).extrema()
    assert np.allclose([rest['max_abs_v'],rest['max_abs_a'],rest['max_abs_j']], [15/8,10/math.sqrt(3),60])
    invalid=0
    for T in [0.,-1.,float('nan'),float('inf')]:
        try: Quintic(State(),State(1),T)
        except ValueError: invalid+=1
    assert invalid==4
    rejected_infeasible=False
    try: choose_quintic(State(0.,1.,.5), State(.2,0.,0.))
    except ValueError: rejected_infeasible=True
    assert rejected_infeasible, 'Outward acceleration at vmax is not viable under a finite jerk bound'
    gate=IntentGate()
    assert gate.accept(1,1,1.,1.05,1)
    assert not gate.accept(1,1,1.,1.10,1) # duplicate
    assert not gate.accept(1,2,1.,1.11,1) # new envelope around old sample
    assert not gate.accept(1,3,.9,1.12,2) # out of order source
    assert not gate.accept(1,4,1.1,1.5,2) # source stale
    gate.release(); assert gate.latest is None
    assert not gate.accept(1,5,1.6,1.61,2) # retired epoch
    assert not gate.accept(2,1,1.6,1.61,2) # reconnect not armed
    r=np.array([.5,.4,.3]);dr=np.array([.7,.2,.9]);h=1e-5
    omega=right_jacobian(r)@dr
    alpha=(right_jacobian(r+h*dr)-right_jacobian(r-h*dr))@dr/(2*h)
    Rminus=Rotation.from_rotvec(r-h*dr);Rplus=Rotation.from_rotvec(r+h*dr)
    omega_fd=(Rminus.inv()*Rplus).as_rotvec()/(2*h)
    assert np.linalg.norm(omega-omega_fd)<1e-6
    # Quaternion +/- equivalence and front-facing unwrap using a continuous source angle.
    q=Rotation.from_rotvec(r).as_quat()
    assert (Rotation.from_quat(q).inv()*Rotation.from_quat(-q)).magnitude()<1e-12
    angles=np.unwrap(np.radians([179.,-179.]));assert np.isclose(np.diff(angles)[0],math.radians(2))
    # This cannot remain within vmax even under maximal opposing jerk.
    v,a,jmax,vmax=.95,.5,1.,1.
    unavoidable_peak=v+a*a/(2*jmax)
    assert unavoidable_peak>vmax
    maxdepth=asyncio.run(coroutine_lock_test());assert maxdepth==2
    # Idealized queue experiment: 100 Hz producer / 50 Hz consumer with a 140 ms stall.
    fifo=[];latest=None;max_fifo=0;max_latest=0;fifo_old_after_release=0;epoch=1
    for k in range(101):
        now=k*.01
        if k==50: epoch=2;latest=None
        if k<50:
            fifo.append((1,k)); latest=(1,k)
        max_fifo=max(max_fifo,len(fifo));max_latest=max(max_latest,int(latest is not None))
        if k%2==0 and not 20<=k<34:
            if fifo:
                old=fifo.pop(0)
                fifo_old_after_release+=int(k>=50 and old[0]!=epoch)
            if latest is not None:
                assert latest[0]==epoch;latest=None
    return dict(checks_passed=True,scalar_handoff=dict(p=s.p,v=s.v,a=s.a,jerk_before=j1,jerk_after=j2),
        rest_to_rest_peaks=rest,explicit_invalid_duration_rejections=invalid,
        bounded_duration_search_rejects_infeasible_state=rejected_infeasible,
        rlock_same_thread_asyncio_maximum_depth=maxdepth,
        rotation_chart_example=dict(r=r.tolist(),r_dot=dr.tolist(),r_ddot=[0.,0.,0.],
            body_omega=omega.tolist(),body_angular_acceleration=alpha.tolist(),
            difference_between_r_dot_and_omega=float(np.linalg.norm(omega-dr)),
            angular_acceleration_norm=float(np.linalg.norm(alpha))),
        infeasible_braking_example=dict(v=v,a=a,max_jerk=jmax,max_velocity=vmax,unavoidable_peak_v=unavoidable_peak),
        queue_fixture=dict(producer_hz=100,consumer_hz=50,injected_stall_s=.14,max_fifo_depth=max_fifo,
                           max_latest_depth=max_latest,stale_fifo_writes_after_release=fifo_old_after_release,
                           latest_slot_stale_writes_after_release=0),
        protocol_fixture='duplicate, repackaged-old-sample, out-of-order, old-source, release and reconnect checks passed; ideal common clock ONLY')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=Path('results'))
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    results=[];records=[]
    for case in ['step','constant_velocity','reversal','chirp','noisy_irregular','timer_delay']:
        for method in ['capped_slew','restart_quintic','carried_quintic','carried_with_target_velocity','bounded_duration_quintic','critical_damping']:
            result,trace=run_case(case,method);results.append(result);records+=trace
    payload=dict(environment=dict(python=sys.version,platform=platform.platform(),numpy=np.__version__,scipy=scipy.__version__),
        scope='Original offline comparators only. No Pollen, Ruckig, rsruckig, IK, network or hardware execution.',
        ruckig_installed=importlib.util.find_spec('ruckig') is not None,
        limits=dict(velocity=1.,acceleration=3.,jerk=30.,units='arbitrary scalar units and seconds'),
        assertions=run_assertions(),experiments=results)
    (args.output/'results.json').write_text(json.dumps(payload,indent=2,allow_nan=False))
    with (args.output/'summary.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(results[0]));writer.writeheader();writer.writerows(results)
    with (args.output/'traces.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(records[0]));writer.writeheader();writer.writerows(records)
    print(json.dumps({'experiments':len(results),'samples':len(records),'assertions':payload['assertions']},indent=2))
if __name__=='__main__': main()
