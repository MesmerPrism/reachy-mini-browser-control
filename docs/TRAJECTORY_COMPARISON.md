# Matched trajectory comparison

Prepared offline on **2026-10-16**, following `TEL:E0/E1` and `OTG:G4` in the
[research guide](research/README.md). That preparation contacted no device.
The subsequent attended attempt below is separate hardware evidence. This remains
an experimental policy outside the ordinary browser controls.

The proposed [six-axis comparison matrix](MOVEMENT_COMPARISON_MATRIX.md) extends
future trials to visible interior-range movements in both directions, separately
scores returns, and distinguishes accuracy misses from unmatched dynamic samples.
Its fixed target CSV and dedicated-profile requirements do not modify this
roll-only executor or admit new physical tests.

## October 16 attended attempt: closed, comparison incomplete

Wake and its visual confirmation passed. The native observer qualified while
disabled and awake using the existing serial owner and at least 1.25 s between
native read completion and the next bracket. Tracking and wobbling were explicitly
disabled; the installed reset implementation clears speech offsets. The installed
goto/interpolation hashes matched the offline oracle. A frozen measured starting
pose and 453-sample actual-path model screen passed, with at least 434 encoder
counts to the recorded joint limits. This is model evidence, not clearance proof.

| Movement actually executed | Result after the observation window |
| --- | --- |
| A: PC-linear, 15° outward roll, nominal 3 s | 151 accepted writes; generation took 4.193 s. Final combined error 1.30° / 1.30 mm; failed measured arrival. |
| Separate daemon-local minimum-jerk return to the frozen baseline, requested 3 s | Final combined error 4.44° / 2.07 mm; failed measured arrival. This was positioning, not the matched C condition. |
| B and matched C | Withheld because the frozen starting pose was not re-established. |

A's median send interval was 26.46 ms, with a maximum of 137.68 ms. Its final
accepted endpoint was observed as the stored target. The separate daemon return
retained stock endpoint behavior without correction. Six loop brackets were
collected per executed movement during the stationary observation windows.
In their last brackets, maximum goal-versus-present errors were 29 and 65 encoder
counts respectively, while goal-versus-trajectory differences were at most two
counts. Maximum absolute PWM values were 33 and 77 against the unchanged limit
of 885. These are bounded register observations, not proof of the cause of error.

The original return was withheld when its nominal start failed the matching rule.
A first positioning admission also withheld its target because measured drift
crossed the experiment's provisional ±3 mm scope. The separately recorded return
used the existing ordinary ±10 mm translation envelope, its own model screen,
and unchanged freshness, identity, epoch, ownership, body and recovery guards.
The experiment's matching tolerances were not relaxed. Idle local coordinator
handoffs occurred; the robot stayed awake and its daemon was not restarted.

This is **not a valid three-arm smoothness comparison**: one outward PC trial
and an opposite-direction positioning return cannot isolate easing, location or
direction. The operator did not observe enough movement for a reliable smoothness
judgment, recalling only possible improvement. No optical capture was collected.
Do not interpret the missing conditions as passing or the return as evidence that
daemon execution is worse. Establish a successful positioning protocol before
another matched comparison; further uncontrolled repeats do not repair the match.

Final Stop/Sleep, native disabled readback, visual normal-Sleep confirmation and
the unchanged original 501-file audit passed. One final confirmation read exceeded
the freshness gate; a later read verified disabled idle state in 106 ms. The idle
coordinator was then explicitly exited without another robot command. No new full
backup, installation, daemon restart, gain, profile, protection, network or mode
change occurred. Mode correction remains separate. Private traces, exact targets,
handoffs and operator receipts remain under ignored `local/`.

## Question and conditions

Separate the effect of easing from the effect of running the timed trajectory
on the robot. Keep static following error as a separate outcome.

| Arm | Reference | Delivery and interpretation |
| --- | --- | --- |
| A — `pc-linear` | Common linear progress | Serialized PC HTTP target writes, capped to 20 ms of planned progress per iteration. Slow responses stretch phase; no catch-up burst. |
| B — `pc-minjerk` | `10u³ − 15u⁴ + 6u⁵` on the same path | Same PC pacing, packets, guard/observation policy and nominal duration as A. Sends its exact endpoint once. |
| C — `daemon-minjerk` | Pinned daemon `GotoMove` default minimum jerk | One HTTP `/api/move/goto` task, explicitly owned and cancellable. Omit the ignored interpolation selector. Record the stored terminal target without correcting it. |

The pose path reproduces Pollen's scalar-yaw/residual-rotation convention,
including interpolation of translation. Body yaw and both antenna targets are
explicit and use the same progress parameter. All arms have the same complete
destination. This prevents an omitted body default or a different antenna policy
from quietly changing a condition.

A uses the current manual worker's capped-progress principle; its nominal
pure-roll samples match `slewManualHead`. The comparison is not a byte-identical
replay of that worker: it adds an explicit phase-zero sample, Pollen-compatible
pose interpolation, and coordinated explicit body/antenna fields. B changes only
the time law relative to this instrumented A. The ordinary controller is unchanged.
All arms receive the same single post-generation stored-target read. An accepted
PC endpoint that is not observed there parks the comparison without a corrective
write. C's stock endpoint difference is retained as an experimental outcome.

## Provisional geometry and order

The synthetic preview uses a **15° roll excursion over 3 s**, then the reverse
path. This is visibly larger than the earlier tiny yaw probes. At this nominal
geometry A has 5°/s speed and B/C have 9.375°/s peak reference speed. Equal duration
does not mean equal peak speed. These are mathematical values, not measured robot
speed, actuator limits or clearance certification.

The real start must be a fresh stable measured pose at nominal task-frame height.
Freeze the actual complete start and choose the excursion sign so both endpoints
remain within ordinary ±15° roll. Do not force an inaccurate nominal neutral pose
to count as the start. The preparation scope also bounds yaw/pitch to ±5° and
translation to ±3 mm around the existing task-frame neutral; it is not a mechanical
envelope. The synthetic zero translation is a task-frame coordinate, not a claimed
absolute head height or a current robot observation.

Use three blocks ordered **A/B/C, B/C/A, C/A/B**. Each condition has an outward
and return leg: 18 preplanned legs. Start with the first matched block and review
whether another block resolves a specific ambiguity. Never skip to an arbitrary
condition or automatically repeat an interrupted leg.

Admission to each leg compares the fresh measured start with that leg's frozen
start: at most 1° in the existing combined angular metric, 1 mm translation,
0.25° body disagreement and 1° per antenna. The actual-start path must also pass
the frozen reference-speed checks. The common nominal duration is never silently
changed to make a poor start fit. Withhold and review an unmatched start; any
positioning intervention needs a separately recorded, authorized leg.

## Guards and observation

Use the same application controller throughout the awake comparison. Retain
identity/version admission to daemon 1.10.0, the 500 ms batch-start telemetry gate,
ordinary 0.25° body-reference tolerance, command epochs, recovery/unknown-outcome
barriers and one in-flight write. An interrupted write is not replayed.

Tracking, wobbling, speech offsets, other apps/writers, camera/audio policy and
the original motor configuration must be matched and recorded for every arm.
The private binding requires current authority/context providers; a boolean in an
old report is not that evidence. Source inspection or disabling one aim source
does not prove all competing writers are absent. Stock daemon ownership is not a
global multi-client lease.

Moving observation uses the controller's existing coalesced cached-status
monitor. It does not add a mandatory GET batch for every 20 ms output frame.
Optional native diagnostic brackets are collected in the common stationary
post-generation observation window, through the existing serial owner, at least
**1.25 s after the previous native completion**, inheriting any earlier cooldown.
E0 must first qualify the corrected observer on the device. No new raw bus reader
or high-rate motor-register polling is introduced.

The default post-generation observation window is **10 s for every arm**, even
if feedback enters tolerance earlier. It is a matched measurement window, not an
estimate of whole-session duration. Keep it fixed within the comparison and record
partial windows as incomplete. Three distinct post-write cached snapshots within
the unchanged 1°/1 mm criterion classify measured pose arrival; native qualification
remains a separate, explicitly unqualified field until correlated brackets are
reviewed. HTTP response time is not sensor acquisition time; FK is not optical pose.
Record actual observation duration as well: an already-started bounded native read
must drain even if it finishes just beyond the nominal window.

On completion, a fresh measured Stop/hold is recorded **after** the observation
window as a separate intervention. It is not an endpoint correction. A guard,
unknown write, lost owner, failed observer or bad start parks the experiment;
no other condition starts automatically. Late task UUIDs remain owned through
Stop's drain/cancel barrier. Stop is software control, not a hardware emergency stop.
No branch in this comparison sends Wake or Sleep. A later attended session must
explicitly Wake first, obtain visual confirmation, and perform one explicit final
Sleep/visual check. Pauses leave that same controller available for review and
do not require a power cycle, service restart or software restoration.

## Evidence and decision rule

Retain plan hash, condition/block/leg ID, exact measured start, all targets,
monotonic phase/send/ack intervals, HTTP timing, actual duration and phase stretch,
accepted/ignored/unknown outcomes, task UUID/list membership, stored terminal
target, measured full-pose error and the native brackets. Use an external fixed
view of head and base; estimate its stationary measurement noise before deriving
velocity ripple. Preserve separate outcomes for continuity, lag, overshoot,
static error, arrival, contact and freshness faults.

Daemon task disappearance is **not** successful completion, bus application or
arrival. Its own measured start is not atomically correlated with the PC snapshot.
C's stock endpoint omission is retained and reported; a later correction would
be a new intervention. PC acceptance likewise proves neither native application
nor cancellation of work already queued downstream.

- B improves A, C adds little: prioritize reference shaping beside the existing bridge.
- C improves B under comparable timing: consider robot-local intent generation.
- If PC phase stretches materially, add one explicit duration/phase control before
  attributing the difference to execution location.
- Similar motion/static deficits despite regular references: investigate actuator
  following, quantization and competing aims rather than raising packet rates.

## Offline preparation and verification

With Node 24 and the project's existing dependencies:

```sh
node tools/Prepare-Trajectory-Comparison.mjs
node --test test/trajectory-comparison.test.mjs
```

Preparation writes only a synthetic plan, nominal curve preview and hash manifest
under ignored `local/trajectory-comparison-20261016/`. It has no live/device flags,
constructs no robot adapter, and records `hardwareArmed: false`, zero requests and
zero new full backups. Existing backup and original-software audit receipts are
referenced and hashed where available; their historical contents do not establish
current hardware integrity. A fresh real-plan freeze and authorization are separate.

The public [math/execution module](../tools/trajectory-comparison.mjs) has no network
IO. [Tests](../test/trajectory-comparison.test.mjs) use a deterministic injected
clock/transport. The [numeric oracle](../test/fixtures/pollen-goto-reference.json)
contains 30 frames generated by extracted installed-matching Pollen interpolation
and `GotoMove` math, including coupled rotation and front-yaw cases. Upstream source
is not vendored. The private binding is separately tested against the actual
`RobotControl` class with synthetic adapters, including in-flight Stop and late UUIDs.
Neither test fixture models real servo response, native queue age or wireless timing.

The cached kinematics 1.0.3/model screen passed 453 nominal path samples with at
least 379 encoder counts of margin to the historical configured joint limits.
Its three-iteration numerical FK check stayed below 0.018° and 0.000035 mm error
against those model poses. These are model self-consistency results, not physical
accuracy. Reverse legs use the same geometric path. Rerun the screen for the actual
measured start; it does not certify continuous clearance or bound motor dynamics.

Reuse the existing verified backups and diagnostic installation. No new deployment,
gain write, profile change, firmware update or protection change is part of this
comparison. **Mode correction remains separate.** Review a real-plan kinematic path
using the pinned model before hardware admission; numerical IK is not shell clearance.
