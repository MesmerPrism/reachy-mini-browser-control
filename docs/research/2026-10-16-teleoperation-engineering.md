# Smooth, responsive Reachy Mini browser teleoperation

> **Dated external research record — TEL-2026-10-16.** User-supplied ChatGPT Pro research, imported on 2026-10-16. “Verified,” “inspected,” “executed” and first-person statements below describe the report author's work. They do not establish independent project validation or current robot state. Recommendations and pseudocode are proposals, not operating instructions or authorization.
>
> Start with the [maintained research guide](README.md), which records project evidence, selected cross-checks, open decisions and qualification gaps. This record's dependency versions and issue states are historical.

**Original report SHA-256:** `0cadb659753bb3b5dfc628aa90fb1a9300513ba080b0c9f8d8360fac299a5c92`. The original is retained privately; this edition adds navigation and import context, normalizes Markdown mathematics, separates adjacent source citations and clarifies private-brief references. Findings and source IDs are preserved.

## Contents

- [1. Direct answer](#1-direct-answer)
- [2. Evidence ledger](#2-evidence-ledger)
- [3. Component and version map](#3-component-and-version-map)
- [4. Architecture comparison and recommended controller](#4-architecture-comparison-and-recommended-controller)
- [5. Hardware interpretation without premature tuning](#5-hardware-interpretation-without-premature-tuning)
- [6. Ranked hypothesis matrix](#6-ranked-hypothesis-matrix)
- [7. A small, high-information experiment campaign](#7-a-small-high-information-experiment-campaign)
- [8. Telemetry with explicit temporal provenance](#8-telemetry-with-explicit-temporal-provenance)
- [9. Implementation plan and non-runnable scheduler pseudocode](#9-implementation-plan-and-non-runnable-scheduler-pseudocode)
- [10. Developers using Reachy Mini: reusable techniques and limits](#10-developers-using-reachy-mini-reusable-techniques-and-limits)
- [11. Focused networking appendix](#11-focused-networking-appendix)
- [12. Source catalog and access limits](#12-source-catalog-and-access-limits)
- [13. Top three next actions and evidence that changes the recommendation](#13-top-three-next-actions-and-evidence-that-changes-the-recommendation)

**Engineering investigation and next-experiment specification**

**Research cutoff:** 16 October 2026.  
**System of interest:** Reachy Mini Wireless; admitted daemon 1.10.0; browser/Node HTTP control and, separately, JavaScript SDK 1.8.0 over WebRTC.  
**Evidence basis:** the supplied 291-line research brief, public version-pinned source, component documentation, and first-hand public developer reports. No robot connection, hardware action, private-log inspection, or reproduction of the supplied measurements was performed.

References such as **[B:75–99]** identify line ranges in the private supplied research brief, which is not included in this public record. Use the [project evidence map](README.md#project-evidence-map) for accessible project documentation. **[S01]** and similar references link public sources catalogued in section 12. Proposed parameters and decision rules remain proposals, not measured robot capabilities.

## 1. Direct answer

**Smooth live browser control is plausible, including motion that looks comparable to local playback within a bounded, contact-free operating envelope. The evidence does not establish a fundamental limitation that makes browser-originated motion inherently jerky. It also does not establish that changing transport alone will fix this robot.**

The important distinction is where the continuous reference trajectory is generated. A browser can send fresh intent while the robot generates coordinated intermediate references locally. That is still streaming teleoperation; it does not require predicting a complete gesture or transmitting every motor-loop sample. Conversely, repeatedly starting short rest-to-rest `goto` movements is not equivalent to a continuously retargetable controller.

Four problems should remain separate:

| Problem | Present interpretation | Principal next discriminator |
|---|---|---|
| Visible unevenness during movement | Trajectory timing, easing, small-command response, competing aims, and scheduling are credible contributors; their relative contributions remain unmeasured. | Matched PC-linear, PC-minimum-jerk, and daemon-local-minimum-jerk movements. |
| Persistent error after goals stop changing | Supplied goal/trajectory/present-position brackets establish a following deficit at the actuator level during those samples. Transport alone cannot explain that deficit. | Common-target approaches from genuinely measured opposite sides, with original gains and sparse native brackets. |
| Contact and apparent range limits | Some surveyed poses are contact-limited, independently of IK feasibility. | Nominal-height, visibly contact-free tests; no further limit sweep. |
| Historical connectivity “limbo” | The route add/remove intervention strongly identifies an OS routing failure in that incident. Its original ACD trigger remains unknown. | Event-triggered ARP/DHCP/netlink/NM capture, outside the motion campaign. |

The supplied within-robot Sleep contrast is valuable but not a controlled result: easing, duration, secondary aim policy, antennas, and completion criteria differed, and there is no qualified native observation of the Sleep-center dwell. Treat it as motivation for an awake recentering comparison, not proof of a particular cure. [B:46–69; B:133–143]

### What stock 1.10.0 can already do

The pinned daemon supports HTTP and WebSocket target updates, daemon-local `goto`/playback, and WebRTC command dispatch. Its ordinary position loop is configured at 50 Hz; playback is evaluated nominally at 100 Hz. Both eventually use the same target/IK/native path. Therefore the first decisive comparison needs neither new servo firmware nor a new planner package. [S01], [S02], [S03]

Stock streaming is nevertheless not an end-to-end freshness-controlled real-time system. The reviewed target route has no per-target expiry or receiver-enforced epoch; the native controller has a FIFO command queue; and SDK 1.8.0 ordinary target sends do not apply upload-style backpressure. These are architecture limitations to evaluate, not evidence that a queue actually backed up in the supplied trials. [S01], [S04], [S05]

### What cannot be achieved simultaneously

With unpredictable input and variable communication delay, no causal controller can provide all of: zero added delay, perfect noise/jitter rejection, arbitrary immediate reversals, and bounded acceleration/jerk. A local planner makes the compromise controllable; it cannot remove it.

There is also an independent speed-limit effect. At the survey limit of 10 degrees/s, a 15-degree correction requires at least 1.5 seconds even before acceleration constraints. No packet-rate improvement removes that lower bound. These conservative diagnostic limits should not silently become a claim about final phone-follow performance, nor should they be raised merely to make a demonstration feel responsive. [B:52–55; mathematical lower bound]

**Recommendation:** retain the admitted HTTP path as the practical fallback and initial experimental reference. First separate trajectory shape from execution location. Add a small robot-local, velocity/acceleration-continuous intent follower only if that comparison or interruption/loss testing demonstrates a need. Address persistent following error on a separate branch; do not make gain increases a prerequisite for learning about motion timing.

## 2. Evidence ledger

“Checked source” below means source inspection, not confirmation that an unexamined private patch or deployed artifact behaves identically.

| ID / class | Material finding | What it supports—and does not support |
|---|---|---|
| L1 — supplied observation | Sleep looks smoother on the same robot; the streamed centering return retained 4.768 degrees combined angular and 2.628 mm translation error. | A strong within-device contrast, but not measured Sleep accuracy or isolated easing/transport effects. [B:135–143] |
| L2 — supplied timing | 1,916 reply gaps below one second: median 26.585 ms, p95 42.315 ms, maximum 850.865 ms; boundaries may remain. | Irregular reply cadence worth investigating. Not one-way latency, bus cadence, or a demonstrated 851 ms mid-ramp stall. [B:66–69] |
| L3 — supplied native brackets | Goals match computed-joint conversions; internal trajectory is within about two counts of goal while present position can be 48 counts away. | A sampled actuator-following deficit. Not continuous nonsaturation, calibrated torque, or a full firmware-control-law identification. [B:75–95] |
| L4 — supplied numerical audit | 558/4,096 single-turn values lose one count in the pinned roundtrip conversion; a bounded snapping candidate exists offline. | A separate conversion defect relevant to repeated measured holds. It cannot by itself explain a multi-degree head residual. [B:99] |
| L5 — supplied physical limits | Forward +50 mm produced shell pressure and unwanted pitch; other extreme poses brushed. | Exclusion of those poses from clean response tests. Not a manufacturer clearance map. [B:126–131] |
| C1 — checked source | HTTP `goto` accepts an interpolation field but does not forward it. | That endpoint cannot establish a linear-versus-minimum-jerk comparison by changing this field. [S01] |
| C2 — checked source | Pinned `GotoMove` uses scalar yaw plus interpolation of the pitch/roll residual. | Matching easing alone does not match all six-axis paths. Pure-axis tests avoid much of this confound. [S06], [S07] |
| C3 — checked source | Native controller uses `mpsc::channel(100)` and `blocking_send`; its worker services commands and reads. | A possible queue-age/backpressure mechanism. No proof the queue filled in the supplied runs. [S04] |
| C4 — checked source | Daemon motion data channel is ordered, with no partial-reliability limit configured; the optional lossy `pose` channel is outbound telemetry. | “WebRTC motion is unreliable/latest-only” is false for this reviewed path. [S08], [S09] |
| F1 — first-hand correction | In issue #1402, the author withdrew the voltage-fault explanation after observing stalls with clean hardware-error registers; larger antenna swings reduced stalls. | Amplitude/reversal sensitivity is a lead. Not proof of friction, not a head-motor diagnosis, and not permission for larger shell-contacting motions. [S10] |
| F2 — contradictory report | Conversation-app issue #224 reports jitter in robot-local, small breathing motion. The maintainer disputed the author’s claim that high update rate itself was the cause. | Network transport cannot be assumed to explain every jitter report. [S11] |
| F3 — limited positive report | Marionette changed prerecorded playback from browser frame sending to robot-side playback. | A reusable playback architecture and author-reported improvement; not a controlled live-retargeting result. [S12] |
| H1 — hypothesis | Different joints break away at different errors because of friction/load/P-only control. | Consistent with some evidence, not established. Requires direction/speed-dependent motor and physical observations. |
| H2 — hypothesis | Diagnostic or media load creates timing tails. | Plausible; PR #1409 provides a separate Wireless example. Must be tested on this baseline without conflating instrumentation and normal UI load. [S13] |
| N1 — supplied intervention | Adding the correct on-link route restored external access; removing it reproduced loss. | Strong evidence that routing was causal in that event. Does not identify the ARP sender or prove a genuine duplicate address. [B:173–182] |

**Claims contradicted or not justified:** current-profile zero means stationary; Current Limit must be the mode-3 output ceiling; all seven motors are the current documented BOM variants; Sync Write guarantees simultaneous physical onset; SDK `true`, HTTP success, or timed completion proves arrival; Sleep accuracy has been measured; the bidirectional hysteresis comparison is complete; increasing P is already physically qualified. [B:83–101; B:139–165]; [S01], [S05], [S14], [S15]

## 3. Component and version map

| Layer | Version/source actually used in this investigation | Engineering consequence |
|---|---|---|
| Public browser project | Supplied local 0.3.5 / `e36165bba32884e9fd01d10207b24e2fa097d726`; public README and STATUS inspected separately. | The brief takes precedence for newer private diagnostics. No inference that main or the hosted build contains every local change. [B:16–42]; [S16], [S17] |
| Daemon | 1.10.0 / `7f54717586369155900eeeb43fd4bbbb62064f22`. | Primary compatibility baseline. Local playback and target streaming already exist. [S01], [S02], [S03] |
| Kinematics | Supplied AnalyticalKinematics / Rust package 1.0.3. | No independent calibration or Cartesian-accuracy certification was found. [B:35–40] |
| Native controller | 1.5.6 / `dff1c536a75735a950564e18240d6a67b056819c`. | Single serial owner, command FIFO, cached reads; add passive timing here only if needed. [S04] |
| Conversion | Supplied rustypot 1.4.2 / `7b1ab271c40a3837d25d21494a7c8626b3e969a0`. | Keep its separately identified count-roundtrip defect separate from motion quality. [B:99] |
| Browser SDK | 1.8.0 source tag resolves to `96f1c2e2950ac83871799db37968b6a6fb0bae34`. | Ordinary target sends are local queue operations; default state refresh is 500 ms. The npm tarball was not independently hash-compared here. [S05], [S18] |
| Servo readback | Supplied seven monitored motors: model 1200, firmware 53, mode 3, drive mode 0. | Apply documented model semantics cautiously; reconcile the base variant before transferring tuning advice. [B:83–97] |
| NetworkManager | Supplied `1.52.1-1+rpt4`; upstream `1.52.1` state-machine source inspected. | Upstream tag is not proof of downstream package identity or a driver-specific fix. [S19] |

### Control-loop layers that must not be collapsed

The reviewed real-robot backend is configured at **50 Hz**, as is its ordinary native position-read period. Playback requests **100 Hz evaluation**. In `_update`, the backend submits existing joint targets before computing the next IK update; this gives a pipeline stage rather than instantaneous target execution. The native worker then chooses between queued operations and read ticks. Servo-internal response is another layer, and a synchronized goal write is not a synchronized measurement of motion onset. [S02], [S03], [S04]

The native worker’s shutdown path drains queued commands by executing them; closing it is therefore not a substitute for a priority motion abort. Preserve the project’s established Stop procedure, and do not infer that cancelling a playback task instantly removes all already-enqueued native work. [S04]

The pinned Python playback and robot loops use `time.time()` in important timing paths. Use monotonic time in new scheduling and instrumentation; do not imply a clock adjustment has actually been observed. A 50 Hz mean does not establish bounded worst-case scheduling delay. [S02], [S03]

### Later upstream work: useful leads, not blanket admission

The release listing identifies **1.10.0 on 13 August, 1.11.0 on 11 September, and 1.12.0 on 2 October 2026**. The 1.11 notes include interpolation-performance and TURN work; these are not a supplied-device smoothness qualification. Version 1.12 includes access/security changes that can alter direct browser-to-daemon compatibility independently of motor behavior. Inspect and admit specific changes separately. [S20]

Two open reports matter: **#1453, 5 October**, describes face-tracking ownership preventing manual head targets after face loss on a **1.10.0 Lite**; **#1449, 4 October**, reports incomplete pitch/roll clamping in **1.11 mockup simulation**. Their shared-code relevance is useful, but neither is a Wireless physical result or clearance guarantee. [S21], [S22]

**PR #1409 remains open and draft**, not a merged cure. Its Wireless measurements are quantiles of *one-second worst-loop samples*, not quantiles of every tick. At a modified 30 fps IPC feed, the author reported greater daemon CPU and worse loop tails than at 10 fps. A rate cap/latest-value design reduced some aggregate load but did not improve every worst-case value; a behavioral A/B with a person was still listed as outstanding. [S13]

## 4. Architecture comparison and recommended controller

All latency descriptions below are architectural expectations unless marked as source configuration. None is a measured input-to-head latency for this robot.

| Path | Trajectory location and live retargeting | Jitter/latency and loss behavior | Changes / compatibility | Stop, ownership, and evidence |
|---|---|---|---|---|
| Current serialized HTTP `set_target` | PC generates ramp; changes take effect after the active request and next scheduling opportunity. | No intentional concurrent writes; capped progress can stretch time after delay. In-flight requests remain uncertain until resolved. | Already admitted with project guards on daemon 1.10.0. | Preserve the project’s drain/fresh-hold/fencing behavior. HTTP success is not native completion; HTTP can report an ignored target during playback. Strong source and supplied-path evidence. [S01] |
| Stock target WebSocket | Browser/Node still generates references. Retargetable, but the route is not an interpolator. | Removes per-request HTTP exchange overhead; still ordered transport, buffering, and scheduling. Disconnect does not itself create a motion lease. | Route exists in pinned 1.10.0. New adapter and attended qualification required. | The route does not return per-target successful-execution acknowledgements. Ownership and Stop cannot simply inherit HTTP semantics. Strong API evidence, no supplied-device benefit measured. [S01] |
| SDK 1.8.0 / daemon 1.10 WebRTC | Browser supplies immediate poses or starts local `goto`. Ordinary pose sending is retargetable at application level. | Reviewed motion channel is reliable/ordered. Old reliable messages can delay newer ones. Ordinary sends lack motion-specific backpressure/expiry. | Existing hosted path, but physical phone/headset operation remains unqualified. | SDK boolean means queued locally. Keep separate motion authorization, expiry and reconnection gates. Do not put commands on the telemetry-only `pose` channel. [S05], [S08], [S09] |
| Daemon-local `goto` | Complete timed point-to-point path generated on robot; starts from present pose. | Per-sample network jitter removed; local scheduling and actuator limitations remain. | Available in 1.10.0; HTTP method-field bug requires using the known actual default or another verified entry point. | Useful experimental reference, not continuous teleop. Cancel/task completion is not native arrival; overlapping gotos are not a retargeting algorithm. [S01], [S02], [S06] |
| Uploaded/recorded playback | Complete known trajectory evaluated locally. | Good isolation from browser frame delivery; live changes require cancellation/new planning. | Present in pinned backend; Marionette provides a concrete browser-upload example. | Appropriate for emotes, not sufficient for unpredictable head tracking. Buffer upload policy is not live-motion freshness policy. [S02], [S12] |
| Optional local intent follower — recommended only when warranted | Browser sends absolute intent; robot maintains position, velocity and acceleration state and continuously replans. | Local cadence can bridge ordinary packet variation. Zero or small bounded playout delay; expiry triggers local braking rather than completion of stale movement. | Small managed helper/app or narrow daemon integration; no new direct serial owner. SDK 1.8 may need a narrow, versioned adapter to reach it. | Receiver-enforced owner/epoch/sequence/age and verified cancellation required. Does not bypass native FIFO or turn Linux into hard real time. Engineering proposal. |
| Native latest-target mailbox / execution-age guard | Last-mile motion state coalesced before serial dispatch. | Prevents motion backlog at the layer client coalescing cannot control. Does not fix servo following error. | Native change; defer until queue-age evidence justifies it. | Must preserve torque, maintenance, and ownership barriers. Do not generically drop all command types. Engineering proposal. |

### Quantified upstream load evidence—not your robot’s latency

PR #1409 reports 30 one-second samples per condition, each representing that second’s worst control-loop interval. Its author’s Wireless results include the following; the nominal loop period was 20 ms. [S13]

| Condition | p90 of one-second maxima | Worst recorded interval | Seconds exceeding 25 ms | Reported daemon CPU |
|---|---:|---:|---:|---:|
| Main, 10 fps IPC | 25.6 ms | 27.0 ms | 5/30 | 93% |
| Main, modified 30 fps IPC | 30.4 ms | 30.9 ms | 11/30 | 188% |
| Draft branch, modified 30 fps IPC | 26.4 ms | 32.2 ms | 5/30 | 108% |

This is useful evidence for isolating perception/media load. It is not a 30 ms end-to-end response measurement, and the branch did not improve the single worst interval in this comparison. [S13]

### The stock-path fallback

Keep the current guarded Node/HTTP route operational. Move new planner mathematics into a transport-neutral module, preserve one in-flight write, and keep only **one newest unsent absolute intent**. An old unsent intent should be replaced, not appended. Record elapsed time and phase separately. Do not “fix” stalls by replaying missed samples or issuing an unconstrained catch-up jump.

The source route’s `status: ignored` outcome must be distinguished from a stored target. For WebSocket testing, explicit send acceptance, daemon target observation, IK outcome, and native execution remain separate stages because the route does not acknowledge each successful target. [S01]

### The optional helper

The smallest useful helper is not another robot driver. It is one owner of a motion-intent mailbox and planner, using the existing daemon/native serial owner. Keep it inside the public project as an optional component; Rusty Morphospace or Quest tooling is unnecessary.

Start with **no deliberate playout buffer**, a latest-intent mailbox, and a bounded local trajectory generator. A starting design target of **50 Hz local planning and roughly 30–50 fresh intent updates/s** is a proposal aligned with the existing loop, not a guarantee or an optimum. Only add, for example, **20–40 ms** of intentional interpolation delay if measured packet variation makes it worthwhile. Distinguish that delay from the time the velocity/acceleration-limited planner needs to follow a moving target.

A managed on-robot app may interact with the daemon’s app ownership and WebRTC session rules. The 1.10 release introduced app-relay capabilities, but this does not establish that the pinned 1.8 SDK exposes every needed operation. Qualify the chosen app/relay or restricted authenticated helper interface explicitly; do not assume a second ordinary robot session can coexist with the first. [S20]

### Orientation and path representation

Use quaternions or rotation matrices at the phone/headset boundary to avoid Euler wrap and representation discontinuities. Keep the audited row-major wire matrix, world/body conventions, and metre/radian units. Crucially, **do not replace Pollen’s path policy with unrestricted shortest-path SLERP during the comparison**: `GotoMove` intentionally interpolates yaw as a scalar and SLERPs the pitch/roll residual, avoiding a route through the back. [S06], [S07]

SLERP alone does not make repeated retargeting velocity-continuous. Preserve planned angular velocity and acceleration when changing goals, and account for the relationship between local rotation-vector coordinates and physical angular velocity. Near neutral, a restricted rotation-vector chart can simplify an initial implementation; it is not a globally valid Euler replacement.

Task-space interpolation gives understandable head paths but does not impose identical actuator velocities: IK is nonlinear. Joint-space planning offers direct joint bounds but can curve through an unsafe Cartesian region. For this project, start with a validated small task-space envelope, check the resulting joint path and braking path, and defer generalized joint-space optimization.

### Ruckig and filters

Ruckig’s Community implementation is a credible candidate for synchronized online position/velocity/acceleration retargeting under velocity, acceleration and jerk bounds. It is MIT-licensed. Its predictive **Tracking interface is Pro**, and Community intermediate-waypoint behavior can use a cloud service; neither should be accidentally assumed to be a free local real-time feature. Do not send every new noisy pose as a rest-to-rest waypoint. [S23]

Minimum-jerk timing does not mean zero jerk or an automatically satisfied actuator jerk limit. The standard rest-to-rest quintic has zero endpoint velocity/acceleration but need not have continuous jerk across joins. A jerk-bounded S-curve or online trajectory generator needs explicit limits and a valid initial state; a nice-looking easing function alone is insufficient.

A small bounded quintic replanner is another reasonable initial option, provided each update preserves the current planned state and the full segment is checked against bounds. A first-order or One Euro input filter can reduce sensor noise with less lag at higher speeds, but does not itself guarantee bounded robot acceleration, jerk, braking distance, or safe retargeting. [S24]

## 5. Hardware interpretation without premature tuning

### Servo identity and firmware

Pollen’s current hardware page lists six **XL330-M288-T** Stewart motors, **XL330-M077-T** antennas and a custom **XC330-M288-PG** base. ROBOTIS identifies XL330-M288 as **model 1200**, but the standard XC330-M288 as **1240**. The supplied seven-channel readback therefore does not straightforwardly match the current standard-base identity. Possible explanations include robot revision, the custom variant, a different installed motor, or an identification/decoding assumption. None is established. [S14], [S15], [S25] [B:83–97]

Resolve this with a revision-specific BOM/label record and existing-owner per-ID raw model/firmware bytes, including response-ID validation. Do not infer the installed mechanism from the Rust source filename. The reviewed public firmware-53 notice concerns indirect-address/data layout; it does not establish a particular PID improvement or explain the observed factor-of-two PWM relationship. [S26]

### Profiles, gains, and output

For the documented XL330 semantics, drive mode 0 uses the velocity-based profile interpretation; zero Profile Velocity and Acceleration do not mean “do not move.” A nonzero profile is regenerated by new position goals, so changing profiles would change the control system rather than merely improve network timing. The supplied internal trajectory already near goal makes a slow unfinished internal profile a weak explanation for those static brackets. [S14] [B:78–94]

Mode 3 is position control with a PWM-stage limit. Do not treat Current Limit or Goal Current as necessarily the active mode-3 effort ceiling. P-table scaling by 128 is not a complete encoder-error-to-raw-PWM transfer function. Current readback is not calibrated head torque; Moving Threshold is not a documented static position deadband. The model manuals and current measurements do not justify doubling P or rescaling telemetry from the approximate half-product fit. [S14], [S15] [B:85–96]

Documented gain-table scaling is P/128, I/65,536 and D/16, with both feedforward tables scaled by 1/4. The XL330 tables use 0.113% per PWM count and 1 mA per current count. These units do not supply the missing complete firmware transfer law or calibrate head torque. [S14], [S15]

A P-only controller can require nonzero position error to sustain a load, and friction can produce stick-slip or different breakaway times across joints. These are engineering explanations consistent with some supplied observations, not an identified firmware law. Small sparse PWM readings do not prove continuous lack of saturation or mechanical health.

### Voltage: a genuine documentation boundary

Pollen specifies robot input **6.8–7.6 V** and says its higher voltage is intentional. The standard ROBOTIS component documentation has a lower recommended operating range. A robot-level input specification is not, by itself, a revision-specific explanation of the voltage at each servo or its protection policy; your servo-side readback makes this distinction relevant. [S25], [S27], [S14]

Record the unchanged alert, torque-enable, supply, and protection configuration as context. Ask for manufacturer guidance on the installed revision’s approved supply, servo customization, shutdown mask and threshold policy before any protection or voltage changes. The hardware-error flag is real; its presence is not proof of torque loss, and intentional system voltage is not proof that every alert may be ignored. The supplied record does not establish the actual shutdown-mask configuration. [B:89–97]

### Accuracy and contact

No checked source established a manufacturer Cartesian repeatability or accuracy guarantee that validates 1 degree / 1 mm across this workspace. Encoder resolution is not head accuracy. Link lengths, homing offsets, joint compliance, backlash, assembly alignment and the FK model can matter; quantization also maps through the pose-dependent Jacobian rather than a fixed servo-to-head scale.

Preserve the current arrival/freshness rule as the primary acceptance criterion. Separately report repeatability, FK error, raw joint following error, and external pose error. A correctable FK calibration error cannot alone explain a raw motor goal/present-position gap. An IK-valid command cannot certify shell clearance. The +50 mm forward request and other known contact poses remain excluded from motion-quality inference. [B:99–131]

## 6. Ranked hypothesis matrix

Rank is the next diagnostic priority within a problem class, not a posterior probability.

| Hypothesis / class | Supporting and opposing evidence | Predicted signature | Minimum discriminating observation / what would substantially weaken it |
|---|---|---|---|
| 1. Time-warped PC reference / dynamic | Serialized HTTP and nominal-dt increments plausibly stretch speed; Sleep is local. But there is no aligned sent/IK/physical trace proving causality. | Command-phase pauses coincide with physical speed ripple; local matched easing improves it. | Compare PC and local minimum-jerk with phase/timing and independent video. Equally irregular local motion with clean local timing weakens transport as the principal cause. |
| 2. Boundary acceleration and reversal response / dynamic | Linear starts/stops differ from Sleep; larger swings helped antennas in #1402. Amplitude and peak-speed confounds remain. | Jitter concentrates at starts, low-speed sections or reversals; easing changes it at matched geometry. | Three-arm comparison plus a duration/peak-speed control only if needed. No reproducible dependence on boundaries or speed weakens this account. |
| 3. P-only load error, friction or backlash / static and dynamic | Goal/trajectory/present gaps and I/FF zero are compatible; sparse PWM does not identify the mechanism. | Stable per-joint residuals, direction dependence, stick-slip or load/pose dependence. | True opposite-side common-target approaches. Disappearance of the motor residual when delivery is made stable weakens a persistent actuator-level account. |
| 4. Competing tracking/wobble ownership / dynamic or apparent nonresponse | Sleep quiesces aims; pinned setter can suppress manual IK at full tracking weight; #1453 is relevant shared-code evidence. No proof it was active in these trials. | Requested pose and applied IK pose diverge, or manual changes do not set an effective new joint target. | Explicitly record and freeze aim policy. Persistent jitter with all secondary aims absent rules this out for that condition. |
| 5. Backend/native scheduling or queue age / dynamic | FIFO, blocking enqueue, serial retries, Python/media work are concrete mechanisms; occupancy was not measured. | Command age or loop tails grow before jerk; queue may persist after input release. | Passive enqueue/dequeue and loop timestamps. A consistently empty/young queue and regular execution during jitter weaken it. |
| 6. Goal quantization / fine motion | Integer goals and a known one-count roundtrip defect can form plateaus. They cannot alone explain large measured static gaps. | Irregular encoder-count step spacing and identical consecutive quantized goals. | Offline convert actual planned joint traces; compare plateau timing with video. Jitter uncorrelated with count transitions weakens dominance. |
| 7. Profile regeneration / dynamic | Relevant when nonzero profiles are used. Supplied profiles are zero and static trajectory is near goal. | Internal trajectory has repeated unfinished ramps or lags changing goals. | Sparse existing-owner snapshots plus manufacturer semantics. Goal/trajectory agreement during the phenomenon weakens it. |
| 8. Calibration/FK / accuracy | No optical reference; plausible geometry/offset error. Cannot by itself explain raw joint following error. | Repeatable difference between encoder-FK pose and external head pose. | Calibrated head/body markers at nominal height. Agreement within measurement uncertainty weakens it as the main accuracy cause. |
| 9. Power/protection or mechanical defect / separate hardware concern | Voltage alert and contact history warrant attention. Moving torque bits and #1402’s correction oppose a universal voltage-stall explanation. | Time-correlated supply droop, protection transition, torque loss, heating or repeatable mechanical restriction. | Passive electrical/status context and attended observation. Stable flags alone neither prove nor exclude a transient power mechanism. |
| 10. Missing subnet route / connectivity only | Route add/remove intervention is strong supplied evidence. No evidence tying it to every delayed request or jerk. | Shared external loss while loopback/gateway work and the native on-link unicast route disappears. | Triggered route/ARP/NM capture. Healthy routes during a latency event mean that event needs a different explanation. |

Do not combine these into one “smoothness score.” Motion quality, steady-state error, arrival, freshness faults and connectivity loss require separate outcome columns.

## 7. A small, high-information experiment campaign

### Campaign contract

Use one explicit owner, one awake session, original gains/modes, and the established diagnostic baseline. Reuse verified archives. Do not perform a full software restore, backup duplication, or Wake/Sleep cycle between ordinary conditions. Restore settings at actual condition boundaries and on exit; retain all uncertainty barriers. Existing fresh-status admission, identity/version checks, command epochs, omitted-target preservation and controlled recovery remain unchanged. [B:147–167]

Begin at nominal height with visibly clear shell separation. Use a plainly visible angular excursion before millimetre-scale motion or extreme poses. **Proposed initial geometry:** an approximately 15-degree roll excursion and return, followed by yaw only if needed. This is a test proposal, not certified clearance. A preliminary smaller excursion and attended inspection determine whether that geometry is admitted; the +50 mm forward pose and known contact regions remain excluded.

Do not require a failed nominal “neutral” command to magically become accurate before learning anything. Choose a stable, reproducible actual start, record the complete requested and measured matrices, and match it across conditions. Failed or interrupted start preparation is not a completed experimental leg.

A small first screen is **three matched blocks of the three primary conditions**, counterbalanced in order. This is an engineering screen on one robot, not a population study. Repeat only to resolve a specific ambiguity. There is no arbitrary whole-campaign timeout; each leg retains its existing settling/recovery rules.

### E0 — Software-only preparation, then one bounded observer check

**Question:** will the experiment compare the intended waveforms without changing safety or measurement meaning?

**Software-only work:** verify the exact six-axis matrices, body reference, axis preservation, row-major conversion, nominal versus actual planner phase, endpoint remainder, and interpretation of ignored/failed/unknown writes. Exercise visibility loss, coalescing, epoch changes and expiry with a fake transport. Check the corrected raw-reader pacing, including cooldown inherited from an earlier native read. Do not rerun a broad unrelated qualification campaign before every observation.

**Attended stage:** while stationary under the owner, admit one cached-pose/native observation sequence at the corrected pace. Raw native reads start no earlier than **1.25 seconds after the preceding read completes**; a failed native request is not retried. Independent cached-pose observations may continue only while their own admission remains valid. This validates the observer without replaying Sleep. [B:139–143]

**Capture:** observation start/end times, cache generation where available, exact failure class, and native cooldown state. **Pass:** no overlapping mandatory batches, correct inherited cooldown, no hidden retry or motion action from observer failure. **Recovery:** retain the same parked owner; unknown outcomes remain inhibited.

### E1 — Three-arm trajectory/location comparison

**Question:** how much improvement comes from easing, and how much from placing the timed path on the robot?

| Arm | Generator | Time law | Purpose |
|---|---|---|---|
| A | PC, current admitted HTTP path | Linear shared progress | Current reference behavior. |
| B | PC, same HTTP path | Minimum-jerk shared progress | Isolate the effect of an eased desired trajectory, including its higher peak speed at matched duration. |
| C | Daemon-local `goto` | Confirmed default minimum jerk | Test execution location with matched geometry and nominal timing. Do not rely on the ignored HTTP interpolation field. |

Hold constant the complete destination matrix, body yaw, nominal height, antenna target/policy, original gains/modes, tracking/wobble/speech policy, media state, observation load, and external camera position. Match the full measured start between conditions. **Proposed exploratory start-match gate:** no more than 1 degree combined angular and 1 mm combined translational difference, while preserving the ordinary **0.25-degree body-reference rule**. This proposal concerns *between-condition start similarity*; it does not relax endpoint arrival or freshness. Tighter gates are preferable when naturally attainable.

The robot-local move starts from a fresh daemon present pose. Seed the PC path from an equivalently fresh measured start rather than a stale nominal waypoint. Preserve all six axes even in a “roll-only” experiment. For subsequent mixed-axis work, reproduce Pollen’s scalar-yaw/residual-rotation path as well as its time law. [S02], [S06], [S07]

For a rest-to-rest quintic,

$$
s(u)=10u^3-15u^4+6u^5,\quad u=t/T,\quad \max \dot s=1.875/T.
$$

Thus **15 degrees over 3 seconds has peak speed 9.375 degrees/s**, whereas a same-duration linear path moves at 5 degrees/s. Those are calculations, not measured performance. Increase the common duration when the actual full-pose span or translation limits require it. Check all task and joint limits along the path; task-axis speed limits do not automatically bound every actuator. [S07] (mathematical derivation)

**Timing caveat:** the current capped-dt HTTP scheduler can make actual duration longer than requested. Record that as an outcome, not as a matched-duration success. Do not issue unsafe catch-up increments to rescue the comparison. If B and C differ materially in actual duration or peak speed, add just one discriminating control: run local minimum jerk with the observed PC duration, or replay the observed PC phase function locally. The former controls average duration; the latter more closely separates a distorted reference from downstream response. Neither should be mislabeled as a pristine minimum-jerk path when it is not.

**Capture:** intended path, planner phase, exact sent matrices, send/start/header/body/ack times, requested target and IK revisions where available, cached joints/FK with ages, native snapshots only at the approved pace, task start/finish/cancel events, and independent physical video. Record the endpoint explicitly on the PC path. For the local path, verify the final stored/computed target and label any later endpoint correction as a separate intervention—not part of the timed result.

**Outcomes:** visible smoothness, velocity ripple, coordination, actual duration, following error, terminal pose error, arrival under the unchanged rule, and faults. Shuffle condition labels on video clips for a simple blinded comparison. Estimate the video measurement floor from a stationary clip before interpreting differentiated motion as physical jerk.

**Decision:**
- B improves substantially over A and C adds little: prioritize a transport-neutral browser/Node planner; a local helper may be unnecessary.
- C improves substantially over B, including after the duration control: prioritize a local intent follower and stage-timing instrumentation.
- All arms have regular references but similar visible stick-slip or terminal motor error: prioritize actuator/geometry diagnosis; do not keep escalating network rate.
- Only secondary-aim removal changes the result: resolve ownership first.

An effect should exceed ordinary within-condition variation and recur across the initial paired blocks. A better-looking clip with worse interruption behavior is not a successful teleoperation architecture.

**Stop/recovery:** existing stale-status and uncertain-write barriers remain. Contact, unexpected tilt/translation, loss of identity/ownership, or an unaccounted motion writer ends the leg. Park using the established controlled procedure; never replay an interrupted target automatically.

### E2 — Continuously retargetable motion, release and bounded loss

**Question:** can the chosen path change direction promptly without discontinuity or stale replay?

**Software-only stage:** exercise a live goal sequence whose next direction is not known to the planner. Include a mid-ramp reversal, release near peak velocity, a short packet gap, increasing-sequence packets with old source timestamps, duplicate and reordered messages, browser backgrounding, and reconnect under a new epoch. Use virtual transport faults, not servo tuning.

**Held constants:** the contact-free envelope and admitted velocity/acceleration policy, the same planner, and the same input-to-head scale. Do not compare a slow safe path to an unconstrained fast one and call the latter lower latency.

**Attended stage:** first use predictable manual reversals at small amplitude; then operator-timed changes; only then bounded delay/loss injection that already passed offline. Candidate test gaps such as 20, 40, 80 and 150 ms are **proposed stimuli**, not assumed network statistics. Stop before expanding the disturbance envelope if an earlier condition fails.

**Capture:** source-event timestamp semantics, receiver age bound, latest accepted sequence, current planned pose/velocity/acceleration, unsent count, transport queue indicator, physical onset of response to reversal, maximum post-release travel, time to bounded hold, and the identity of any packet admitted after expiry.

**Decision criteria:** no old-epoch target is applied; expired source samples do not renew the lease; release cannot complete an old destination or trigger return-to-neutral; unsent motion storage remains bounded; rearming is explicit. Quantify response delay and post-release travel before selecting a product latency target. A **candidate 100–200 ms source-age lease** may be evaluated, but it is not qualified and does not replace the existing 500 ms telemetry freshness requirement.

A browser-side deadman cannot stop a disconnected robot by sending one more packet. Robust link-loss behavior requires the receiver to expire intent and brake locally. That guarantee is still conditional on the helper, daemon and native path continuing to execute; it is not a hardware emergency stop.

### E3 — A genuine common-target, opposite-approach test

**Question:** does the persistent residual depend on the actual approach direction or speed?

Use the same complete six-axis destination, body yaw, antenna policy, aim policy and original gains. Establish the two starting sides from **measured** pose, not requested waypoints. The start must lie beyond the target on the intended side by more than the measured uncertainty and natural variation. A proposed 2-degree separation can be useful only if the measurement uncertainty is comfortably smaller. [B:99–101]

Approach the common target from each side at the same bounded trajectory law and duration. Capture at least a few valid target-stable native brackets, respecting the existing read budget, and an external video/marker observation. Record the computed joints, integer goals, trajectory, present position, signed effort/current, voltage, flags and full FK residual. Do not compare only head yaw.

**Decision:** repeatable direction-dependent raw motor residuals support a backlash/friction/history mechanism. Similar bias from both directions may fit load or geometry/calibration mechanisms, but does not uniquely identify them. A disappearing residual under stable delivery changes the priority back toward scheduling or interaction between reference shape and actuator response.

Do not call a pair complete when the second side was never measured. Recovery holds, contact or a body-reference change break the matched pair. Preserve those records as separate exploratory observations and resume only the next unissued, explicitly reviewed leg.

Only after this result is interpretable should a duration/speed variant be added. Gain, integral, mode, profile and firmware trials remain separate and depend on a qualified handoff—not merely a successful disabled-only register restoration.

### E4 — Instrumentation load and ordinary UI load, separately

**Question:** is the measurement apparatus or normal camera/audio use changing the motion?

First compare the selected motion with minimal cached telemetry versus the approved sparse native diagnostics. Then, in separate arms, add the ordinary camera/audio UI load. Keep secondary aim/wobble sources quiescent for this load-only comparison; an audio feature that re-enables motion offsets requires a separately labelled behavioral arm. Do not begin by changing IPC frame-rate constants, running a vision stress test, or polling every register at high rate.

Capture CPU load, relevant loop-duration tails, enqueue/dequeue age if instrumented, cache ages, failed/slow mandatory batches, media configuration and external video. Compare identical paths under the same owner. PR #1409 motivates this separation, but its modified 30 fps test is not your baseline and its numbers cannot be imported as your latency budget. [S13]

**Decision:** diagnostics-dependent degradation calls for a lighter capture path before motor conclusions. Media-dependent degradation calls for scheduling/rate isolation; it does not establish a Wi-Fi routing fault. Preserve freshness guards even if a lighter read path is introduced.

## 8. Telemetry with explicit temporal provenance

### A stage-correlated record

| Stage | Fields to retain | Meaning / limitations |
|---|---|---|
| Input source | Stream ID, epoch, sequence, source event timestamp and its semantics, local receive time, held/visible/armed state, complete intended pose. | Sensor acquisition, event creation and callback execution are not interchangeable. |
| Planner | Monotonic tick time, desired deadline, actual elapsed time, phase, planned pose/velocity/acceleration, constraints, target sequence, coalescing reason, overrun decision. | Distinguishes intentional easing from time stretching or stale intent. |
| Sender | Serialization revision, send-start/end, bytes/queue indicator, HTTP headers/body completion or data-channel send result. | Transport acceptance is not robot acceptance; `bufferedAmount` is not total end-to-end queued work. |
| Daemon target | Target revision, server receive time, requested head/body/antennas, active aim/ownership policy, explicit ignored/rejected outcome. | Target storage can precede IK and can be superseded. |
| IK/backend | IK input revision, output joint vector, success/failure, completion time, next native enqueue revision. | Invalid IK must not masquerade as new executed motion. |
| Native owner | Enqueue/dequeue/serial-operation start/end, operation type, sequence correlation, queue depth and oldest motion age. | Requires narrow instrumentation; logging must not create a new bus reader. |
| Servo registers | Per-ID goal/trajectory/present, PWM/current/voltage/flags/mode; request start/end and sample order. | Sparse sequential transactions, not simultaneous motor samples or calibrated torque. |
| Feedback | Native cache generation/completion time, FK generation/input revision, HTTP response creation time, client batch-start age. | Preserve all three time domains rather than calling them “the timestamp.” |
| Physical observation | External video frame times, head and base markers, calibration/uncertainty, contact notes, human quality ratings. | Needed to establish actual head motion independently of encoder-derived FK. |

The supplied 500 ms rule is based on **mandatory batch start**, including all response work, and remains unchanged. A newly returned response can already be too old by that definition; individually fast reads do not prove overall freshness. Keep mandatory batches shared and nonoverlapping, retain the existing sequential-attempt spacing policy, and do not add idle delay after an already slow batch. [B:147–151]

### What is available without new raw-register traffic

Existing cached pose/joint observations can describe the coarse physical-following pattern and admission state. Their limitations are acquisition age, FK generation, and cache reuse. Start with better timestamp/revision propagation and passive event logging, not more serial transactions. The native controller already has a serial owner and timing windows; a low-allocation, bounded ring of timestamps and revision IDs is a more appropriate addition than synchronous per-tick text logging. [S03], [S04]

Read raw registers only through that owner, at the admitted cooldown. Do not attempt a high-rate seven-motor onset experiment using the 1.25-second raw-read path. A future optimized block/indirect read belongs to a separate review of model, firmware-53 layout, bus budget and scheduling; it is not needed for the first comparison.

### Clocks and latency

Use `performance.now()`/monotonic clocks for within-process intervals. Record a session/boot identifier and an optional wall-clock anchor for human correlation, not arithmetic across unsynchronized hosts.

For phone → PC → robot, retain source identity and source-age information across both hops. Do not replace it with a fresh PC receipt timestamp. An offset-estimation handshake can bound age, but unknown asymmetry prevents an exact one-way latency claim. Include the uncertainty in admission; an increasingly stale source must not be kept alive by a healthy relay heartbeat. The orientation specification does not promise a particular inertial acquisition cadence for every browser/device. [S28]

Use matched event IDs to separate send-to-ack round trip, daemon processing, queue residence, and physical response. A camera round trip includes a different return-media path. Do not subtract an assumed half-RTT and present the result as measured actuator latency.

### Independent optical observation

A stationary external camera viewing both a rigid head marker and a base marker is the most informative low-risk addition. A camera actually recording 120 frames/s samples every 8.33 ms; that is a sampling interval, not guaranteed pose accuracy. Calibrate scale/intrinsics for metric translation, account for perspective and rolling shutter, and estimate the stationary noise floor.

Use video first for onset, stop/start events, rotation continuity and visible contact. Upgrade to calibrated multi-marker pose estimation only where millimetre/degree claims require it. Numerical jerk is a third derivative and amplifies measurement noise; report velocity ripple and visible pauses before claiming precise jerk from noisy marker tracks.

Keep the project’s existing combined arrival metric unchanged. An additional SO(3) angular-error column can help compare orientation without Euler artifacts, but must not silently replace the original acceptance calculation.

## 9. Implementation plan and non-runnable scheduler pseudocode

### Ranked small changes

| Priority | Change and placement | Expected value / effort / boundary |
|---|---|---|
| P0 | Public browser/Node: make planner phase, exact write outcomes, newest unsent intent, and source age explicit. | High diagnostic value; small, reversible changes. Keep current transport and guards. |
| P0 | Private/optional experiment runner: one-owner three-arm campaign and corrected observer. | Highest immediate information gain; no new motor parameters or full restoration per leg. |
| P1 | Shared planner module: bounded eased paths and continuity-preserving retargeting. | Useful on stock daemon; test transport-neutral mathematics offline. Do not claim jerk bounds from an easing curve alone. |
| P1, conditional | Optional on-robot intent follower with a local lease and planner. | High value if placement/loss tests justify it; moderate integration and attended validation. |
| P2 | Versioned WebSocket or SDK transport adapter, including explicit backpressure/freshness behavior. | May reduce overhead; not a complete smoothness fix and not an automatic Stop-equivalent replacement. |
| P2, evidence-gated | Daemon/native passive revision and queue-age instrumentation; later motion mailbox if needed. | Changes the last-mile evidence/control boundary; no second serial owner. |
| Separate correctness fix | Bounded integer conversion repair in its own review/qualification path. | Addresses a demonstrated numerical defect, not the main degree-scale residual. |
| Deferred | Gains, profiles, operating mode, firmware, protection and supply changes. | Require hardware identity/manufacturer clarification and separate handoff qualification; low diagnostic value as a first combined intervention. |

### Intent and receiver policy

The stream should carry complete absolute motion intent or an explicitly masked patch resolved against the last accepted commanded state, plus owner, epoch, sequence, source stream, source-age evidence and held/armed state. The receiver must reject expired source data even when packet sequences continue increasing.

Coalesce only replaceable motion state. Stop, arming, power, mode and maintenance operations are barriers or transactions, not values to discard with an old pose. Do not give a fresh target a new timestamp merely because it was retransmitted.

The following is **architecture pseudocode**, not a runnable robot-control or tuning program:

```text
SOURCE / RELAY
  on genuine input observation:
      require explicit authorization and held/visible input state
      preserve source stream ID and source timestamp semantics
      form absolute intent using the current command baseline
      replace newest_unsent_motion; never append a motion FIFO

  on eligible send opportunity:
      if source age is no longer admissible:
          revoke this epoch; discard newest_unsent_motion
          invoke the established release/stop protocol
      else if a write is in flight or transport is congested:
          retain only the newest still-fresh unsent motion
      else:
          send newest_unsent_motion once
          record accepted / rejected / failed / unknown separately

ROBOT-SIDE INTENT FOLLOWER, WHEN PRESENT
  on intent packet:
      verify authenticated owner, admitted identity/version and epoch
      reject duplicate, reordered, expired or unauthorized intent
      do not renew a lease from stale source samples
      preserve omitted targets against the accepted command state
      replace latest_intent; update receiver-local lease deadline

  on monotonic planning tick:
      if ownership, telemetry admission or execution state is uncertain:
          invalidate epoch and enter the existing inhibited recovery state
          do not guess a fresh physical pose or replay a destination
      else if lease expired or input released:
          discard future intent
          start an already-validated bounded braking/hold trajectory
          from the current planned state, not from the old destination
      else:
          retarget from current planned pose, velocity and acceleration
          validate the trajectory and braking path inside the admitted envelope

      if scheduling overrun exceeds the qualified envelope:
          inhibit / use the established controlled recovery
          never burst missed samples or jump to a distant wall-clock point
      else:
          advance the valid planner within its step and derivative bounds
          publish one coherent head/body/antenna update through the existing owner
          record phase stretch, revision and execution evidence

  on rearm:
      require a new explicit authorization and fresh baseline
      create a new epoch; discard all previous stream state
```

A release trajectory must stop within an admitted travel envelope; it must not finish a stale target. Near contact or under unknown execution state, use the already established recovery policy rather than an improvised new brake. A planner’s theoretical jerk bound is conditional on timely execution and a compatible state estimate.

### Browser and WebRTC details

Do not tie robot command scheduling solely to `requestAnimationFrame`. It is a rendering cadence, not a control guarantee; background timer behavior differs from foreground behavior. A worker can separate rendering load but cannot provide a hard real-time promise. Visibility loss must revoke input, not rely on a future timer eventually firing. [S29]

The reviewed motion data channel is reliable/ordered. `bufferedAmount` reports locally buffered application data, not remote execution or all network buffering. Once a reliable message is handed to the channel, application-side coalescing cannot retract it. Motion-specific queue limits therefore need receiver freshness protection as well as a sender policy. A separate partial-reliability motion channel would require an explicit daemon/SDK protocol change; the existing lossy telemetry channel cannot be repurposed from the browser. [S05], [S08], [S09], [S30]

Avoid bulk uploads during a latency experiment. Video and motion have different buffering semantics, although they can contend for CPU and bandwidth. The robot’s audio or browser video jitter-buffer settings must not be described as a motion interpolation buffer. [S08]

### Phone and headset qualification

First verify frame conversion, neutral calibration/clutching and turn/nod/tilt signs in simulation. Then qualify the same live planner with synthetic unpredictable input on the device, and finally attach phone orientation at a conservative mapping scale. Do not infer translation by integrating acceleration. Direct Android → robot and Android → PC → robot need separate source-age and interruption results; a relay adds another scheduling and transport boundary. [B:26–33]; [S28]

## 10. Developers using Reachy Mini: reusable techniques and limits

| Implementation / source | Actual technique inspected | What to reuse | Limits, version and license |
|---|---|---|---|
| Pollen Marionette experimental, commit `06c126066bcfef829d685f21cec5cd33f1a01f18`, 19 May 2026 | Browser-frame playback replaced by uploaded robot-local playback, with cancellation. | Separate upload/prepare from timed execution; a useful point-to-point/playback contrast. | Author-reported improvement, not a live-head-tracking benchmark. The inspected package metadata does not declare a license; resolve reuse rights before copying app code. [S12], [S31] |
| HRI-EU `reachy-vr-quest`, commit `242120ee9e356e4a4f2117ee56c8b340c9b7ec64` | Reachy Mini Quest/Unity client using the stock target WebSocket; worker takes newest outgoing payload, with generation checks and separate sound work. README describes 30 Hz pose publication. | Coordinate conversion, latest-value sending, separation of rendering/sound and pose transport. | MIT project; not a Wireless 1.10 latency qualification. Its `autoWakeOnStart` policy must not be copied. Unity is not a required dependency for your project. [S32], [S33] |
| Pollen Hand Tracker V2, source file revision `1abda7c` | Nominal 50 Hz target loop; visual dead zone, bounded image error, incremental yaw/pitch and separate vision work. | Separate perception cadence from motor-reference cadence; preserve a command-state baseline. | No measured smoothness/latency in the inspected code. Its lost-hand return-to-neutral and broad angle bounds do not fit your deadman/clearance policy. Package 0.1.0 has an unpinned `reachy-mini` dependency and no license field in inspected metadata. [S34], [S35] |
| Pollen Telepresence, current tree observed at `30b19c6` | Phone-oriented camera/audio/joystick app; inspected host/embed lifecycle and explicit microphone handling. | Integration reference for real browser media plus command UI; inspect ownership side effects before reuse. | Current tree pins SDK 1.11.0, unlike yours. README declares application glue MIT. The command-loop implementation was not fully audited here; no update-rate or motion-quality claim is made from the UI. [S36], [S37] |
| Pollen Debug/CI Testbench, current tree observed at `480b0cc` | README separates SDK diagnostics from offline direct-bus diagnostics. | Diagnostic categories and manufacturer maintenance vocabulary. | Not a ready-made metrology or teleoperation acceptance test. Direct-bus tests require daemon shutdown and must not run beside your serial owner. License/code-level test details were not fully established here. [S38], [S39] |

The first-hand counterexamples in the evidence ledger matter as much as the demonstrations. They leave room for both timing and actuator-response mechanisms; they must not be treated as a shared diagnosis. [S10], [S11]

Issue #589 was closed in January 2026 with a reference to a newer revision and discussion elsewhere. The accessible material did not identify a precise public fix that can be mapped to this robot’s firmware-53/base revision. Inaccessible Discord explanations were not treated as read or as community consensus. [S40]

For reuse, retain the public project’s MIT license for original work while preserving any dependency-specific notices. The Pollen SDK declares Apache-2.0; Ruckig Community and HRI-EU’s project declare MIT. Do not extend those declarations to animation assets, CAD, models or other Space repositories without checking their own terms. [S16], [S23], [S32], [S41]

## 11. Focused networking appendix

### The most defensible diagnosis

For the historical incident, **routing loss is strongly supported**: Wi-Fi association and IPv4 assignment remained, loopback daemon and gateway access worked, client routing went through the gateway, and installing/removing the bounded on-link route restored/reproduced external failure. That is much more specific than “Wi-Fi became unreliable.” The actual ACD-triggering packet was not captured, so genuine duplicate addressing, malformed/translated ARP, and implementation/driver interaction remain unresolved. [B:173–182]

In upstream NetworkManager 1.52.1, ACD availability-state changes can schedule L3 configuration reconciliation. The code also has special handling for an address already configured on the link, and explicit conflict/reprobe paths. These are relevant audit sites for the retained-address/route inconsistency; source structure alone does not prove the exact path taken on the downstream Raspberry Pi package. [S19]

The review did **not** establish a released upstream fix that demonstrably repairs this exact event while preserving live-duplicate rejection. Later NetworkManager/n-acd changes are not sufficient evidence to prescribe an upgrade. The supplied namespace candidate likewise remains a candidate: the retained-address link-reset gap, unknown original trigger and missing ARM/kernel/driver qualification must remain visible. [B:180]; [S42]

RFC 5227’s ordinary ARP probes use a zero **sender protocol/IP address**. That is not the same as the logged all-zero **sender hardware/MAC address**. Do not normalize the latter into “just an ordinary probe,” and do not identify a particular device from it. ACD exists to avoid conflicting use of an address; disabling it or forcing reachability through a real duplicate would undermine that purpose. [S43]

### Workaround boundaries

The saved extra route is an access workaround, not repaired conflict detection. Keep its exact network scope, owner and rollback record. Count a main-table unicast subnet route, not a local-table/broadcast entry. Distinguish the native route from the manually configured route in every snapshot; otherwise a successful reboot only demonstrates workaround persistence. Do not copy the route to a different network. [B:176–180]

Repeated daemon restarts are not a repair for an absent OS route, and the supplied Bluetooth restart did not restore it. A browser guide can diagnose and navigate to supported recovery, but cannot repair privileged routing without a separately authenticated capability. Web Bluetooth requires actual platform support, a secure context and user-mediated device access; test capabilities rather than assuming every browser can provide the same recovery path. [B:177–184]; [S44]

### A compact failure-classification table

| Observation | Next layer to inspect | Do not conclude |
|---|---|---|
| One browser fails, another client succeeds | Browser permission, local-network access policy, origin/CORS/TLS and cached app state. | Robot-wide OS routing loss. |
| Both clients fail; loopback daemon also fails | Daemon/service/listener status and expected maintenance state. | ACD route loss without route evidence. |
| Both external clients fail; loopback and gateway work; native subnet route is absent | Route policy/table/source selection and NM/ACD event history. | A motor or Sleep fault. |
| Local HTTP works; remote WebRTC fails | Signaling authentication, ICE/TURN DNS and peer/session lifecycle. | Recurrence of the local route event. |
| HTTP requests are slow but route remains healthy | Queueing, daemon scheduling, media/diagnostic load and ordinary link delay. | Complete connectivity disappearance. |

Chrome’s Local Network Access behavior has changed over time, so the guide should record actual browser/version and observed permission/error behavior rather than fossilizing an older Private Network Access preflight proposal. A browser denial cannot remove a Linux route; simultaneous symptoms still require separate evidence. [S45]

### The smallest useful capture plan

Run the network diagnostic **outside an active motion experiment**, with the robot parked/asleep as appropriate. Avoid indefinite unchanged polling. Use bounded ring capture and event-triggered retention:

1. **Packets:** ARP including Ethernet headers and full sender/target fields; DHCP transactions and client identifiers. Retain the packet preceding an ACD event, not merely the formatted log.
2. **Kernel/network state:** address and route netlink events, interface indices, main and relevant policy-routing tables, route ownership/metric/protocol, rules, and effective route to the client. Preserve native-versus-workaround distinction.
3. **Daemon/link context:** targeted NetworkManager ACD/L3/DHCP logs, monotonic/boot correlation, kernel Wi-Fi/driver link events, BSSID transitions, and intentional service-state changes.

On the next matching failure, freeze the pre-event buffer and capture one concise state snapshot. Do not immediately restart services and erase the sequence. An operator-approved recovery can follow retained evidence.

Reproduction should first use the already available isolated namespace approach: retained address plus transient conflict, cleared conflict, genuine persistent duplicate, DHCP renewal/decline, and link reset. Then compare the exact Raspberry Pi package/kernel/driver on an isolated test network. AP proxy ARP, DHCP snooping, roaming or packet translation are hypotheses to vary one at a time only if packet evidence points toward them—not diagnoses inferred from the zero MAC.

**Acceptance for a future repair:** both recovery of the native route after a nonpersistent/invalid conflict and continued refusal/protection against a live duplicate, including the retained-address link-reset case. Connectivity recovery alone is insufficient. No privileged route-repair, reboot or network-patch script is provided here.

## 12. Source catalog and access limits

All sources were inspected or checked on 16 October 2026. Mutable documentation is dated by access; pinned code/commits are used where established. A file’s latest-change revision is not always the whole repository’s current revision. The catalog distinguishes an implementation audit from a README-level lead.

### Exact code and project sources

| Ref | Source / relevant section | Use and limitation |
|---|---|---|
| [S01] | Daemon `app/routers/move.py`, `7f547…`; HTTP/WS target handlers, `goto`, task stop. | Verified routing semantics and interpolation-field omission; not proof of physical execution. |
| [S02] | Daemon `backend/abstract.py`, same commit; target setters, IK, `play_move`, `goto_target`. | Common motion path, local clock/rate, aim composition and completion semantics. |
| [S03] | `backend/robot/backend.py`, same commit; constructor, `run`, `_update`. | Configured 50 Hz layer, pipeline ordering, cached feedback and IK handling. |
| [S04] | Native `src/control_loop.rs`, `dff1…`; channel construction, `push_command`, worker, raw operations. | FIFO/backpressure/read ownership; actual runtime queue occupancy unmeasured. |
| [S05] | SDK `ts/lib/reachy-mini.ts`, tag v1.8.0 / `96f1…`; `setTarget`, `_sendCommand`, upload drain and state refresh. | Distinguishes local send acceptance, uploads and ordinary motion. Npm tarball not independently hashed here. |
| [S06] | `motion/goto.py`, `7f547…`; `GotoMove.evaluate`. | Common progress and scalar-yaw path choice. |
| [S07] | `utils/interpolation.py`, same commit; `linear_pose_interpolation`, `time_trajectory`, `minimum_jerk`. | Exact trajectory mathematics; no hardware accuracy claim. |
| [S08] | `media/media_server.py`, same commit; `_setup_data_channel`, `_setup_pose_channel`, audio and pose settings. | Ordered motion versus lossy outbound telemetry; media buffering is separate. |
| [S09] | W3C WebRTC data-channel specification. | Reliability/ordering/flow-control semantics, not this robot’s measured latency. |
| [S16] | Public browser-controller README, current branch. | MIT project boundaries, admitted version, independent project and Stop caveats. |
| [S17] | Public browser-controller STATUS, current branch. | Dated public receipts; supplied newer brief is authoritative for local context. |
| [S18] | GitHub tag reference for daemon/SDK v1.8.0. | Exact tag-to-commit mapping, not deployed-artifact identity. |
| [S41] | Pollen SDK `ts/package.json`, `7f547…`. | Apache-2.0 declaration; do not generalize to CAD/media assets. |

### Hardware, issues, and first-hand engineering reports

| Ref | Source | Use and limitation |
|---|---|---|
| [S10] | Reachy Mini issue #1402, full accessible discussion, especially correction dated 8 September 2026. | Stalls with clean error registers and amplitude dependence; initial voltage hypothesis withdrawn. |
| [S11] | Conversation app issue #224, opened 28 February 2026, including March maintainer response. | Robot-local jitter counterexample; high rate was disputed as the cause. |
| [S12] | Marionette experimental commit `06c126…`, 19 May 2026. | Concrete move-upload/local-playback change, not a teleoperation benchmark. |
| [S13] | PR #1409, opened 11 September 2026; draft head `4cf26787e9b96a0d463ef6c5038723164430936a`. | First-hand Wireless tracking-load measurements; open/unmerged, behavioral A/B outstanding. |
| [S14] | ROBOTIS XL330-M288 manual; model/control table, gains, profile, voltage sections. | Model-specific documented semantics; not proof of custom firmware internals. |
| [S15] | ROBOTIS XC330-M288 manual; identity and control-table sections. | Standard model 1240 and comparison with XL330; custom PG variant unresolved. |
| [S20] | Reachy Mini releases: v1.10.0, v1.11.0 and v1.12.0. | Dated change leads; no blanket compatibility or motor-quality admission. |
| [S21] | Reachy Mini issue #1453, 5 October 2026. | 1.10 Lite tracking-ownership report; shared-code relevance, not a Wireless reproduction. |
| [S22] | Reachy Mini issue #1449, 4 October 2026. | 1.11 mockup limit-clamping report; not a physical range certificate. |
| [S25] | Pollen hardware documentation. | Current BOM, custom base and robot input range; revision matching still required. |
| [S26] | ROBOTIS XL330 product/firmware-53 notice, July 2025. | Indirect-address layout change; no identified gain-law cure. |
| [S27] | Pollen troubleshooting FAQ, high-voltage explanation. | Manufacturer says voltage is intentional; does not fully explain this revision’s protection configuration. |
| [S40] | Reachy Mini issue #589, including closure discussion. | Earlier voltage/revision context; exact applicable fix not established from accessible public material. |

### Planner, browser and implementation examples

| Ref | Source | Use and limitation |
|---|---|---|
| [S23] | Ruckig official repository/readme. | MIT Community online trajectory generator; Pro Tracking and cloud waypoint limitations matter. |
| [S24] | One Euro filter authors’ project page. | Input noise/lag trade-off; not a safety or jerk-bounded robot planner. |
| [S28] | W3C Device Orientation and Motion specification. | Source events, coordinate and permission context; no universal cadence guarantee. |
| [S29] | Chrome timer-throttling documentation. | Background scheduling limitations; worker/WebRTC activity is not a real-time contract. |
| [S30] | W3C WebRTC specification, data-channel buffering sections. | Same standards document as S09, cited for a different section; not a separate performance study. |
| [S31] | Marionette package metadata at `06c126…`. | Inspected metadata lacks a license declaration. |
| [S32] | HRI-EU Reachy Mini Quest repository/README at `242120…`. | MIT, coordinate/transport integration; no matched Wireless benchmark. |
| [S33] | HRI-EU `ReachyDaemonTargetWebSocketClient.cs`, same commit. | Actual worker/newest-send/generation implementation; startup policies need changing before reuse. |
| [S34] | Hand Tracker V2 `main.py`, latest file change `1abda7c`. | Actual nominal 50 Hz incremental tracking code; unqualified limits/idle policy. |
| [S35] | Hand Tracker V2 package metadata. | Version 0.1.0; unpinned daemon dependency and no inspected license declaration. |
| [S36] | Telepresence README and repository tree. | Mobile media/joystick app, MIT glue, later SDK baseline; not an audited command-loop performance result. |
| [S37] | Telepresence `src/embed.tsx`. | Actual lifecycle/media code; automatic host wake behavior is not your arming policy. |
| [S38] | Pollen Testbench README. | SDK/offline diagnostic split; only README-level review here. |
| [S39] | Official motor-diagnosis guide. | Direct-bus maintenance requires daemon stopped; not for parallel polling during motion. |

### Networking sources

| Ref | Source | Use and limitation |
|---|---|---|
| [S19] | NetworkManager `src/core/nm-l3cfg.c`, tag 1.52.1; `_l3_acd_data_state_change` and state/commit handling. | Relevant retained-address/conflict state machine; downstream rpt4 behavior not reproduced. |
| [S42] | NetworkManager release NEWS. | Upstream change review; no verified exact-event fixed version found. |
| [S43] | RFC 5227. | Correct ARP-probe and address-conflict semantics. |
| [S44] | Chrome Web Bluetooth capability documentation. | Secure context, user gesture and platform capability boundaries. |
| [S45] | Chrome Local Network Access announcement and rollout context. | Browser permission failure is separate from OS routing loss. |
| [S46] | ROBOTIS Protocol 2.0, Sync Write and response-policy sections. | Group command semantics; no guaranteed identical physical actuator onset. |

**Access and scope limits:** private logs and runtime patches were not inspected. Public raw-file access was inconsistent; GitHub connector reads recovered key pinned code. The npm artifact itself was not hash-matched. Some Space source was reviewed at its current public branch rather than a fully frozen dependency environment. The Telepresence command-loop file was not fully inspected, Testbench implementation was not audited beyond its relevant documentation, and inaccessible Discord material was not used. No checked source supplied a calibrated Cartesian-accuracy guarantee, a complete model-1200/firmware-53 PWM law, or a released NetworkManager fix demonstrably matching the supplied retained-address incident. These gaps limit specific conclusions, not the feasibility of the proposed comparison.

## 13. Top three next actions and evidence that changes the recommendation

1. **Prepare the matched awake comparison, not another range sweep.** Add only the missing phase/outcome/observer bookkeeping; retain original gains, nominal height, complete targets and one owner. Capture an external view. Use stock daemon minimum jerk as the local reference rather than repeatedly invoking Sleep.
2. **Run A/B/C and one genuine opposite-side common-target pair.** Separate visual continuity, actual duration, motor following, FK error and arrival. If timing differs, add the single local-duration/phase control that addresses that difference. Do not interpret an unachieved opposite waypoint as a bidirectional experiment.
3. **Choose the implementation branch from those results.** If PC easing matches local quality and release behavior, improve the public planner and retain stock transport. If placement/loss behavior remains limiting, add the small local intent follower. If stable motor residuals dominate both paths, prioritize revision-specific hardware clarification and actuator/geometry evidence before any gain trial. Keep network reproduction separate.

**Unresolved questions:** Can local minimum jerk reliably outperform a timing-matched PC trajectory on this device? Does raw motor error depend on genuine approach direction? Are active aim sources or native command age contributing? What exactly is the installed base motor/firmware customization, and what voltage/protection policy is approved for it? What packet/state transition removed the native route?

**Smallest evidence that would change the recommendation:** one reproducible paired PC/local minimum-jerk result with matched full-pose starts, documented timing, independent video and unchanged gains; plus target-stable native brackets showing whether the motor goal/present gap persists. Comparable PC/local performance would make the helper unnecessary for smoothness. A strong local advantage would justify it. Persistent following error in both would redirect effort below the transport layer.

---

[S01]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/app/routers/move.py
[S02]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/abstract.py
[S03]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/robot/backend.py
[S04]: https://github.com/pollen-robotics/reachy-mini-motor-controller/blob/dff1c536a75735a950564e18240d6a67b056819c/src/control_loop.rs
[S05]: https://github.com/pollen-robotics/reachy_mini/blob/96f1c2e2950ac83871799db37968b6a6fb0bae34/ts/lib/reachy-mini.ts
[S06]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/motion/goto.py
[S07]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/utils/interpolation.py
[S08]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/media/media_server.py
[S09]: https://www.w3.org/TR/webrtc/
[S10]: https://github.com/pollen-robotics/reachy_mini/issues/1402
[S11]: https://github.com/pollen-robotics/reachy_mini_conversation_app/issues/224
[S12]: https://huggingface.co/spaces/pollen-robotics/marionette-experimental/commit/06c126066bcfef829d685f21cec5cd33f1a01f18
[S13]: https://github.com/pollen-robotics/reachy_mini/pull/1409
[S14]: https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/
[S15]: https://emanual.robotis.com/docs/en/dxl/x/xc330-m288/
[S16]: https://github.com/MesmerPrism/reachy-mini-browser-control/blob/main/README.md
[S17]: https://github.com/MesmerPrism/reachy-mini-browser-control/blob/main/docs/STATUS.md
[S18]: https://api.github.com/repos/pollen-robotics/reachy_mini/git/ref/tags/v1.8.0
[S19]: https://github.com/NetworkManager/NetworkManager/blob/1.52.1/src/core/nm-l3cfg.c
[S20]: https://github.com/pollen-robotics/reachy_mini/releases
[S21]: https://github.com/pollen-robotics/reachy_mini/issues/1453
[S22]: https://github.com/pollen-robotics/reachy_mini/issues/1449
[S23]: https://github.com/pantor/ruckig
[S24]: https://gery.casiez.net/1euro/
[S25]: https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/hardware
[S26]: https://robotis.com/shop/item_export_only.php?it_id=902-0162-000
[S27]: https://huggingface.co/docs/reachy_mini/en/troubleshooting
[S28]: https://www.w3.org/TR/orientation-event/
[S29]: https://developer.chrome.com/blog/timer-throttling-in-chrome-88/
[S30]: https://www.w3.org/TR/webrtc/
[S31]: https://huggingface.co/spaces/pollen-robotics/marionette-experimental/blob/06c126066bcfef829d685f21cec5cd33f1a01f18/package.json
[S32]: https://github.com/HRI-EU/reachy-vr-quest/blob/242120ee9e356e4a4f2117ee56c8b340c9b7ec64/README.md
[S33]: https://github.com/HRI-EU/reachy-vr-quest/blob/242120ee9e356e4a4f2117ee56c8b340c9b7ec64/Assets/Scripts/Runtime/Transport/ReachyDaemonTargetWebSocketClient.cs
[S34]: https://huggingface.co/spaces/pollen-robotics/hand_tracker_v2/blob/main/hand_tracker_v2/main.py
[S35]: https://huggingface.co/spaces/pollen-robotics/hand_tracker_v2/blob/main/pyproject.toml
[S36]: https://huggingface.co/spaces/pollen-robotics/telepresence/blob/main/README.md
[S37]: https://huggingface.co/spaces/pollen-robotics/telepresence/blob/main/src/embed.tsx
[S38]: https://huggingface.co/spaces/pollen-robotics/reachy_mini_testbench/blob/main/README.md
[S39]: https://github.com/pollen-robotics/reachy_mini/blob/main/docs/source/troubleshooting/motors_diagnosis.md
[S40]: https://github.com/pollen-robotics/reachy_mini/issues/589
[S41]: https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/ts/package.json
[S42]: https://github.com/NetworkManager/NetworkManager/blob/main/NEWS
[S43]: https://www.rfc-editor.org/rfc/rfc5227.html
[S44]: https://developer.chrome.com/docs/capabilities/bluetooth
[S45]: https://developer.chrome.com/blog/local-network-access
[S46]: https://docs.robotis.com/docs/dxl/protocol/protocol2/
