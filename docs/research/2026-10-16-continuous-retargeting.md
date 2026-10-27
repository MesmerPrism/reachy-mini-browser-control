# Continuous online trajectory retargeting for Reachy Mini Wireless

> **Dated external research record — OTG-2026-10-16.** User-supplied ChatGPT Pro research, imported on 2026-10-16. “Verified,” “inspected,” “executed” and first-person statements below describe the report author's work. They do not establish independent project validation or current robot state. Recommendations and pseudocode are proposals, not operating instructions or authorization.
>
> Start with the [maintained research guide](README.md), which records project evidence, selected cross-checks, open decisions and qualification gaps. This record's dependency versions and issue states are historical.

> The accompanying [scalar benchmark](retargeting-benchmark/README.md) and recorded metrics are retained separately. Its software results do not qualify a trajectory library, kinematics, transport or physical robot.

**Original report SHA-256:** `09c46babc2f45341076a12c360c9f8a67df171bc1f49c1ce68896483f4601ed1`. The original is retained privately; this edition adds navigation and import context, normalizes Markdown mathematics, separates adjacent source citations and clarifies private-brief references. Findings and source IDs are preserved.

## Contents

- [Evidence conventions and scope](#evidence-conventions-and-scope)
- [A. Decision and smallest credible implementation](#a-decision-and-smallest-credible-implementation)
- [B. Verified pinned code map and corrections](#b-verified-pinned-code-map-and-corrections)
- [C. Literature synthesis and actual implementations](#c-literature-synthesis-and-actual-implementations)
- [D. Candidate comparison](#d-candidate-comparison)
- [E. Mathematical design](#e-mathematical-design)
- [F. Execution and data protocol](#f-execution-and-data-protocol)
- [G. Executed software benchmark and decisive validation](#g-executed-software-benchmark-and-decisive-validation)
- [H. Implementation steps, acceptance and falsification](#h-implementation-steps-acceptance-and-falsification)
- [Annotated primary-source catalog](#annotated-primary-source-catalog)

**Implementation-oriented research report — 16 October 2026**  
**Scope:** public source audit, primary literature, original offline mathematical experiments, and a proposed validation plan. No hardware was operated, no robot connection was attempted, and no physical observation was independently reproduced.

## Evidence conventions and scope

**Supplied** identifies observations and installation facts from the attached brief. **Verified source** means the identified public source was inspected. **Derived** denotes mathematics developed here. **Executed offline** refers only to the accompanying original benchmark. **Proposed** identifies a design or acceptance criterion that has not been admitted for physical control.

The admitted baseline remains daemon **1.10.0**, pinned at `7f54717586369155900eeeb43fd4bbbb62064f22`, AnalyticalKinematics/Rust kinematics **1.0.3**, and motor controller **1.5.6**, pinned at `dff1c536a75735a950564e18240d6a67b056819c`. The supplied project snapshot is **0.3.5**, `e36165bba32884e9fd01d10207b24e2fa097d726`; public main is evidence about public code, not an assertion about unobserved local changes. Daemon **1.11.0 is not admitted**. Hosted SDK/WebRTC behavior and phone/headset physical following remain separate qualification targets. The source catalog identifies exact inspected files and access depth.

### Supplied observations that motivate, but do not settle, the decision

On this same robot, the operator reported visually smooth Wake/Sleep, particularly Sleep's initial recenter, and uneven streamed motion. This is not a measured per-servo onset comparison. Sampled servo goal registers agreed with computed joint targets; internal position trajectories were within roughly two counts of goal while measured positions could be as much as 48 counts away. Low sampled PWM does not exclude transient saturation or identify friction, firmware or gain causes.

The supplied 99-attempt survey recorded seven full arrivals under its combined 1°/1 mm rule, all vertical trials/returns. A streamed identity/body-zero return after a +30° roll start retained 4.67° roll, 4.77° legacy combined angular error and 2.63 mm translation error. Sleep's apparent centering was not independently qualified: the final observer exceeded a native read cooldown and missed the center dwell. Extreme shell-contact cases and the +50 mm forward pressure-induced tilt are not admissible baseline motions.

Original sampled settings included operating mode 3, drive mode 0, P200 on the body/P300 on the six linkage channels, zero I/D/feedforward and zero Profile Acceleration/Velocity. Those are supplied diagnostic facts, not settings installed or independently read for this report. The last session's confirmed Sleep and disabled feedback are historical, not evidence of a present connection or permission to move. These observations keep static tracking error, dynamic shaping and delivery timing as separate hypotheses.

## A. Decision and smallest credible implementation

### Recommendation

**Build one persistent, transport-independent constrained-reference controller; do not launch or restart a `goto` for each input packet.** Its input is the latest *fresh intent*, its persistent state is the commanded trajectory's position, velocity and acceleration, and its output is one coordinated reference sample. Keep sensor filtering, trajectory generation, execution supervision and measured-arrival reporting separate.

For the algorithm, **qualify a state-to-state online trajectory generator with a Ruckig-shaped interface before extending Pollen's quintic into a general six-dimensional solver**. Upstream Ruckig Community is the first candidate to test, not an already-qualified dependency. It supports changing state-to-state targets locally without the commercial tracking interface. However, upstream explicitly documents unresolved Community numerical issues and recommends Pro for a maintained production codebase. The open numerical/crash report #255 makes that a concrete qualification requirement, not merely a commercial feature comparison. Pro must remain optional, not a mandatory service or hidden prerequisite. [R1], [R2], [R3]

**First host the controller and replay harness beside the existing Node bridge.** This is the smallest project change and permits deterministic comparison against the present ramp. A small C++ or Python process can expose the numerical engine to Node; no ROS installation is necessary. Keep the numerical engine behind a narrow interface so the same controller can later run in a robot-local helper. A native planner failure must not kill the separate execution guardian or silently release the last target indefinitely.

**Promote robot-local execution only if a matched PC/local comparison shows that the network/output cadence is the limiting factor.** A helper is a promising Wireless deployment because the browser can stream intent rather than actuator-rate samples. It is not automatically more accurate or real-time: loopback still feeds the same backend and native queue. A pure browser Worker or WASM build cannot repair downstream ownership, stale serial work or unknown application time.

There is an important limit to the word “robust”: **the stock pose-command path can support a bounded mathematical reference, but does not establish bounded physical motor derivatives, global exclusive ownership, or cancellation of already-enqueued commands.** Strict end-to-end stale-command retirement and atomic applied-state acknowledgement require a small daemon/native integration. Do not claim those guarantees for an optional helper that only changes where HTTP requests originate. [P3], [P4], [P5], [P6]

### What to reuse, extend, or replace

| Component | Reuse now | Required extension or replacement |
|---|---|---|
| Existing project bridge | Admission, identity/version checks, command epochs, unknown-outcome barriers, exact endpoint/arrival distinction, finite rigid-pose checks | Persistent derivative state; source-sample freshness; monotonic execution accounting; explicit planner result/error states |
| Pollen `GotoMove` and easing | Fixed-endpoint calibration/reference comparison; known front-path yaw convention | Not a continuously retargetable controller; no moving-state handoff or hard-limit selection |
| Pollen general `minimum_jerk` | Mathematical starting point and comparison oracle | Normalized coefficients, derivative outputs, full validation, extrema and feasibility checks, interruption/end-state policy, SO(3) treatment |
| Ruckig Community | Local state-to-state and velocity-interface candidate; MIT core | Version-pinned numerical qualification, independent output checks, process-failure supervision, external workspace/IK checks |
| Ruckig Pro | Optional maintained implementation and predictive tracking | Commercial access; still not a robot safety controller or Reachy-specific kinematic envelope |
| Robot-local helper | Optional intent receiver and planner using existing daemon only | Explicit exclusive session policy, bounded mailbox, version admission and read-load limits; no new serial controller |
| Backend/native integration | Existing serial ownership and kinematics | Atomic target snapshot, actual owner token, epoch/deadline-aware latest-command handling, application-stage acknowledgement |

**The minimum sufficient motion objective** is continuous position and velocity, bounded acceleration, and—if it produces a measurable benefit—continuous acceleration with bounded jerk. For the candidate OTG, choose the latter, C2 with bounded piecewise jerk, because it handles moving-state handoffs cleanly. Do not require continuous jerk, global time-optimality, a human-motion optimality criterion and exact Cartesian path preservation simultaneously. None of the inspected implementations establishes safety certification for this robot.

A small acceleration-limited governor remains a legitimate lower-complexity alternative if the physical comparison finds that jerk limiting adds lag without improving motion. The unbounded critically damped tracker and a low-pass filter alone are not substitutes for that governor.

## B. Verified pinned code map and corrections

### Call graph and clocks

```text
PC browser -> project Node controller -> HTTP /api/move/set_target
                                         |
                                         v
                         backend target pose/body/channel state
                                         |
                   robot backend nominally 50 Hz:
                   submit previously computed joint goals
                   -> cached native feedback / FK
                   -> tracking + speech aim composition
                   -> IK for changed task-space target
                                         |
                         Python native-loop bindings
                                         |
                    blocking_send -> 100-command FIFO
                                         |
             native worker: command handling OR feedback-read tick
                                         |
            Stewart six-motor group write; body yaw separate
                                         |
                   motor firmware -> physical mechanism

HTTP /api/move/goto -> router task UUID -> backend.goto_target
    -> GotoMove(measured start, fixed goal, duration)
    -> play_move(nominal 100 Hz, wall-clock elapsed time)
    -> the same target/IK/native pipeline

Hosted browser -> JS SDK / WebRTC -> backend command dispatch
    -> separate task/acknowledgement mechanisms; not HTTP task ownership
```

This map is an inspected-source description, not a measured execution trace. The backend's order creates a pipeline stage: a newly calculated IK result is ordinarily submitted on a later backend iteration. A 100 Hz animation loop therefore does not imply 100 independently applied physical samples per second. Queue capacity is **100 motor commands**, not 100 coordinated full-pose frames. [P3], [P4], [P5], [P6]

### B1. Two interpolation mechanisms really are separate

In `utils/interpolation.py`, `time_trajectory` supplies the scalar easing, including

$$
s(u)=10u^3-15u^4+6u^5.
$$

`linear_pose_interpolation` blends translation and a rigid rotation path. Its `yaw_as_scalar=True` branch extracts signed yaw, interpolates that scalar and a residual rotation, then recomposes. This deliberately differs from blindly taking the shortest quaternion route across the back of the robot. [P1]

The separate `minimum_jerk` utility solves a quintic from endpoint position, velocity and acceleration. It returns only a position closure, with a constant goal returned after the duration. That continuation is inconsistent with nonzero requested terminal velocity or acceleration. It has no general positive-finite-duration/input validation or limit selection. Zero duration leads to a singular solve; negative duration is not explicitly rejected. For negative time the closure extrapolates rather than providing an explicit interval guard. A normalized-time reimplementation should reject nonfinite inputs and define its interval explicitly. [P1]

`GotoMove.evaluate` uses the scalar-easing/pose-interpolation path, **not** that general boundary-state quintic. The common progress parameter coordinates head pose, antennas and body yaw for a fixed move. It does not accept current linear/angular velocity and acceleration. Repeatedly constructing a new `GotoMove` cannot preserve arbitrary moving-state derivatives merely because each individual move is labelled minimum jerk. [P2]

### B2. Validation and omitted channels differ by entry point

A correction to an overly broad reading of the brief: **the high-level Python `ReachyMini.goto_target` does check `duration <= 0`**, while the backend `goto_target`/`GotoMove` path does not provide equivalent explicit validation. That Python comparison is still not a complete finite-number check: NaN is not less than or equal to zero. The high-level method sends a `GotoTaskRequest` and waits for completion; it is not the HTTP router's exact implementation. [P7]

The high-level and backend `goto_target` default `body_yaw` to zero. Callers that mean “leave it unchanged” must deliberately pass the documented preservation value, rather than allowing a convenience default to recenter an omitted channel. The new controller should carry an explicit owned-channel mask; disabling a degree of freedom in a numerical library is not equivalent to relinquishing ownership of a robot channel. [P3], [P7], [R1]

### B3. Playback endpoint, interruption and completion

Pinned `play_move` uses `time.time()` and asynchronous sleeps. It loops while elapsed time is less than the duration and has **no explicit successful final `evaluate(duration)` submission**. There are also separate wall-clock reads for the condition and evaluation. This deserves an endpoint/clock regression test. It does not establish the cause or magnitude of the supplied static error. [P3]

For scale, **derived** for a rest-to-rest quintic: sampling a one-second move at 0.99 seconds leaves only about `9.85e-6` of its scalar displacement. That illustration is not a bound on the actual robot loop, nor an explanation for several degrees of measured residual error. Different durations, skipped ticks, kinematics and physical tracking matter.

A correct successful completion explicitly emits the exact zero-derivative terminal state once and changes to a hold state. Cancellation must *not* flush the retired destination. Nonzero terminal derivatives require an explicit extension/replanning policy; they cannot be followed by a constant-position hold while pretending those derivatives remain valid.

HTTP cancellation cancels a router-owned task; backend `stop_move` sets a flag polled by playback and can cancel the active uploaded-move token. A positive Stop acknowledgement precedes the loop's actual exit. Neither mechanism, by itself, is a physical deceleration or a serial-queue purge. Some wrappers send completed status after the coroutine returns even though a Stop caused an ordinary early return. [P3], [P4]

### B4. Ownership is not a task mutex

`_try_start_move` acquires a `threading.RLock` nonblocking and increments `_active_move_depth`; `_end_move` reverses those operations. Two asyncio tasks on the same thread can reenter the same lock. The supplied inert counterexample is consistent with these methods. The accompanying independent minimal Python fixture also reaches depth two, but it is **not** a reproduction of the daemon or its transport threads. [P3]

Do not replace the lock blindly with a non-reentrant thread lock. Nested playback—for example an initial goto before a recorded move—has legitimate ownership continuity. The appropriate replacement is a short atomic acquisition of an **explicit owner/session token**, with internal nested calls inheriting that token and unrelated requests rejected. Do not hold a thread lock across an `await`. A process-local helper cannot impose this rule on unrelated clients that bypass it.

### B5. Acknowledgements and transport boundaries

HTTP `/api/move/set_target` carries no duration and can return `ignored/move_running`; `/api/move/goto` creates a task UUID. In the pinned HTTP goto route, the request's interpolation selection is not forwarded to the backend. **Do not generalize that omission to every Python/typed-task entry point.** [P4], [P7]

The streaming acknowledgement defect is specifically the **`/ws/set_target` route**: it calls the target-setting function but discards its normal success/ignored result, sending exceptions instead. It is not accurate to say the ordinary HTTP set-target response is always discarded. Legacy command branches can also report an “ok” status after suppressing a target while playback owns motion. [P3], [P4]

The HTTP `move_tasks` collection is a registry of that router's tasks, not a cross-transport ownership registry. The inspected peer-disconnect hook cancels log subscriptions; it does not implement this project's complete motion-release contract. Hosted send success, HTTP acceptance, playback completion, IK output, native enqueue, bus write and measured arrival must remain different stages. [P3], [P4]

### B6. Native scheduling is part of the problem

The bindings enqueue ordinary commands using `blocking_send`; there is no source timestamp, command epoch, deadline or latest-target replacement in that path. The native loop selects a queued command or a feedback-read tick. A successful enqueue is not a per-command bus-application acknowledgement. Queueing and serial-read delays remain possible even when input has been beautifully smoothed. [P5], [P6]

The six linkage goals use one group write, with body yaw separate. A whole-nine-motor write function also exists in the controller, but that does not mean the ordinary backend uses it. Group transmission does not guarantee identical actuator onset or tracking response. A future atomic snapshot and appropriate batching can improve consistency without inventing physical simultaneity. [P5], [P6]

Another important distinction: native-loop shutdown drains and executes pending commands before exiting. **Closing that controller is not a stale-command-purge primitive.** A helper must never create a second low-level controller; the inspected construction path includes serial ownership and initialization/reboot behavior. [P5]

`rustypot` converts between radians and 4096-count revolutions; the inspected float-to-integer conversion truncates. One count is approximately **0.087890625 degrees**. At sufficiently small joint increments, a smooth continuous reference becomes repeated integer goals followed by a count change. Do not identify first differences of those registers with the analytic reference velocity, or their third differences with physical jerk. No dithering, gain change, profile change or protection change is recommended here. [P8]

### B7. Sleep has an additional experimental confound

Backend `goto_sleep` first invokes `_quiesce_aim_sources`: wobbling is disabled, speech offsets are zeroed and head tracking is disabled. That is a concrete reason to match aim-source policy in the proposed comparison. Otherwise the PC stream and Sleep trajectory may not even control the same effective target. This is an **unresolved explanatory hypothesis**, not evidence that these sources were active in the supplied session. [P3]

High-level Python Wake/Sleep are also not identical implementations of the backend routines. Record the exact entry point used in every comparison instead of treating a method name as a complete motion specification. [P3], [P7]

### B8. Public bridge and newer upstream

The inspected public manual-head worker confirms the supplied architecture: one awaited write, nominal 20 ms increments, a common factor across Euler-angle and translation distances, exact endpoint submission, then a separately fresh measured-arrival check. It has no acceleration/jerk state. Its rate cap deliberately slows progress when requests take longer; simply substituting elapsed wall time changes that policy and is not automatically safer. [U1], [U2]

A metric correction: the inspected public `manualHeadDistance` uses the Euclidean norm of XYZ Euler-angle differences, not the SO(3) geodesic angle. Preserve that legacy result when reporting the existing survey, but add a correctly named geodesic error for new experiments. Do not silently reinterpret old “combined angular error” values. Public head-following and manual-head loops also have different pacing details; the former includes an additional post-write sleep. [U1], [U2]

Newer default-branch source was inspected at `6f656a1d8cae2728bdb6c3e17a8cf8ac4f695482`. GitHub reports it **diverged** from the supplied pin: 44 commits ahead and two behind, with merge base `70a7c0b12779d5bf5ee17568221f0cab6b2eda4d`. It is not a simple admitted successor. The sampled newer playback still uses the wall-clock loop without a final endpoint flush. The comparison contains a new rotation utility/import changes, but that is not evidence of a continuous-retargeting solver or repaired global ownership. No verified newer change removes the qualification work described here. [P9]

Pollen's inspected code is **Apache-2.0**, not MIT merely because the integrating project is MIT. Retain applicable third-party license/notice information for copied code and identify modifications. This report is a technical dependency assessment, not a complete legal review. [P10]

## C. Literature synthesis and actual implementations

### C1. Which problem is being solved?

| Formulation | Its actual question | What it does not supply |
|---|---|---|
| Fixed-endpoint interpolation | How should a known start and endpoint be traversed over a chosen time? | Arbitrary moving-state handoff, feasible duration or live-source semantics |
| State-to-state OTG | From the current p/v/a, what admissible trajectory reaches a new target state? | Knowledge of the target's future motion, collision geometry or network deadlines |
| Continuous signal tracking | How can the output follow a changing reference with low lag under constraints? | A guarantee that an arbitrary human signal is physically followable |
| Trajectory blending/path following | How can successive segments be joined while retaining a path or contour? | Zero latency when future segments are unknown or obsolete |
| Input filtering/reference shaping | How should noise and undesirable input dynamics be attenuated? | A complete executable trajectory or downstream application guarantee |
| Networked execution | Which reference is fresh, authorized and due to be applied now? | Smoothness merely because packets carry smoothly varying numbers |

**Flash and Hogan (1985), “The coordination of arm movements: an experimentally confirmed mathematical model,” Journal of Neuroscience 5(7), 1688–1703, DOI 10.1523/JNEUROSCI.05-07-01688.1985.** The inspected metadata/abstract support minimum integrated squared jerk as a movement-model foundation. They do not make a chosen quintic satisfy arbitrary peak constraints, or prove that the cost function solves this robot's static or networking problems. Full article text was not relied upon here. [L1]

**Kröger and Wahl (2010), “Online Trajectory Generation: Basic Concepts for Instantaneous Reactions to Unforeseen Events,” IEEE Transactions on Robotics 26(1), 94–111, DOI 10.1109/TRO.2009.2035744.** The full paper gives the key control-loop formulation: react from the actual current motion state and synchronize multiple degrees of freedom. The implementation lineage distinguishes acceleration-limited Reflexxes Type II from jerk-limited types; “Reflexxes” is not one interchangeable capability. The public Type II repository has an inspected LGPL-3.0 license header, whereas Type IV is the historical proprietary jerk-limited variant. Official product pages were intermittently inaccessible. It is useful conceptual lineage, not the first dependency choice for this Windows/ARM project. [L2], [L3]

**Berscheid and Kröger (2021), “Jerk-limited Real-time Trajectory Generation with Arbitrary Target States,” Robotics: Science and Systems XVII, DOI 10.15607/RSS.2021.XVII.015.** Full paper and benchmark table inspected. It constructs synchronized state-to-state trajectories with component velocity, acceleration and jerk limits and nonzero endpoint derivatives. Its piecewise-constant jerk gives C2 position, not continuous jerk. For seven degrees of freedom, the paper reports **19.8 ± 0.2 microseconds mean and 123 ± 13 microseconds worst calculation time** on a single-threaded Intel i7-8700K/PREEMPT-Linux setup. That is a published algorithm benchmark, not an ARM64 Python/IK/HTTP/serial measurement. [L4]

### C2. Ruckig feature boundaries and qualification

The inspected public release is **0.19.4**, published 15 July 2026. Current hosted documentation displays a different banner, **0.19.7**; do not silently treat that as the installed Community release. State-to-state generation is local in the MIT C++ core and Python binding. The dedicated predictive `Trackig` interface is **Pro-only**. Community intermediate-waypoint use can call a cloud API; leave that functionality disabled for a local-only controller. Built-in position-limit functionality is also not something to assume is present in the Community feature set. [R1], [R2], [R4]

The maintainer's 6 April 2026 response to issue #255 confirms a reported numerical failure is fixed in Pro and characterizes Community as the academic endpoint. The issue remained open when inspected; references to third-party fixes are not evidence that the public release contains them. Consequently, qualification should include exact reported inputs and nearby floating-point perturbations, sanitizers for the native build, a separate watchdog, and failure-code rejection. Do not convert a solver error into raw unbounded output. [R3]

Examples to start from are `examples/01_position.cpp`, `examples/05_velocity.cpp` and the official examples index; check paths against the chosen release. The README's predictive tracking example and the hosted tracking example have differed in numbering. Copying its class name into Community code will not make Pro functionality available. `calculate` plus trajectory sampling and `update`/`pass_to_input` are distinct interfaces; version-test whichever is wrapped. [R1], [R2]

The inspected `examples/05_velocity.cpp` configures acceleration and jerk limits without a maximum-velocity setting. Do not transfer the position-interface bound contract uncritically to velocity mode: a joystick adapter still needs explicit velocity, workspace and stopping-envelope supervision. Require current- and target-state validation, finite outputs and explicit result-code handling in the wrapper; no successful numerical call is itself a workspace check. [R7]

The inspected PyPI 0.19.4 files include Windows and Linux x86-64 Python 3.12 wheels, but no Linux `aarch64` entry. An ARM64 helper therefore needs a reproducible source build or a separately verified wheel, not an assumption that the Windows installation procedure transfers unchanged. C++ portability is not evidence that this complete helper has been built or timed on the CM4. [R4]

### C3. rsruckig is independently implemented

The Rust port's source explicitly describes its own position limits, `Trackig` and local waypoint solver. Its tracking implementation recalculates toward the **instantaneous, clamped target state**; it is not upstream's proprietary predictive interface. It can retain the last successful trajectory after a numerical failure. That behavior needs an application-level veto on release, epoch changes, changed constraints or stale input. [R5], [R6]

The examined code clamps sampling to a short trajectory's endpoint; a fallback may continue until exhaustion. Endpoint position, returned derivative state and elapsed application time must therefore be checked together, especially for nonzero terminal derivatives. A constant-position hold with nonzero advertised velocity is not a consistent continuation. Tests for tracking, allocation, position limits and waypoints exist, but this investigation did not run them, prove equivalence to upstream, or establish ARM worst-case timing. The workspace's `panic = 'abort'` also argues against putting the only safety guardian in the same process. MIT licensing and Rust/`no_std` options make it attractive for a future reusable component, not automatically the lower-risk first choice. [R5], [R6]

### C4. Orientation-aware and path-aware work

**Huber and Wollherr, “An Online Trajectory Generator on SE(3) for Human–Robot Collaboration,” Robotica 38(10), 1756–1777 (2020), DOI 10.1017/S0263574719001619**, published online in 2019. The author-uploaded full-text HTML was read; the TUM PDF was inaccessible. The method treats orientation dynamics directly and constrains linear/angular velocity and acceleration norms, using an orientation integration treatment rather than equating Euler rates with angular velocity. Its proposed jerk extension is future work. It is a strong formulation reference, not a ready-made jerk-limited Reachy package; no maintained author implementation was established. [L5]

**Lange and Albu-Schäffer, “Path-Accurate Online Trajectory Generation for Jerk-Limited Industrial Robots,” IEEE Robotics and Automation Letters 1(1), 82–89 (2016), DOI 10.1109/LRA.2015.2506899.** DLR metadata/abstract and the citation trail were inspected; repeated manuscript retrieval attempts failed. It is relevant to the tension between path fidelity and responsiveness, but detailed algorithm or timing claims are not made from the abstract. Do not transfer a serial industrial-arm result directly to a parallel linkage or confuse it with the authors' separate iterative path-accurate paper. [L6]

**SciPy `RotationSpline`** is a useful code reference for orientation interpolation with continuous angular rate and acceleration. It operates on known orientation knots; it does not supply a hard-limit online controller accepting this project's live boundary-state and freshness contract. Its name is not a solution to retargeting. [L7]

### C5. Filtering and concrete servo implementations

**Casiez, Roussel and Vogel, “1€ Filter: A Simple Speed-Based Low-Pass Filter for Noisy Input in Interactive Systems,” CHI 2012, 2527–2530, DOI 10.1145/2207676.2208639.** The author page and implementation collection expose an adaptive cutoff based on filtered signal speed. Apply it with real source-sample intervals, not fabricated 50 Hz timestamps. Choose the implementation's actual license: author-listed C and templated C++ variants are MIT, while several Python/JavaScript/TypeScript variants are BSD. Filtering reduces noise with a lag tradeoff; it does not establish acceleration or jerk limits. [L8]

**MoveIt Servo** supplies useful concrete contrasts, not a reason to add ROS. Its documentation discusses Butterworth, acceleration-limited and Ruckig smoothing and acknowledges path/overshoot tradeoffs. The inspected Ruckig plugin uses phase synchronization, carries its previous output, and estimates target velocity from the *commanded current state*, not the phone's true future velocity. More importantly, it accepts a synchronization error as usable and returns success without replacing the raw input for some other errors. Those are implementation-specific failure semantics that should **not** be copied into this project's guarded controller. The acceleration plugin uses an OSQP-based directional scaling formulation; it is not a jerk-limited SO(3) solver. Relevant files carry BSD-style license headers. [M1], [M2], [M3]

### C6. Actual Reachy examples and their evidential limits

Pollen's conversation app has a real `MovementManager` with one worker, monotonic timing and a nominal 100 Hz output policy. It receives cross-thread commands and coordinates sequential moves. Its queueing, idle breathing and tracking behavior are application choices, not this project's latest-intent/deadman policy. It is useful evidence that a persistent higher-level owner fits the SDK; its nominal rate is not measured Wireless actuator latency. [E1]

Pinned daemon face tracking is another actual local latest-aim pattern, but its fixed interpolation factor and loss/recenter policy do not provide the requested derivative or release guarantees. [P3]

Marionette's inspected design/handoff material concerns manual pose recording and later playback. Its approximately 93 Hz capture claim is not a demonstrated 93 Hz physical tracking loop. WebRTC availability and visually smooth playback do not qualify unpredictable phone/headset retargets. The inspected material did not establish a Mini Wireless phone/headset example with measured input-to-motion latency plus velocity/acceleration/jerk compliance. That is a limitation of the evidence located, not a claim that no such implementation exists anywhere. [E2]

## D. Candidate comparison

All “bounds” below apply to the specified mathematical reference and assumptions. **None is a certified physical safety guarantee.** Costs not actually measured on the target platform are explicitly described as expectations.

| Approach | Responsiveness / noise / overshoot | V/A/J and continuity | Path, orientation and changing targets | Cost, implementation and evidence |
|---|---|---|---|---|
| Present capped slew | Low algorithmic lag; follows noise; arrival pacing varies with HTTP | V cap in the selected coordinate metric; no finite acceleration at velocity jumps | Common factor coordinates a Euclidean segment; Euler metric is not angular velocity; retargets supported without derivative state | Very small JS; original scalar comparator measured; stock-daemon compatible |
| Restarted rest-to-rest easing | Repeated ease-in can become extremely sluggish; does not solve source noise | Individual segment properties do not survive repeated derivative resets | New direction/start every packet; no arbitrary C2 handoff | Tiny reuse, but unsuitable live formulation; Apache-2.0 Pollen code |
| Carried quintic, fixed duration | More responsive; potentially large peaks and overshoot | C2 if carried correctly; no selected V/A/J guarantee | Cartesian chart only unless geometric mapping is handled; common duration is not common phase | Small polynomial kernel; original benchmark exposes limit violations |
| Carried quintic, checked duration | Responsiveness depends strongly on horizon search; noise still reaches target | Verified polynomial extrema for accepted segments; bounded search can fail or miss feasible durations | Must inspect position excursion, SO(3) mapping and IK; not globally time-optimal | Small kernel but substantial controller/validation code; original benchmark shows added lag |
| Ruckig Community state-to-state | Good candidate for fast constrained pursuit; zero terminal velocity can lag moving signals | Component V/A/J, C2 under valid inputs and successful solution; implementation caveats | Time/phase options; not SO(3), collision or arbitrary-signal prediction | MIT C++/Python; published microsecond benchmark; known numerical issues; ARM build/test required |
| Ruckig Pro tracking | Prediction can reduce moving-signal lag; unexpected reversal remains unknowable | Constrained predictive tracking as documented; still requires external supervision | Not a universal task-space/parallel-linkage planner | Commercial/local option; not benchmarked here; not a mandatory dependency |
| rsruckig | Instantaneous-target pursuit; optional filtering and fallback | Independently implemented component bounds/features; numerical and failure behavior need qualification | Local waypoint/position-limit claims; fallback must obey external epoch; not upstream Pro tracking | MIT Rust, allocation/no-std options; no ARM or independent equivalence test here |
| Critically damped tracker | Smooth-looking response to fixed steps; moving-state reversals can overshoot | Unclamped version has no hard V/A/J guarantee; target steps can jump acceleration | Per-axis design can distort path; geometric version needs proper rotation dynamics | Very small JS/Rust; exact scalar dynamics measured here, peaks sampled |
| Acceleration-limited governor | Can be more responsive than conservative jerk shaping; braking requires state | V/A only if a viability-aware formulation enforces both; usually C1 rather than C2 | Shared directional scaling possible; cannot instantly follow a new direction | Small analytic implementation possible; MoveIt example uses OSQP, not required here |
| One Euro / low-pass alone | Noise/lag tradeoff; changing targets accepted | No executable V/A/J guarantee | Filter a consistent chart or manifold, not raw matrix entries | Tiny, browser/ARM-friendly expectation; MIT/BSD implementations; combine with OTG |
| Short interpolation buffer | Masks modest arrival jitter by adding explicit delay; loss requires bounded braking | Depends on segment construction and expiry; interpolated endpoints can overshoot | Requires compatible boundary derivatives and source time; obsolete history must be discardable | Small additional mechanism; start with no buffer and compare 1–2 output periods offline |
| SE(3) OTG / joint-space OTG + envelope | Proper geometry or direct motor-coordinate bounds; more modeling work | Depends on formulation; Huber/Wollherr is not jerk-limited | Best route when strict physical-coordinate constraints dominate; FK/IK branch and clearance still essential | Not the smallest first integration; no robot-specific implementation verified here |

## E. Mathematical design

### E1. Input semantics, state and units

**Proposed initial scope:** orientation following at a clearly contact-free nominal head height, fixed body yaw, and no antenna ownership. Translation is represented but enabled only after its envelope and linkage implications have passed offline and attended checks. This is a scope reduction, not a new claim about safe hardware ranges.

Use metres, seconds and radians internally, converting legacy UI degrees/millimetres only at the interface. Positive rotations are right-handed in the declared daemon frame, not the phone's uncalibrated Euler axes. Let `W` be the admitted robot/world frame and let `R_*` be a fixed reference orientation established at explicit engagement. For the initial bounded front-facing workspace, define

$$
x=(p_W,r,b),\qquad R=R_*\exp([r]_\times),\qquad z=(x,\dot x,\ddot x).
$$

Here `p_W` is translation, `r` is a three-component rotation-vector chart, and `b` is body yaw if explicitly owned. Keep this chart fixed through normal retargets. Changing the chart's origin every packet and copying derivative numbers is not a valid state transform.

An absolute phone/headset orientation goal is usually the intuitive input for direct following: establish a neutral device pose and an explicit calibrated device-to-robot mapping. A joystick is naturally a bounded velocity/twist intent. Do not conflate “phone turned to 10 degrees” with “continue turning at 10 degrees per second.” Recenter changes the coordinate-reference identifier and retires the old stream; it is not an unannounced target jump.

On quaternion input, choose a sign consistent with the preceding sample, validate normalization/finite values, and resolve the intended yaw branch before limiting the command. `q` and `-q` represent the same orientation. A shortest-path wrap is not permission to rotate through a forbidden rear workspace. Reject or continuously govern targets outside the admitted chart, leaving braking room inside the actual envelope.

### E2. Input derivatives and prediction

Estimate device angular velocity from timestamped relative rotations, transport it into one declared frame, and filter the estimate. Do not finite-difference raw noisy Euler angles or assume each network packet corresponds to a newly sampled orientation. Initially use target acceleration zero unless a validated estimator justifies more.

Begin with **position pursuit and zero terminal derivatives** as the transparent baseline. It is not zero-lag tracking. A velocity estimate can later supply bounded feedforward or a short-horizon predicted endpoint, but its timestamp must match that endpoint:

$$
p_d(t+h)\approx p_d(t)+h\hat v_d(t),
$$

with the analogous exponential-map orientation prediction. Cap the horizon, estimated speed and predicted displacement; shrink prediction to zero when source-time uncertainty or packet age consumes the budget. A predictive target must remain inside the same workspace and stopping envelope.

A subtle failure is to request the **present** target position with its nonzero velocity as the terminal state of a trajectory ending at a **future** time. That can increase lag rather than remove it. The original benchmark demonstrates this with constant-velocity input. It is not an implementation of Ruckig Pro or evidence against properly time-aligned predictive tracking.

### E3. Quintic comparator and duration feasibility

For a normalized-time quintic

$$
x(u)=c_0+c_1u+c_2u^2+c_3u^3+c_4u^4+c_5u^5,\quad u=t/T,
$$

set `c0=x0`, `c1=T v0`, `c2=T² a0/2` and solve the constant 3×3 boundary system for the last coefficients. Derivatives in physical time divide the kth normalized derivative by `T^k`. This avoids unnecessarily solving a differently scaled time-power matrix at every duration.

For a scalar rest-to-rest move, the **derived** exact peak bounds are

$$
V_{peak}=\frac{15|D|}{8T},\qquad
A_{peak}=\frac{10|D|}{\sqrt3T^2},\qquad
J_{peak}=\frac{60|D|}{T^3}.
$$

Therefore

$$
T\ge\max\left(\frac{15|D|}{8V_{max}},
\sqrt{\frac{10|D|}{\sqrt3A_{max}}},
\sqrt[3]{\frac{60|D|}{J_{max}}}\right).
$$

For multiple channels, take the maximum over their applicable constraints. This formula is **not valid for arbitrary nonzero boundary states**, and independently bounding rotation-chart coordinates does not establish the requested angular or motor bounds.

For a general quintic, check endpoints and every real stationary point within the segment. Velocity extrema use roots of acceleration; acceleration extrema use roots of jerk; jerk extrema use roots of snap. Also inspect position extrema for overshoot. Vector-norm constraints require extrema of the corresponding squared norm, not just six independent scalar checks.

A bounded duration search with all those checks is a useful comparator. It is not a complete solver: feasibility need not be monotonic in duration when initial derivatives are nonzero, and longer durations can create unwanted excursions. Do not silently clip the failed output or assume binary search must find a solution. Use explicit failure and a separately verified braking policy.

### E4. Correct angular derivatives

A fixed-endpoint SLERP is rotation about one fixed relative axis. When a retarget changes that axis, its tangent direction changes. No choice of a single new scalar speed can preserve an arbitrary old angular-velocity vector if that vector is not parallel to the new tangent.

For the fixed chart above, use the **left Jacobian** of SO(3), with `K=[r]×`, `theta=||r||`:

$$
J_l(r)=I+\frac{1-\cos\theta}{\theta^2}K
       +\frac{\theta-\sin\theta}{\theta^3}K^2.
$$

Use stable series near zero. With world-frame angular derivatives and constant `R_*`,

$$
\omega_W=R_*J_l(r)\dot r,
$$
$$
\alpha_W=R_*\{J_l(r)\ddot r+\dot J_l(r)\dot r\},
$$
$$
\dot\alpha_W=R_*\{J_l(r)r^{(3)}+2\dot J_l(r)\ddot r+\ddot J_l(r)\dot r\}.
$$

The equivalent body-angular-velocity formula uses the right Jacobian. Do not mix body and world derivative components without their transport terms. A quaternion normalization step after an arbitrary polynomial does not establish these derivative limits.

**Practical simplification:** keep a small fixed chart away from its singular branch and bound the mapped angular quantities with conservative margins. For a genuine guarantee over the continuum, derive conservative Jacobian/derivative bounds on that compact domain or use certified interval bounds. Dense sampling is a useful validation screen, not a proof. A larger orientation workspace should trigger a deliberate geometric-controller upgrade rather than a silent chart reset.

### E5. Synchronization and the parallel linkage

Time synchronization means channels finish together. Phase synchronization means they share progress along a particular coordinate-space path. Independent filtering can change both timing and path. Under a new target direction, preserving the old velocity while instantly joining a new straight line is generally impossible: a controller must curve, brake or temporarily deviate. An exact path requirement takes priority only when the task actually needs it.

Let motor coordinates be

$$
q=f(x)=IK(p_W,R,b).
$$

For a continuously selected, differentiable IK branch,

$$
\dot q=J\dot x,\quad
\ddot q=J\ddot x+\dot J\dot x,\quad
q^{(3)}=Jx^{(3)}+2\dot J\ddot x+\ddot J\dot x.
$$

Thus even perfect component limits on `x` do not automatically limit each linkage motor. Check branch continuity, conditioning, joint limits, FK consistency and a contact-free task-space envelope. A valid isolated IK solution is not a swept-volume or shell-clearance certificate.

For the initial stock-daemon candidate, use the **same pinned kinematic model offline** to qualify a conservative compact workspace and derivative margins. Do not claim exact joint bounds until that model check exists. If strict joint-coordinate derivative enforcement becomes the requirement, put the OTG in joint space after continuous IK selection, check its entire FK path and stopping envelope, and integrate through an admitted joint-target path. Sending FK poses back through an unrelated IK solve is not proof that the same joint branch will be followed.

### E6. Reversal, infeasible states and braking room

For a scalar state moving toward the upper velocity bound with positive acceleration, even maximum opposing jerk needs time to remove that acceleration. A necessary viability condition is

$$
v+\frac{a^2}{2J_{max}}\le V_{max}\qquad(a>0).
$$

For example, `v=.95`, `a=.5`, `Jmax=1`, `Vmax=1` must reach at least **1.075** before acceleration becomes zero. No solver can make that state retroactively compliant. Directional/asymmetric limits need corresponding signed checks.

Workspace admission must reserve the **whole stopping trajectory**, including current acceleration, bounded jerk and the uncertainty in application delay. `v²/(2A)` alone is only an acceleration-limited lower-level approximation. Reversing input does not authorize instant reversal of motion. A goal outside the workspace is rejected or governed *before* trajectory generation; clipping a generated position at the boundary breaks its derivatives and can make the state inconsistent.

If limits are tightened while the state is already outside them, report an explicit recovery state. Do not label the transition as limit-compliant. A normal trajectory failure may use a separately verified brake from the current commanded state only while timing, authorization and feedback assumptions remain valid. Otherwise enter the existing guarded software Stop/unknown-outcome barrier.

### E7. Command state versus measured feedback

Carry commanded p/v/a through normal replans. Retain a short bounded history of scheduled and acknowledged output states so measured feedback can be compared with the appropriate reference time, including timestamp uncertainty. A freshly returned HTTP response containing an old underlying sensor sample must not be treated as new physical evidence.

Use measured tracking error as a **supervisory governor**, not as an instruction to reset the planner from noisy position with fabricated zero velocity on every tick. Small sustained error can reduce the requested speed or lead; implement that correction as a new bounded trajectory. Do not directly jump the persistent state or abruptly multiply the clock speed and claim unchanged acceleration/jerk.

Persistent divergence, a stale sample, conditioning failure or a breached hard error envelope stops normal following. Reseeding occurs only after a separately confirmed settling state and explicit re-engagement. Zero velocity/acceleration is justified by a stationarity criterion, not by convenience. The existing **500 ms telemetry gate remains intact**; a shorter source-input lease or execution deadline is an additional restriction, not a reason to weaken it.

## F. Execution and data protocol

### F1. Messages and ownership

A proposed intent envelope contains:

```text
session_id, control_epoch, source_id, source_sample_sequence,
source_monotonic_timestamp, source_clock_mapping_id,
reference_frame_id, owned_channels, mode = pose | twist,
pose_or_twist, optional_filtered_derivatives,
source_expiry_budget, explicit_engaged_state
```

A relay preserves the original sample identity and timestamp. It may append a hop-receive time; it must not manufacture freshness by assigning a new source timestamp to a repeated sample. Sequence and epoch reject reorder/replay but **do not by themselves prove age**.

Without synchronized clocks, maintain a bounded clock-offset/drift interval from session round-trip exchanges and source clock behavior. Convert source expiry to a conservative receiver-monotonic deadline; reject when uncertainty makes age unknowable or too large. Alternatively, use a protocol whose bounded source-age budget accounts for every measured hop. “Use receipt time” alone does not solve source freshness. Reconnection invalidates the mapping and requires a new explicit engagement.

Use one pending latest-intent slot and bounded telemetry/history rings. Control events have priority over ordinary intent. A sole executor owns head/body coupling; scripted moves must obtain the same owner token after following has retired. Tracking, speech offsets, idle motions and antenna behavior require explicit coexistence rules. The first validation disables secondary head aim and holds unowned channels unchanged.

### F2. Acknowledgements

Proposed stages are `intent_accepted`, `planned`, `backend_committed`, `native_queued`, `bus_written`, and `measured_arrival`. Include epoch, source sequence, output sequence, the local monotonic timestamp and a reason on rejection. Acknowledgements need not occur for every stage on every packet; the capabilities must state which are actually available.

On the stock HTTP path, do not invent native/application acknowledgements. Keep at most one write in flight, associate its eventual response with its original epoch, and treat an ambiguous response as an unknown outcome. An accepted old response cannot advance a new session's state. This limits project-side backlog but cannot purge commands already inside the daemon/native worker.

A backend extension should atomically commit the coupled target snapshot and make pose-command consumption latest-value, epoch/deadline-aware. Do not coalesce motor-mode changes, diagnostic operations and safety events as though they were replaceable pose samples. Preserve ordered control-event barriers. Report a retirement barrier only after no queued old-epoch reference can still be applied, accounting for a bus write already in progress. Physical settling is a later observation.

### F3. Clock and missed-tick policy

Use a monotonic clock. Start with a realistic measured output cadence, nominally around the backend's 50 Hz, rather than assuming 100 Hz is beneficial. Compute cost, planner state time, send time, acknowledgement time and—where available—application time are separate timestamps.

A bounded scheduler can sample a valid trajectory at the current admissible application time, with only small, qualified timing uncertainty. It must not emit every missed sample in a burst. Conversely, freezing a virtual clock while holding a nonzero-velocity state and later resuming it is not a C2 physical trajectory. Increasing `dt` after an unknown delay is not automatically a safe catch-up strategy either.

If the timing contract is exceeded, retire following and use the admitted guarded stop/reseed procedure. The exact deadline is a measured acceptance parameter, not an arbitrary promise. A sampled position interface cannot turn mathematical jerk bounds into a continuous physical jerk guarantee without assumptions about application and actuator tracking.

A short interpolation buffer should be an optional experiment after the baseline. Start by comparing zero versus one or two output periods of delay, with strict expiry and no extrapolation beyond the authorized horizon. Do not upload a growing trajectory of historical phone poses. Prediction must never outlive the source lease.

### F4. Release, stale input and urgent Stop

**Normal release:** retire the input epoch immediately, erase pending intent/prediction and authorize a *new braking action* from the current trajectory state. The brake is not continuation of the old target pursuit. Completion leaves the controller disengaged; arriving old packets cannot resume it.

**Stale input:** end pursuit at source expiry. A local, already-validated brake may finish under its own bounded authorization, provided the feedback and execution contract remain valid. Input freshness is not renewed by repeatedly stepping that brake.

**Guard-triggered Stop:** bypass normal following/filter delays, invalidate all pending intent, and invoke the existing admitted stop/hold barrier. Smoothness constraints are not a reason to delay an urgent guard response; do not claim C2 continuity across that emergency software transition. No automatic Sleep, torque change or Wake is inferred. A software Stop is not a hardware emergency stop; inability to establish its outcome remains latched and visible.

A PC-side timeout cannot command a robot across a failed Wi-Fi link. Bounded input-loss response therefore requires a robot-side lease/watchdog, or an explicitly narrower stock-daemon failure claim. A helper watchdog can handle loss of browser input; helper-process death still needs an independent guardian or a daemon-owned lease. This is another reason not to equate a local numerical loop with complete fault tolerance.

### F5. Concise pseudocode — policy sketch, not a hardware script

```text
on_explicit_engage(request):
    require admitted_identity_version_and_fresh_telemetry(max_age=500ms)
    require settled_state_and_no_unknown_outcome
    owner = acquire_exclusive_session(request.channels)
    epoch += 1
    establish_source_clock_mapping_and_coordinate_reference()
    state = seed_from_confirmed_state_with_justified_derivatives()
    latest = NONE
    mode = ARMED

on_source_sample(sample):
    require mode == ARMED and valid_owner_epoch_frame(sample)
    require strictly_new_source_sample(sample)
    require conservative_source_age(sample) within lease
    latest = replace_only_slot(validate_and_filter(sample))
    emit intent_accepted(epoch, sample.sequence)  # not motor arrival

on_release_or_source_expiry():
    retire_source_epoch_and_clear_latest_prediction()
    mode = BRAKING_DISENGAGED
    brake = make_and_check_brake(state, current_constraints, stopping_envelope)
    if brake unavailable: guarded_stop_and_latch_outcome()

on_guard_stop_or_solver_crash():
    retire_all_intent_and_planner_output_epochs()
    mode = STOPPING
    preempt_normal_scheduler_with_admitted_stop_barrier()
    remain_disengaged; do_not_auto_wake_or_reconnect_resume()

tick(now_monotonic):
    require owner_valid_and_telemetry_fresh(max_age=500ms)
    if application_time_uncertain_or_deadline_missed:
        guarded_stop_and_latch_outcome(); return
    if previous_write_is_in_flight:
        do_not_queue_or_commit_another_output(); return
    if measured_divergence_or_kinematic_guard_failed:
        guarded_stop_and_latch_outcome(); return

    goal = latest_fresh_goal_or_authorized_brake()
    candidate = planner.calculate_from_carried_p_v_a(state, goal, constraints)
    if candidate.failed_or_nonfinite:
        use_only_separately_verified_authorized_brake_or_guarded_stop(); return
    require accepted_segment_and_stop_tube_within_chart_workspace_and_joint_policy
    output = sample_for_admissible_application_slot(candidate)
    submit_one(output, owner, epoch, output_sequence, expiry)
    record_pending_state_but_do_not_call_it_physically_applied()

on_write_result(result):
    match original_owner_epoch_output_sequence
    if result.unknown: latch_unknown_outcome_and_stop_following()
    if result.rejected: do_not_advance_the_new_session()
    if result.accepted:
        commit_only_to_the_stage_supported_by_this_transport()
        carry output_position_velocity_acceleration_consistently()
        record residual_application_time_uncertainty()
```

For a stock adapter, “accepted” cannot establish when the native bus applied the sample. This is deliberately a capability gap in the sketch, not a claim that bookkeeping alone solves it. A later backend/native adapter closes that gap with epoch-aware application and retirement acknowledgements.

## G. Executed software benchmark and decisive validation

### G1. What was actually run

The included `benchmark.py` was run successfully in this environment: **Python 3.13.5, NumPy 2.3.5, SciPy 1.17.0, Linux x86-64**. It produced **36 scalar experiments and 10,338 output samples**, plus mathematical, protocol and queue fixtures. Raw outputs are in `results/results.json`, `results/summary.csv` and `results/traces.csv`.

It is original comparator code. **It does not import or execute Pollen, Ruckig, rsruckig, the Reachy IK, a network transport, a motor controller or hardware.** The Ruckig module was not installed. This is evidence about the illustrated formulations, not a library bake-off or a reproduction of the supplied physical observations.

Cases are a step, constant-velocity target, abrupt reversal, smooth chirp, noisy/irregular input and an injected 160 ms timer delay. Comparators are capped slew, restarted quintic, carried quintic, carried quintic with instantaneous target velocity, checked-duration quintic and an unclamped critically damped tracker. Scalar units are arbitrary; nominal cycle is 20 ms; common comparison limits are V=1, A=3 and J=30.

Polynomial segment extrema are calculated from stationary roots. Derivative discontinuities at boundaries are recorded separately. Critically damped segment peaks use 33 samples per segment and are labelled as sampled. Timing includes the Python comparator's work and diagnostics; it is not a release-mode C++ solver benchmark.

### G2. Results that change the implementation decision

For a 0.6-unit step:

| Comparator | RMS tracking error | Peak V | Peak A within segments | Peak J within segments | Boundary defect / interpretation |
|---|---:|---:|---:|---:|---|
| Capped slew | 0.1123 | 1.000 | 0* | 0* | Velocity jump 1.0; zeros do **not** mean bounded physical acceleration/jerk |
| Restarted quintic, 0.35 s | 0.4633 | 0.149 | 14.024 | 839.650 | Repeated velocity and acceleration resets; very sluggish progression |
| Carried quintic, 0.35 s | 0.0993 | 2.411 | 22.645 | 839.650 | p/v/a handoff continuity, but major limit violations |
| Checked-duration carried quintic | 0.1715 | 0.930 | 2.419 | 19.393 | No p/v/a jump; all accepted segments checked; more lag |
| Unclamped critical damping | 0.0999 | 1.766 | 38.400 | 614.400 | Acceleration jump 38.4; no hard-limit controller |

The checked-duration method is not demonstrated optimal. Its conservative finite duration search is deliberately simple. In the reversal case its RMS error is about 0.5085, versus 0.222 for the limit-violating fixed-duration quintic. A “smoother” controller can be less useful if its response falls too far behind; compare under **equal limits**, not just equal labels.

For a constant-velocity target, signed tail error divided by target speed gives approximately **0.214 s equivalent lag** for the carried zero-terminal-velocity quintic, **0.350 s** for the comparator that attaches the instantaneous target velocity to the present target position at a future endpoint, and **0.250 s** for checked-duration pursuit. This is not network latency. It demonstrates why endpoint time and derivative semantics must be coherent before claiming feedforward reduces lag.

The benchmark independently reproduces the supplied scalar handoff: p≈0.2428275, v≈1.375675, a≈3.493; jerk changes from −13.53 to approximately **−223.4425**. Carrying p/v/a establishes C2 continuity in this Euclidean example, not a chosen jerk bound.

Additional executed fixtures show: same-thread asyncio tasks can both enter an RLock; quaternion sign equivalence and yaw unwrap must be handled; rotation-vector derivatives differ from angular derivatives; an outward acceleration at the velocity limit makes the constrained duration search reject the state; and a toy FIFO can deliver retired work after release. The synthetic queue reaches depth 32 and applies 26 old-epoch items after release when not purged; the one-slot epoch-aware alternative retains depth one and applies none. Those numbers are properties of that toy producer/consumer schedule, **not native Reachy queue measurements**.

### G3. What must be added before selecting a library or physical controller

| Qualification family | Required experiment and metric | Acceptance interpretation |
|---|---|---|
| Numerical OTG | Actual pinned Community and/or Rust build; issue #255 inputs and neighboring floats; valid/infeasible random boundary states; all result codes; sanitizer runs | No crash, nonfinite or unchecked output; every failure takes the guarded path. Passing is qualification evidence, not universal proof |
| Full orientation | Coupled changing-axis trajectories, q/−q flips, yaw wrap, chart-boundary approaches; angular derivatives from analytic Jacobian and independent rotation differences | No artificial branch jump; limits stated in the intended frame, not Euler-rate proxies |
| IK/FK | Pinned model; continuous branch; coupled head/body trajectories; conditioning; FK path and braking tube | No branch jump or model-envelope breach; dense samples are labelled non-certified unless bounded analytically |
| Moving-signal tracking | Step/ramp/chirp/reversal across noise levels; rest-to-rest versus derivative feedforward versus bounded prediction | Compare RMS/95th error, phase lag by frequency, overshoot and braking distance under identical limits |
| Protocol and scheduling | Delays, bursts, reorder, duplicate/re-enveloped old samples, loss, clock reset/drift, background-tab stalls and timer pauses | Bounded storage; old source data never gets a new lease; no post-barrier old-epoch application; no automatic re-engagement |
| Solver/transport failure | Native crash, explicit solver error, ignored/move-running response, missing acknowledgement, late completion after Stop | No raw-target fallback; unknown outcome remains latched; guardian survives numerical worker failure |
| Performance | Actual ARM64 and Windows release builds with fixed seeds; one and all owned axes; IK/filter/logging included and excluded | Record median, p95, p99, maximum, deadline misses and allocation/queue depth. Do not extrapolate x86 microseconds to robot end-to-end performance |

For a proposed 20 ms local period, an initial **engineering budget**, not a measured capability, is p99 combined planner/filter/IK work below 2 ms and no observed work item consuming the full period in the qualification run. Separately measure OS/HTTP/native jitter. A numerical result fitting the budget does not validate the executor.

### G4. One attended physical session, after offline admission

Keep original gains, operating/drive modes, profiles and protection settings. Do not perform a new range survey, introduce shell contact, repeat broad maintenance or make a new backup/restore cycle between observations. The supplied 500 ms telemetry guard and native cooldown remain mandatory.

**First comparison: isolate shape from execution location.** Use one small nominal-height single-axis excursion, then a small coupled excursion only if the first remains clearly contact-free. Hold body yaw and antennas consistently and quiesce secondary aim identically. Match measured start, target, duration, interpolation convention and observation method across:

1. Existing PC capped linear ramp, with speed selected to give the comparison's nominal duration.
2. PC-generated common-clock eased trajectory using the same fixed-endpoint Pollen convention, with explicit endpoint handling.
3. Daemon-local equivalent, either an admitted fixed-endpoint backend move for the scheduling comparison or the same helper trajectory math over loopback. Log the stock endpoint difference rather than concealing it.

The linear condition intentionally retains its start/end velocity discontinuities; compare those phases and the interior separately. For B/C, identical mathematics and aim-source policy are essential. If actual PC duration stretches because of request pacing, report that as a result; do not retroactively call the durations matched.

Select the nominal easing duration from peak bounds. For illustration only, D=5°, Vmax=10°/s, Amax=20°/s² and Jmax=80°/s³ require approximately 1.554 s, so 1.6 s gives peaks about 5.86°/s, 11.28°/s² and 73.24°/s³. **Those acceleration/jerk values are not qualified Reachy limits.** They demonstrate duration selection; model-mapped motor bounds and contact-free scope still control admission.

Record requested intent, planned reference, request/acknowledgement timing, available daemon/joint targets, measured pose and independent physical observation separately. Use an external visible reference or calibrated camera observation where feasible; do not call FK derived from motor feedback independent optical accuracy. Do not infer coordinated onset from a group-write function or from a smooth video alone.

Fresh pose monitoring should use the admitted cached/pushed telemetry route. Raw native diagnostics remain spaced **at least 1.25 seconds after the preceding completion**, respecting the existing shared cooldown and earlier reads. Do not poll raw registers at 250 ms or claim the invalid prior center dwell was measured. A static sample after settling can investigate residual error without becoming an intrusive high-rate serial workload.

**Second comparison: only after the first succeeds**, test a small mid-motion retarget, a safe reversal with demonstrated braking room, explicit release, and bounded source loss. Verify that the old target is retired and re-engagement is explicit. A larger pose, new gain/mode setting, phone source or headset source is not needed to answer this first architectural question.

**Interpretation:** B improving over A supports better reference shaping. C improving over B under matched math supports local execution. No B/C improvement, together with comparable command traces, shifts attention toward quantization, tracking dynamics or other physical causes. Smoothing may improve appearance while the supplied static errors remain; that does not make the original arrival criterion pass.

## H. Implementation steps, acceptance and falsification

### H1. Small-step plan

**Step 1 — Offline contracts in the existing project.** Introduce a narrow `TrajectoryEngine` interface returning p/v/a, segment time, completion and explicit failure; an intent gate with source identity/expiry; and a deterministic replay clock. Keep the existing capped ramp as a baseline, add the checked quintic as a comparator, and preserve all current admission and recovery guards. Include omitted-channel and old-epoch late-ack tests.

**Step 2 — Qualify the numerical candidate.** Build a pinned local Ruckig Community core in an isolated numerical worker and replay the adversarial suite, including known numerical cases and the actual chosen workspace/units. Do not enable Pro/cloud-only features accidentally. The corresponding Rust port is a separately tested alternative, not an inherited guarantee. If Community's failures cannot be safely bounded or repaired, select a reviewed maintained implementation or explicitly narrower acceleration-limited governor; do not make raw-output fallback the workaround.

**Step 3 — Conduct the attended A/B/C session.** Use the original settings and matched aim-source policy. Decide whether the existing PC architecture is adequate or the optional helper is justified. No phone/headset physical following is admitted by this step.

**Step 4 — Close measured execution gaps.** If stock ownership, application uncertainty or native backlog fails acceptance, implement the smallest backend/native extension: one owner token, atomic coupled snapshot, replaceable pose mailbox, epoch/deadline retirement and application-stage acknowledgement. Requalify that version explicitly. This is not permission to adopt daemon 1.11.0.

**Step 5 — Qualify moving-source tracking.** Add coherent derivative estimation and only then bounded prediction or a short buffer. Repeat release/loss tests with real phone/headset timestamps and browser suspension. Keep an explicit UI indicator for disengaged, braking, blocked and unknown-outcome states.

### H2. Acceptance criteria

Offline acceptance requires no unintended p/v/a discontinuity in the selected C2 mathematical reference; analytically checked scalar/vector limits for the claimed domain; no nonfinite or unchecked output; no silent solver or duration failure; bounded queues; and deterministic retirement of duplicate, expired and old-epoch intent. A reference-limit pass is not a physical-limit pass.

Execution acceptance requires a documented worst observed sample/application-gap envelope, no catch-up avalanche, explicit treatment of missed deadlines and late acknowledgements, and no queued old-epoch application after the acknowledged retirement barrier. The stock route may be unable to demonstrate the latter; failure is evidence for a small integration change, not justification for relabelling HTTP acceptance.

Physical acceptance preserves the existing 1°/1 mm measured-arrival criterion as its own outcome, while reporting any new SO(3) geodesic metric separately. The selected architecture must improve a predeclared smoothness/lag measure over the baseline under equal constraints without more overshoot, lost ownership, contact or stale-input travel. Predeclare the acceptable tracking-error and lag bands for the limited test; do not choose them after seeing a favorable video. No arbitrary acceleration or jerk value in this report is an admitted motor specification.

### H3. What would falsify the recommendation?

A robot-local helper is not justified if matched PC/local execution shows no material improvement in application cadence or tracking. A jerk-limited generator is not the right complexity tradeoff if an acceleration-limited governor meets the same safety/reference constraints and produces equally good physical motion with less lag. A task-space design must be replaced or restricted if coupled motion violates joint limits or loses IK branch continuity despite its Cartesian checks. Any native backlog that applies retired commands falsifies the sufficiency of browser-only smoothing. Persistent static error with improved trajectory smoothness falsifies the idea that trajectory shaping alone fixes arrival.

### Top three next actions

1. **Add the persistent-state, freshness and replay contracts to the existing bridge, then run an actual pinned OTG against the supplied and included failure cases.** Keep this entirely offline.
2. **Prepare one matched A/B/C attended session at contact-free nominal height, with identical aim-source policy and durations chosen from peak bounds.** Preserve the current gains/mode, telemetry gate, native cooldown and arrival reporting.
3. **Use the observed application timing and retirement behavior to decide between retaining the PC executor, adding the optional robot-local helper, or making the minimal backend/native mailbox-and-owner change.** Do not select the deployment location from animation quality alone.

**Smallest missing evidence that could change the recommendation:** a short matched PC-versus-loopback/backend trace, using the same eased reference, that aligns output sequence and application timing with fresh measured motion and an explicit Stop/retirement event. It would reveal whether network placement is the dominant defect or whether the remaining problem is downstream ownership/queueing, kinematics or physical tracking. An actual pinned-library run on the robot's ARM64 software stack is the separate minimum evidence needed before calling the numerical dependency qualified.

---

## Annotated primary-source catalog

All accesses are for this report's 16 October 2026 cutoff. A public source claim does not establish installation on the user's robot.

**P1 — Pollen interpolation:** pinned Python source, inspected; scalar easing, yaw-separated rigid interpolation and general boundary-state quintic. [Source](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/utils/interpolation.py).

**P2 — Pollen GotoMove:** pinned full source inspected; ordinary goto path and fixed constructor state. [Source](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/motion/goto.py).

**P3 — Pollen abstract backend:** relevant target, playback, ownership, Sleep, tracking, command dispatch and transport sections inspected at the pin; not a full daemon runtime test. [Source](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/abstract.py).

**P4 — Pollen move router:** pinned source inspected; HTTP/WS target behavior, task IDs, cancellation and missing interpolation forwarding. [Source](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/app/routers/move.py).

**P5 — Native worker:** `control_loop.rs` and relevant Python binding sections inspected at controller 1.5.6 pin. [Worker](https://github.com/pollen-robotics/reachy-mini-motor-controller/blob/dff1c536a75735a950564e18240d6a67b056819c/src/control_loop.rs); [bindings](https://github.com/pollen-robotics/reachy-mini-motor-controller/blob/dff1c536a75735a950564e18240d6a67b056819c/src/bindings.rs).

**P6 — Robot update and writes:** backend update/init and controller write methods inspected. [Backend](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/robot/backend.py); [controller](https://github.com/pollen-robotics/reachy-mini-motor-controller/blob/dff1c536a75735a950564e18240d6a67b056819c/src/controller.rs).

**P7 — Python SDK:** pinned `set_target`, `goto_target`, Wake/Sleep and connection sections inspected; entry-point differences documented. [Source](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/reachy_mini.py).

**P8 — rustypot conversion:** pinned XL330 register conversion inspected. [Source](https://github.com/pollen-robotics/rustypot/blob/7b1ab271c40a3837d25d21494a7c8626b3e969a0/src/servo/dynamixel/xl330.rs).

**P9 — Newer comparison:** GitHub comparison metadata and newer playback source inspected; not a new installation admission. [Compare](https://github.com/pollen-robotics/reachy_mini/compare/7f54717586369155900eeeb43fd4bbbb62064f22...6f656a1d8cae2728bdb6c3e17a8cf8ac4f695482); [newer backend](https://github.com/pollen-robotics/reachy_mini/blob/6f656a1d8cae2728bdb6c3e17a8cf8ac4f695482/src/reachy_mini/daemon/backend/abstract.py).

**P10 — Pollen license:** root Apache-2.0 license inspected at the pin; no separate asset-licensing conclusion. [License](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/LICENSE).

**U1/U2 — Public project:** manual worker, head-following worker and pose helpers inspected on public main. Control blob `1713578429ea2d19d4f802b4d6e24284d179674f`; pose-helper blob `c25c44c07f428ec0a95af207bcfe2d640a9039c2`. [Control](https://github.com/MesmerPrism/reachy-mini-browser-control/blob/main/server/control.mjs); [pose helpers](https://github.com/MesmerPrism/reachy-mini-browser-control/blob/main/server/head-pose.mjs). Branch URLs can advance; blob IDs identify the observed content.

**R1 — Ruckig 0.19.4:** versioned README inspected; local core versus Pro/cloud boundaries and API examples. [README](https://github.com/pantor/ruckig/blob/v0.19.4/README.md); [examples](https://docs.ruckig.com/examples.html).

**R2 — Ruckig maintained documentation:** feature documentation and benchmark/maintenance statement inspected. [Documentation](https://docs.ruckig.com/); [benchmark and Community/Pro distinction](https://docs.ruckig.com/benchmark.html); [tracking example](https://docs.ruckig.com/md_pages_2example__14.html).

**R3 — Ruckig issue #255:** issue and maintainer response inspected, including later referenced commits; no independent execution here. [Issue](https://github.com/pantor/ruckig/issues/255).

**R7 — Ruckig velocity example:** exact 0.19.4 example inspected, with a 10 ms numerical cycle and a/j configuration; not executed. [Source](https://github.com/pantor/ruckig/blob/v0.19.4/examples/05_velocity.cpp).

**R4 — Ruckig packaging:** release metadata and PyPI wheel listing inspected; no ARM wheel/build asserted. [PyPI 0.19.4](https://pypi.org/project/ruckig/0.19.4/); [release](https://github.com/pantor/ruckig/releases/tag/v0.19.4).

**R5/R6 — rsruckig:** README, workspace profile and tracking implementation inspected; test files located, not executed. Tracking blob `615323c01fe072fd217cdeeba987b47c4954325f`. [Repository](https://github.com/petrikosk/rsruckig); [tracking source](https://github.com/petrikosk/rsruckig/blob/main/lib/src/rsruckig/trackig.rs); [tests](https://github.com/petrikosk/rsruckig/tree/main/test_suite/tests). Documentation package version encountered: 3.0.1; main's independent features must not be assumed identical to another pinned release.

**L1 — Flash & Hogan (1985):** metadata/abstract read, not full text. [PubMed](https://pubmed.ncbi.nlm.nih.gov/4020415/).

**L2/L3 — Kröger & Wahl (2010), Reflexxes:** full primary paper inspected, including first-page rendering. Public Type II README and LGPL-3.0 license header inspected; official product access was intermittent. [Paper](https://cs.stanford.edu/groups/manips/publications/pdfs/Kroeger_2010_TRO.pdf); [Type II repository](https://github.com/Reflexxes/RMLTypeII); [license](https://github.com/Reflexxes/RMLTypeII/blob/master/LICENSE); [official example](https://www.reflexxes.ws/software/typeiirml/v1.2.6/docs/page__code_01__r_m_l_position_sample_application.html).

**L4 — Berscheid & Kröger (2021):** full RSS paper read and benchmark table visually inspected. [Paper](https://www.roboticsproceedings.org/rss17/p015.pdf); [DOI](https://doi.org/10.15607/RSS.2021.XVII.015).

**L5 — Huber & Wollherr:** publisher metadata and author-uploaded full-text HTML read; TUM PDF could not be retrieved. [DOI](https://doi.org/10.1017/S0263574719001619); [author-uploaded full text](https://www.researchgate.net/publication/337592038_An_Online_Trajectory_Generator_on_SE3_for_Human-Robot_Collaboration).

**L6 — Lange & Albu-Schäffer (2016):** authoritative DLR metadata/abstract only; manuscript retrieval failed. [DLR](https://elib.dlr.de/101288/); [DOI](https://doi.org/10.1109/LRA.2015.2506899).

**L7 — RotationSpline:** official API documentation read; no live controller execution. [SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.transform.RotationSpline.html).

**L8 — One Euro:** author description and implementation/license catalog inspected. [Author page](https://gery.casiez.net/1euro/); [author repository](https://github.com/casiez/OneEuroFilter).

**M1/M2/M3 — MoveIt Servo:** current documentation and actual smoothing source inspected at `a9004a43151b7d1fd50d462b8db6d4d280b0cc21`; no ROS stack run. [Tutorial](https://moveit.picknik.ai/main/doc/examples/realtime_servo/realtime_servo_tutorial.html); [Ruckig plugin](https://github.com/moveit/moveit2/blob/a9004a43151b7d1fd50d462b8db6d4d280b0cc21/moveit_core/online_signal_smoothing/src/ruckig_filter.cpp); [acceleration plugin](https://github.com/moveit/moveit2/blob/a9004a43151b7d1fd50d462b8db6d4d280b0cc21/moveit_core/online_signal_smoothing/src/acceleration_filter.cpp).

**E1 — Pollen conversation application:** `MovementManager` state, timing, queue and ownership methods inspected at `0a3ef5c07c4c9ba58ceaf788244393033acd88c7`; not a measured actuator-rate example. [Source](https://github.com/pollen-robotics/reachy_mini_conversation_app/blob/0a3ef5c07c4c9ba58ceaf788244393033acd88c7/src/reachy_mini_conversation_app/moves.py).

**E2 — Marionette:** design and handoff source material inspected; recording/capture claims distinguished from physical live tracking. [Design](https://huggingface.co/spaces/pollen-robotics/marionette-js/blob/91c2d8759a2328e2f68325649e17d808a017a6c9/DESIGN.md); [handoff](https://huggingface.co/spaces/pollen-robotics/marionette-js/blob/7ea69d7f7e4288efcc499561f26ab4f6a2a8b958/HANDOFF.md).

[P1]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/utils/interpolation.py
[P2]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/motion/goto.py
[P3]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/abstract.py
[P4]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/app/routers/move.py
[P5]: https://github.com/pollen-robotics/reachy-mini-motor-controller/blob/dff1c536a75735a950564e18240d6a67b056819c/src/control_loop.rs
[P6]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/robot/backend.py
[P7]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/reachy_mini.py
[P8]: https://github.com/pollen-robotics/rustypot/blob/7b1ab271c40a3837d25d21494a7c8626b3e969a0/src/servo/dynamixel/xl330.rs
[P9]: https://github.com/pollen-robotics/reachy_mini/compare/7f54717586369155900eeeb43fd4bbbb62064f22...6f656a1d8cae2728bdb6c3e17a8cf8ac4f695482
[P10]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/LICENSE
[U1]: https://github.com/MesmerPrism/reachy-mini-browser-control/blob/main/server/control.mjs
[U2]: https://github.com/MesmerPrism/reachy-mini-browser-control/blob/main/server/head-pose.mjs
[R1]: https://github.com/pantor/ruckig/blob/v0.19.4/README.md
[R2]: https://docs.ruckig.com/benchmark.html
[R3]: https://github.com/pantor/ruckig/issues/255
[R4]: https://pypi.org/project/ruckig/0.19.4/
[R5]: https://github.com/petrikosk/rsruckig
[R6]: https://github.com/petrikosk/rsruckig/blob/main/lib/src/rsruckig/trackig.rs
[L1]: https://pubmed.ncbi.nlm.nih.gov/4020415/
[L2]: https://cs.stanford.edu/groups/manips/publications/pdfs/Kroeger_2010_TRO.pdf
[L3]: https://github.com/Reflexxes/RMLTypeII
[L4]: https://www.roboticsproceedings.org/rss17/p015.pdf
[L5]: https://www.researchgate.net/publication/337592038_An_Online_Trajectory_Generator_on_SE3_for_Human-Robot_Collaboration
[L6]: https://elib.dlr.de/101288/
[L7]: https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.transform.RotationSpline.html
[L8]: https://gery.casiez.net/1euro/
[M1]: https://moveit.picknik.ai/main/doc/examples/realtime_servo/realtime_servo_tutorial.html
[M2]: https://github.com/moveit/moveit2/blob/a9004a43151b7d1fd50d462b8db6d4d280b0cc21/moveit_core/online_signal_smoothing/src/ruckig_filter.cpp
[M3]: https://github.com/moveit/moveit2/blob/a9004a43151b7d1fd50d462b8db6d4d280b0cc21/moveit_core/online_signal_smoothing/src/acceleration_filter.cpp
[E1]: https://github.com/pollen-robotics/reachy_mini_conversation_app/blob/0a3ef5c07c4c9ba58ceaf788244393033acd88c7/src/reachy_mini_conversation_app/moves.py
[E2]: https://huggingface.co/spaces/pollen-robotics/marionette-js/blob/7ea69d7f7e4288efcc499561f26ab4f6a2a8b958/HANDOFF.md

[R7]: https://github.com/pantor/ruckig/blob/v0.19.4/examples/05_velocity.cpp
