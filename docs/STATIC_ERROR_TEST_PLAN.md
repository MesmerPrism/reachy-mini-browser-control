# Static position error: reversible test plan

## Offline preparation for a second robot — October 27

With hardware unavailable, retained receive failures now replay through the
actual Rust reader, with an isolated bounded early-rejection candidate for
corrupt headers/lengths. This can contain a failed exchange; it
does not repair UART byte loss. Preserve valid fragmentation, byte stuffing,
CRC, expected-ID and status semantics, and qualify the existing PTY regressions
before considering deployment. Private tooling retains saved inputs, source
pins, reproducible offline checks and a bounded two-robot protocol. The candidate
is not installed or physically qualified. Existing destuffing/status limitations
and timeout-versus-parsing retry behavior remain explicit.

Establish each robot's own original settings, software/model identity and backup.
Compare disabled, awake-idle and one original-gain vertical block under matched
observation. Keep hardware differences distinct from logger/software changes.
Short clean controls remain inconclusive about intermittent faults. Once fresh
feedback and original settings qualify, a bounded movement block may resume
with logging and stop-on-fault; perfect lifetime serial reliability is not a
prerequisite. Reuse known-original recovery without replaying interrupted legs,
and keep mode correction separate.

## Focused serial comparison — October 26

The original/candidate/restored daemon CPU-placement comparison completed with
170/170 diagnostic reads, no observed overrun increments and no workload cache
gaps. Both original controls were clean, so CPUs 1–3 remain an unproven
candidate; original 0–3 placement is retained. See the
[dated result](STATUS.md#focused-uart-cpu-placement-comparison--october-26).

Saved faults now distinguish malformed headers, CRC failures and a timeout after
a corrupt length, with most retained failures aligned to overrun observations.
Investigate the receive/parser path and retain reproducible control exposure
before another gain sweep or permanent scheduling change. A reusable bounded
known-original recovery path removes per-case client reconstruction; its idle
Linux qualification does not replace active-fault hardware validation.

## Wider P sensitivity — October 26

The authorized screen used separate motor-12 and motor-13 P300/P360/P300 blocks
with the original measured-start planner. Every block retains the same
original-P common start, four vertical legs, two-second ramps, ten-second holds
and exact restoration. Score all head joints and FK errors, delivered goals,
approach history, effort, voltage/temperature and serial faults. A gain benefit
must be compared with both controls; a missed arrival remains a result. Keep
command continuity and mode correction separate.

Routine continuation uses qualified telemetry. A known original-only health
rejection may close, freshly qualify and create one new prepared session with
an actual copied-backup witness. Candidate writes and motion are never replayed
after uncertain outcomes. Reader corrections retain raw replies and failed
receipts, verify the production owner/schema and preserve native admission.
See the [dated results](STATUS.md#broader-head-p-screen--october-26).
The round closed partial: motor 12 completed ABA, motor 13 completed A1/B,
and all four motor-13 A2 scored targets were withheld after feedback faults.
The 20 captured scored legs and 15 acquisition/staging legs remain separate.
Motor 12 showed a modest positional association with P360, while motor 13 showed
no clear whole-head improvement. Goal differences, a rejected P360 exposure and
an intervening centering cycle limit inference. Prioritize serial reliability
before another gain round; no permanent gains or scheduling fix are qualified.

## Command-boundary continuity — October 26

The saved original-P300 traces identify a separate planner issue at the start of
a new leg. The first emitted joint vector exactly repeats the preceding leg's
last command; the next vector resets toward the measured start, changing some
motor goals by 50–87 counts over approximately 33 ms. These are actual grouped
goal writes, not an inference from independently sampled pose snapshots. Measured
position was already near the second vector, so this establishes a reference
step rather than an equally large physical jump.

The smallest selected motion follow-up is continuity of the commanded state
across a new target, with an explicit checked transition if measured-state
rebasing is needed. An offline counterfactual using the existing interpolation
retains the first joint vector and limits adjacent changes to at most four
counts in these two examples while retaining the final goals. It changes the
path start and requires a fresh actual-path/clearance review before hardware
use. A subsequently reviewed private candidate has now completed two physical
legs, including one exact continued boundary. The last two legs were withheld
before target intent after a communication failure; the 73/81-count baseline
reset boundaries remain untested with the candidate. Original code is restored.
See the dated [partial results](STATUS.md#awake-verification-load-and-motion-audit--october-26).

Recurring raw-velocity-2 admission failures need better rejection context,
independently of the one-count position windows. The short read-only sample
caught no such pulse; the longer awake recording caught eleven on motor 16
while its sampled position stayed within one count and goals remained fixed.
Retain the existing velocity guard pending a separately qualified policy.
The installed diagnostic now exposes goal/present position and device tick
from the buffers already read by the guard, with separate read-time brackets
and no additional bus reads. Failed paired Handoff follows original-only Restore; it must not
be forced through the single-parameter no-write closure path. Fresh qualification
and a new session witness reuse existing backups and preserve old receipts.

Keep this separate from endpoint following error: the upper endpoint still has
about 7.20 mm / 5.93 degrees of encoded-goal-to-feedback FK error in its terminal
window. Across the audited traces quantization alone contributes at most
0.107 mm / 0.278 degrees. Native enqueue/execution counts match, and the tracked
head queue does not accumulate. Existing reversible P evidence therefore remains
relevant to the local following/control layer; command continuity is not yet an
endpoint remedy. UART receive diagnosis continues independently under the
[dated status](STATUS.md).

## Current diagnostic sequence — October 25

Use the completed P and I experiments together to choose the next test, while
keeping their transactions and scores separate. The strongest reversible tuning
evidence includes the completed motor-15 P sweep and P420 return/direction block;
an I-only longer hold is a secondary
mechanism probe. The autonomous telemetry/recovery capability is installed.
This section defines the experiment order. The dated [current results](STATUS.md#adaptive-pi-diagnostics--october-25)
record the subsequently installed bounded P extension and twelve completed captures.
Combined P/I and a permanent tuning choice remain unqualified.

| Existing evidence | Interpretation for the next test |
| --- | --- |
| Completed matched P300/P360/P300: upper motor-15 error 86/58/86 counts; FK position error 7.18/6.21/7.19 mm and angle error 5.97/4.60/5.92 degrees | Prioritize a controlled P sweep; the benefit reversed with restoration, but remaining joint errors were substantial. |
| October 23 I0/I1/I0: motor 15 moved late in I1, with a final error of 58 rather than 85 counts; its final-three error median remained 85 | Integral response may be delayed or intermittent. A best final sample is not sustained improvement. |
| October 25 I0/I1/I0: terminal motor-15 errors 86/86/85 counts; sampled I1 PWM rose about 102 to 115 while position stayed 2465 | I1 affected sampled effort without a tracking benefit in this hold. It is not evidence that I is inactive. |
| Earlier matched speed and direction tests retained upward error despite correct target delivery and near-goal internal trajectory | Reuse these captures to study direction/load dependence; do not repeat broad speed screening without a new discriminating question. |

The completed P comparison and the two I captures are different protocols and
dates. Retain them as separate evidence, not a pooled factorial experiment.
FK is a joint-derived pose estimate, not external shell-level measurement.

### 1. One common scorecard before further motion

Reanalyze existing captures using the same score definitions: per-joint signed
following error and its steady-window median/spread, FK translation/angle error,
settling and any overshoot/oscillation/drift, effort trend, voltage/temperature/
alerts, delivered goal versus internal trajectory, and actual restoration/exposure
timing. Keep all head joints and the body reference, not just motor 15's best
sample. Distinguish sparse register reads from the higher-rate position trace;
absence of sampled voltage dips does not rule out brief supply transients.

For each condition retain the frozen target, actual starting pose, approach
history and delivered/read-back goal counts. Only matched conditions establish
a matched gain comparison. One-count goal differences, asynchronous samples,
cleanup delays and interrupted records remain explicitly labeled. A new scorecard
does not retrospectively create missing measurements or erase failed receipts.

### 2. P first: a bounded, adaptive motor-15 sweep

Keep I0, D/feedforward, profiles, modes, limits and all other motors' gains fixed.
Use the original-settings common start, the same reviewed +10 mm upward target,
two-second ramp and ten-second hold. Begin with P300, P360, P300 under this single-
upward protocol. This confirms the existing P benefit under the current runner;
it does not replace the completed four-leg October 19 comparison.

If P360 again helps without worse settling/oscillation, test P420 bracketed by
original P300 controls. Consider P480 only if P420 adds a consistent benefit
without adverse behavior. The +60 steps are proposed experiment choices, not
manufacturer-qualified safe limits. Never automatically escalate because an
encoder count fluctuated, a write failed or an arrival was missed.

The native/daemon capability at planning admitted only P300/P360. Its subsequently
qualified finite candidate set is **P300/P360/P420/P480**. The subsequent
motor-16 contribution extension permits higher values only on awake motor 15
or 16, with exactly one selected P gain per transaction. The campaign selects
an explicit subset at runtime. Preserve that selected-joint scope, exact I0/other settings, immutable
preimage, write/readback checks, no-replay behavior and restoration-only recovery.
Reject values outside the qualified set; do not infer admissibility from the
servo register's encoding range. Reuse existing build/rollback caches and backups.
Subsequent selection among qualified candidates should not require another build.
See the dated status for qualification and physical results; P480 availability
does not bypass the conditional decision to execute it.

Rank candidates by sustained selected-joint AND whole-head improvement. A lower
single terminal error is insufficient if overshoot, oscillation, drift, heating,
other-joint error or return behavior worsens. Stop escalation when improvement
plateaus or adverse behavior appears. Restore original P300 between conditions;
retain a final original-setting control and Sleep.

### 3. I separately: test whether extra time produces useful correction

At P300, compare I0/I1/I0 with a matched 20-second observation hold, the same
two-second ramp and unchanged target. Extend the private runner's finite timing
scope and review capture/exposure/recovery bounds before execution; no I above 1
is proposed. Compare error-versus-time and effort-versus-time, including late
breakaway, drift, overshoot and restoration behavior. A late jump or growing
effort without sustained pose benefit is a diagnostic finding, not a tuning win.
Do not compare a 20-second candidate directly with a 10-second control as if
exposure were matched. I0 readback still does not prove hidden integrator reset.

### 4. Choose the next branch from the result

| Result | Next action |
| --- | --- |
| Higher P gives reproducible, sustained benefit without adverse behavior | Retain the lowest useful tested P as a candidate; validate a return/direction block before considering adoption. |
| I1 gives sustained improvement over a matched longer hold | Retain it as a separate candidate, with its timing and post-restoration limitations; do not increase I automatically. |
| Both individual changes help | Design and separately qualify a combined P/I experiment. Current P-only and I-only transactions cannot be combined implicitly. |
| Motor 15 improves but whole-head tilt remains | Rank motors 12/13/16 and other coupled residuals from the common scorecard, then qualify one selected-joint change at a time. Do not copy motor-15 gains to all joints. |
| Effort grows with little motion, strong direction dependence or sudden breakaway | Prioritize the existing direction/load evidence and a discriminating original-setting approach test; investigate controller/load/friction/calibration contributions before larger gains. |
| Correlated voltage/error/communication anomalies appear | Preserve the first fault and recover originals. Follow the power/transport evidence rather than interpreting the affected run as a gain score. |
| Delivered goals, internal trajectory or starting conditions do not match | Diagnose that control-path mismatch before attributing the result to a gain. |

Use the installed explicit telemetry authority for routine progression and the
bounded existing-owner recovery client for qualified cleanup. No visual pause
is required inside that authority. Keep mode correction, physical assembly and
power changes separate. No startup Wake, uncertain motion/candidate-write replay,
automatic tolerance widening or automatic permanent gain adoption is introduced.

The October 25 execution completed the P360, P420, P480 and longer-I blocks,
then the P420 return/direction comparison. Its upward motor-15 errors were
86/58/85 counts and downward-return errors 5/5/5 counts. Motor-16-only
contribution blocks then completed at P360 and P420, each bracketed by P300
while motor 15 stayed P300. Absolute selected errors were 62.5/42/64 and
59/35/65 counts, respectively. Whole-head angular/RMS benefit reversed with
restoration, with coupled motor-12/13/14 tradeoffs retained. Neither block
qualifies uniform improvement or permanent adoption; their controls differ.

The separately qualified interaction comparison has now completed: original
P300, motor-15-only P420, motor-16-only P420, both at P420, then restored P300.
FK angle medians were 5.837/3.662/5.181/1.967/5.936 degrees under one common
single-upward protocol. The fixed two-actor transaction preserves exact backup,
partial-write fencing and original restoration. Individual benefits must not be
assumed additive; nonlinear norms and small goal differences do not prove synergy.

The promising pair also completed its separately scoped direction/return block.
Upper FK angle was 5.935/2.429/5.927 degrees, while downward return stayed near
controls at 0.687/0.663/0.638 degrees. All four full raw goal vectors matched
across the active A/B/A conditions. Individual motor-11/12/14 tradeoffs remain
explicit. Interrupted original-setting attempts are archived separately; a
reviewed on-device batch wrapper reduces administrative idle gaps while keeping
the existing stage checks, targets, holds and no-replay policy. Original gains
and final Sleep verified. Mode correction and permanent adoption remain separate;
further scalar P escalation is lower priority.

The next diagnostic priority is UART receive reliability. The bounded existing-
transaction timeline is installed and has captured malformed receive data, a
malformed length followed by body timeout, and incomplete-reply/next-header
sequences. The actual transport is a direct SoC PL011 UART. A kernel overrun
counter increased during one measured interval; this does not assign every
malformed packet to that event. Inspect the deployed UART driver, receive/DMA
configuration, interrupt service timing and power-state transitions before
choosing a controlled mitigation. Keep counter/time correlation and first-fault
history; do not attribute a generic expected motor ID to a corrupted sender.
Do not change parser acceptance, baud, modes or global timing merely to hide the
fault. Reuse compiled/rollback content and keep this branch separate from gains.

The authorized continuation now uses a first-fault buffer plus a continuing recent
ring, so an early incidental glitch cannot hide a later guard failure. The exact
deployed kernel source and device tree show interrupt-driven receive without a
UART DMA channel. The original effective interrupt CPU also handles substantial
USB, camera-related and I2C traffic. A malformed-packet observation and a new
hardware overrun were retained within the same subsecond counter interval.

Test one reversible interrupt-affinity change first, bracketed by original
placement. Keep all gains original, reuse the frozen four-leg reference and record
disabled, awake-idle and moving traffic separately. Require actual interrupt
delivery on the selected CPU, cumulative kernel/observer counters, capture loss
metadata and exact requested/effective restoration. An independent timed restore
must precede the change. Serial-core runtime PM and CPU governor changes are
separate conditional hypotheses, not bundled fixes. A short clean window alone
does not establish that an intermittent fault has been eliminated.

This comparison completed twelve original-gain legs. The resumed CPU-3 window had
zero overruns over 2.890 MB, versus two over 2.670 MB in the first original control
and five over 4.133 MB in the restored cumulative control. Keep unequal exposure
and the restored control's sampling gap explicit. An earlier CPU-3 interval still
had one overrun and a cached header-parsing fault, so interrupt placement is a
limited mitigation candidate. The separate motion-free governor A/B/A produced
zero overruns in all three 180-second conditions; it did not distinguish that
candidate. Both knobs were restored. See the dated
[serial results](STATUS.md#continuing-serial-history-and-uart-reliability--october-25).

The October 26 matched read-only comparison completed three 180-second conditions
at IRQ CPU 0/3/0, keeping transition margins outside scoring. Each contained 60
seconds of ordinary polling and 120 seconds of paced maintenance reads. All
270 diagnostic replies qualified; all six windows recorded zero new overruns.
Both original controls were healthy, so this run does not distinguish interrupt
placement or reproduce the historical fault. One dropped CPU-3 logger event
remains explicit. No permanent transport change follows from this result.

A separate three-minute original-placement follow-up then ran 54 administrative
full-file/owner verification scans while asleep. All passed, with zero new UART
overruns and zero native fault observations. Actual scan intervals and gaps up
to 2.392 seconds remain explicit; an earlier fault's proximity to verification
is still a hypothesis, not an established cause. The isolated interrupt/softirq
trace retained a recent tail with ring overwrites and export clipping. It
measures service timing, not when an interrupt first became pending.

The subsequent original-settings awake-idle/vertical comparison completed 90
qualified diagnostic reads, two common-start legs and four direction/return legs.
Both scored idle windows and all six sampled command-to-pause intervals had zero
new overruns. The continuous observer recorded three increments, all before the
first vertical acceptance. The first native failed position poll and first
overrun share a subsecond bracket; its IRQ trace is retained. See the
[dated result](STATUS.md#awake-idle-versus-vertical-uart-observation--october-26).

The next useful question is whether full-file/owner verification or other awake
preparation work contributes to receive loss. Compare quiet and explicitly timed
verification load at original settings while awake, keeping Wake, preparation,
settling and scored windows distinct. The previous asleep scan probe was clean;
that does not establish the awake result. Timing correlation remains a hypothesis.
Keep package verification and lightweight owner/listener identity checks distinct
when recording load; the qualified transport hashes installed files at
construction and retains process/socket checks during requests.

Reuse the installed logger, immutable references and rollback content. Export
known captures at phase boundaries so a later fault's wire context does not age
out during a long healthy tail; retain every capture ID and inter-fragment gap,
and never restart an unknown capture. Stop a bounded private timing trace before
further observer reads on the first fault. Keep trace overhead, loss and sampling
gaps explicit. Avoid another broad gain sweep or power-management change without
new evidence of its mechanism. Mode correction remains separate.

## Earlier evidence and dated preparation

The sections below retain their dated protocols and qualification history.
The current experiment order above supersedes their descriptions of the next
stage; current installed capability and pending extensions remain distinct.

The [October 18 speed/electrical comparison](HEAD_RESPONSE.md#attended-vertical-speed-and-electrical-comparison-october-18)
retains large upward errors at matched servo goals at 15, 2 and 1 second. Faster
movement looked smoother, but the upper endpoint still missed by 6.35–6.88 mm /
5.10–6.30°. Sampled voltage and output showed no sustained sag or clipping. This
does not rule out brief transients or mechanical/controller causes.

The [completed October 19 common-start A/B/A](P_GAIN_TRANSACTION.md#october-19-completed-common-start-and-matched-p300p360p300)
now supplies a full matched physical comparison: motor-15 upward held errors
were **74 → 59 → 74** and **86 → 58 → 86 counts** for P300/P360/P300, at identical
delivered and independently read-back goals. The operator saw less upward tilt
in B and more again in A2. Other joints retained large errors. This one ordered
comparison supports a gain-dependent component but does not justify adopting
P360 or establish a general tuning policy. Original settings, normal final Sleep
and disabled ready service are verified, with no pending transaction.
The preceding [interrupted A/B attempt](P_GAIN_TRANSACTION.md#october-19-same-image-p300p360-comparison-and-interrupted-a2)
remains separate historical evidence; its communication fault is unexplained.

The [communication/common-start candidate](P_GAIN_TRANSACTION.md#communication-and-common-start-preparation-october-19)
first implemented that follow-up offline: bounded native error retention and two
unscored original-P300 legs to approach the frozen neutral from above. Focused
host qualification and ARM cross-compilation passed. The amended integration
subsequently passed [68 Python and 14 native PTY cases on ARM](P_GAIN_TRANSACTION.md#communication-and-common-start-isolated-arm-runtime-october-19),
including explicit original-P acquisition scope and read-only post-restoration
feedback resumption. Its [attended installation and disabled overhead checks](P_GAIN_TRANSACTION.md#communication-and-common-start-disabled-deployment-october-19)
passed before movement. Subsequently, actual-model-reviewed common-start
acquisition passed for all three conditions and the complete matched comparison
finished. Preserve this protocol for future comparisons and retain earlier failed
attempts separately. Next analyze the remaining coupled joint errors and held
PWM/current under unchanged limits before selecting another parameter experiment;
this result introduces no authority for higher gains or mode correction.
Do not bypass inhibition, reuse servo-profile authority for P writes or conflate
this with mode correction. Reuse the existing backups and verify restoration.
The [power/actuator preparation](#power-and-actuator-follow-up-after-the-vertical-aba)
below remains its dated plan; its original-settings speed capture is complete.

## Power and actuator follow-up after the vertical A/B/A

Prepared offline before the attended October 18 speed pass, this unarmed follow-up
uses the existing interior vertical measurement protocol
and original profiles, gains and modes. It adds no compensation, manual head load,
adapter substitution, voltage adjustment, motor disconnection or mode correction.
The robot has not been contacted during preparation. Later hardware execution
requires fresh authorization, current identity/ownership/freshness checks and an
attended operator; saved power and network facts remain historical.

The next useful capture is one original-settings condition, not another profile
A/B/A. Retain the same full head reference and body target across both approaches
to neutral. Keep actual-start path reviews, generation/measurement separation,
the existing omitted-target and recovery fences, and all failed-arrival evidence.
Do not treat the completed diagnostic matrix as admission to the conditional
P-gain stage described below.

1. With original profiles verified, send explicit Wake and obtain its visual
   confirmation. Before a measured hold overwrites the target, retain the known
   nominal Wake target and its exact source hash, computed joint vector, body
   reference, cached joints, FK and cache timestamp. A null pose target field is
   missing live pose intent, not proof that Wake requested a tilted pose.
2. Retain at least three bounded existing-controller loop/metadata observations
   at the stationary post-Wake destination. Keep the native shared cooldown and
   deadline; do not add reads to the high-rate control loop or open another bus
   owner. Capture before/after state around each read and exclude changing
   destinations, target vectors, stale samples or uncorrelated brackets.
3. Use the already reviewed four-leg vertical sequence, with one fixed duration
   and the same frozen full reference. After each generator completes, retain
   its existing ten-second observation hold. Collect the same bounded sparse
   loop observations during that hold. Record goal/trajectory/present position,
   signed PWM/current, all voltage/temperature/error observations, torque,
   gains/modes, profile values, sequence and timing. Keep unaffected joints too;
   actuator loads are coupled and the largest error does not identify a bad part.
4. Use the ordinary original-settings owner path for register reads. If a
   maintenance lease or another gate denies a read, withhold that measurement;
   do not bypass the fence or add a second connection. A new in-lease diagnostic
   operation would need separate implementation and qualification.
5. Compare only identical complete requested poses, body references and encoded
   goals, retaining measured approach direction and at least a one-second final
   constant-goal window. Review visual tilt together with each joint's static
   error and output. Use original-profile Sleep for final cleanup and confirm it
   visually. Any uncertain write, hardware error or recovery requirement keeps
   its existing barrier; this plan adds no automatic retry or resume.

| Candidate explanation | Useful observation | Remaining uncertainty |
| --- | --- | --- |
| Shared supply/power path | Voltage drops across multiple motors during the affected rise/hold | Sparse software voltage reads can miss fast dips; correlation is not proof of supply failure |
| Local connection or actuator/linkage problem | Repeatable outlier in local voltage, error flags, output or temperature on affected joints | Sequential reads and coupled loads prevent identifying a defective part from position error alone |
| Output/load limitation | Large error with output near its applicable cap and little movement | Friction, load, electrical delivery and hardware condition still need separating |
| Position-loop equilibrium or controller response | Large stable error with low PWM, ordinary voltage and a settled internal trajectory | This does not by itself select gains, establish firmware behavior or rule out mechanical friction |
| Calibration/model contribution | Goal registers and measured joints agree but independent head pose remains tilted | Daemon FK is not independent leveling evidence; current traces already retain joint shortfalls |

In position mode, PID/feedforward compute PWM and Goal PWM limits it; a high limit
does not mean the motor is requesting maximum effort. XL330 current measures the
input supply path, so it is not a direct shaft-torque reading. These distinctions
are documented in the [ROBOTIS control table](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#position-pid-gain80-82-84-feedforward-1st2nd-gains88-90).
Keep power/temperature limits unchanged. Additional external electrical measurement
or actuator inspection is a later targeted investigation, not an automatic action
of this plan.

Prepared offline on October 14, 2026. This document is not an armed runner or
authorization to move, tune or restart a robot. No hardware was contacted while
preparing it. The separate mode correction is excluded.

Update, October 16: a separate disabled-only **P300 → P299 → P300** transaction
now has physical write/readback and exact original restoration evidence. The
original service was restored, and a later original-gain Wake/Sleep observation
passed. This does not complete Stage A, qualify Stage B or provide a gain-to-motion
handoff. See the [dated transaction result](P_GAIN_TRANSACTION.md#october-16-disabled-changed-p-roundtrip);
older uninstalled/unqualified statements below describe their preparation date.

## October 16 wider range survey

The operator requested larger single-axis movements and testing beyond the
ordinary controller's compact limits. The private diagnostic profile uses the
[documented angular ranges](https://pollen-robotics.com/reachy-mini/faq/): head/body
relative yaw ±65° and pitch/roll ±40°. Ordinary UI limits are unchanged. Translation
endpoints are derived from the cached installed kinematics model and configured
joint-register margins, not a documented Pollen translation specification:
x −44.75/+50 mm, y ±46 mm and z −50/+22.25 mm. Offline nominal paths retain at least
32 counts of configured joint margin. This is not collision or hard-stop proof.

The closed attended session records 99 head-target attempts: 96 survey attempts
covering 94 original leg IDs, plus three centering-comparison legs. All 48 original
single-axis size/direction excursions were requested, with repeats, interruptions
and contact-limited requests retained. Two full-yaw neutral returns were deliberately
unissued. Angular sizes were yaw 5°/15°/30°/65° and pitch/roll 5°/15°/30°/40° in
both directions. Translation sizes were 3/10/20 mm and the model-derived edges.
Requested and measured values below use encoder-derived FK, not an independent
pose tracker; request coverage does not qualify usable range or accuracy.

| Axis and requested target | Terminal measured axis | Absolute primary-axis error |
| --- | ---: | ---: |
| Yaw −30.18° | −25.96° | 4.21° |
| Yaw +29.82° | +26.08° | 3.74° |
| Yaw −65.18° | −66.14° | 0.96° |
| Yaw +64.82° | +58.36° | 6.47° |
| Pitch −30° | −31.46° | 1.46° |
| Pitch +30° | +30.46° | 0.46° |
| Pitch +40° | +36.32° | 3.68° |
| Roll −15° | −14.79° | 0.21° |
| Later roll +15° | +14.92° | 0.08° |
| Roll −30° | −33.11° | 3.11° |
| Roll +30° | +33.28° | 3.28° |
| Roll −40° | −40.83° | 0.83° |
| Roll +40° | +40.67° | 0.67° |
| Backward −44.75 mm | −23.28 mm | 21.47 mm |
| Sideways −46 mm | −45.93 mm | 0.07 mm |
| Sideways +46 mm | +46.17 mm | 0.17 mm |
| Vertical −50 mm | −49.12 mm | 0.88 mm |
| Vertical +22.25 mm | +21.61 mm | 0.64 mm |

A small primary-axis error does not satisfy the combined 1°/1 mm rule. Neutral
returns retained several degrees of error. Seven vertical attempts did satisfy
the sustained/native full-pose rule; most attempts did not. Raw traces,
per-leg matrices, native brackets, measured cross-axis errors and a CSV remain
private. Failed or interrupted targets are not relabelled successful.

The operator identified full-yaw contact as the bottom of the head touching the
front shell, acceptable at that test height and potentially problematic when lower.
Pitch through ±40° also had minor shell contact, without an identified sign. The
survey excludes extreme yaw combined with a lowered head; single-axis trials do
not qualify combinations. Outer translation trials require current visual
clearance observations before admission.

The +50 mm forward request is excluded from further testing: the operator saw
front-shell pressure tilt the head. Fresh Stop feedback was about +31 mm forward
and +12.5° pitch despite a zero-pitch target. This interrupted contact-limited
trial is not a usable endpoint or a clean servo-response measurement. Minor
brushing was reported for the backward edge, negative sideways edge and downward
edge. Single-axis observations do not qualify clearance at other heights or
combined poses.

A fixed-body comparison rule was too restrictive for this independent survey.
The survey instead rotates its nominal pose with fresh measured body heading,
retaining the exact derived matrix and body target per leg. Its reviewed heading
range is ±20° around the initial reference, with a bounded explicit 2° per-command
reference policy. Ordinary and matched-target defaults remain 0.25°. Offline IK
checks across the heading range preserve Stewart goals and the joint margins.
Results from changing body alignment must not be called an identical-body test.

The revised workflow keeps a known transient read interruption under one owner:
Stop, pause, inspect the fault, obtain fresh stable state/native diagnostics, then
explicitly resume the next unissued leg of the same plan. The interrupted leg stays
failed and is not automatically retried. No new destination is sent during pause or
failed readiness checks. Unknown writes, hardware faults and other unreviewed faults
remain barriers. The write/arrival freshness limit stays 500 ms. A physical
stale-read pause passed fresh/native review and continued the next unissued leg
without Sleep or replay. A separate local checkpoint publication race then parked
before the downward target. After four focused atomic-publication/awake-adoption
checks, the exactly retired idle owner transferred its held-awake session without
Wake/Sleep; the adopted owner completed the remaining legs and final Sleep.

The later five-leg roll batch ended when the exact measured-start envelope
rejected −40.83° before the planned neutral return. Stop/Sleep completed normally;
minor contact only was reported. Later trials used a reviewed private inward-return
allowance of 2°/2 mm for measured overshoot only; requested excursion limits were
unchanged. The final streamed identity/body-zero return retained 4.67° roll. The
operator saw smoother/better Sleep centering; an observer pacing error prevented
native center-dwell evidence. See the [centering comparison](HEAD_RESPONSE.md#october-16-sleep-centering-comparison)
and its targeted offline fix before attributing residuals or jitter to gains or
mechanical load. Final native/visual Sleep, helper drain, unchanged original
501-file audit and reservation release passed. No gain, mode, package or motor
setting changed, and no new full backup was made.

## October 16 attended fixed-target result

The installed original diagnostics were used without installation, restart,
gain/mode changes or new full backups. Fresh read-only admission and a visually
confirmed explicit Wake preceded the frozen plan. The six planned legs used
yaw waypoints ±3° around the same measured reference, with identical pitch,
roll, translation and a fixed body target, at 5°/s and 1 mm/s.

| Leg | Requested yaw | Measured terminal yaw | Combined angular / translation error | Result |
| --- | ---: | ---: | ---: | --- |
| Lower waypoint | −2.941° | −1.626° | 1.319° / 0.472 mm | Unsettled |
| Common from lower | +0.059° | −2.400° | 2.478° / 0.751 mm | Unsettled |
| Upper waypoint | +3.059° | −1.511° | 4.610° / 1.153 mm | Unsettled |
| Common from upper | +0.059° | — | — | Withheld: measured upper approach absent |
| Repeated lower waypoint | −2.941° | −2.610° | 0.865° / 1.508 mm | Unsettled |
| Repeated common from lower | +0.059° | −3.307° | 3.529° / 1.762 mm | Unsettled |

All five submitted endpoints were acknowledged; none met the unchanged combined
1°/1 mm arrival rule. Each later leg had a distinct confirmed Stop and fresh
admission. The two lower-common legs retained five/four matching native brackets.
Their matrices, body targets, joint targets and converted servo goals matched.
Goal/trajectory gaps stayed within two counts; maximum goal/present gaps were
21 and 41 counts. Their maximum sampled raw PWM was 22 and 46 against the
unchanged 885 cap. These are sampled register observations, not torque sensing.

The finite protocol completed, but the missing upper-side return means the
matched-direction comparison did not complete. Different measured residuals at
the same target also limit repeatability. Recovery holds occurred between legs;
their transitions should be analysed before attributing the residual change to
load, friction, gains or kinematics. No gain-to-motion handoff or Stage B tuning
benefit is qualified by this run.

The 48 native brackets completed within the existing budgets (14 ms native,
126 ms diagnostic HTTP maximum). Recorded leg snapshots numbered 374, with
265 ms maximum read duration and no freshness failure. P200/P300, I/D/feedforward,
mode 3 and output limits stayed unchanged. The previously admitted input-voltage
alert remained distinct from other errors. Stop/Sleep completed, raw disabled
readback passed and the operator confirmed normal final Sleep without unexpected
motion. Final audit verified the original 501 files and same daemon owner.

Admission exposed and corrected two helper issues before the target sequence:
typed alert arrays were wrongly treated as integer vectors, and exact equality
of measured body yaw rejected one encoder count (0.088°). A first Wake/Sleep
cycle sent no head target. A bounded explicit `bodyYawReference` now retains the
same requested body yaw across separate commands while allowing up to 0.25°
measured variation. This is separate from the unchanged head arrival rule.
Native alert vectors remain checked against their raw status bits/flags.

The final journal read initially exceeded its 600 kB command-output bound. A
read-only retry preserved the failed receipt and collected the complete 699 kB
session journal under a separate 4 MB cap; the final original-owner/package audit
passed. The coordinator drained and its reservation was released. The journal
also recorded external signaling authentication and TURN DNS failures; these do
not establish a local-route failure or reproduce the earlier connectivity loss.
No new physical commands, network settings or scheduled monitoring were added
for that audit. Earlier preparation sections below remain historical.

## October 16 integrated capture, prepared for attendance

The revised experiment now has a private staged runner using the existing
`RobotControl` and `ReachyAdapter`, with the installed diagnostic GET routes.
It requires no maintenance installation or daemon restart. One process owns the
controller, request history and native capture; native reads coalesce and retain
the existing cooldown/budget. No serial connection or local bridge port is added.

Startup performs read-only disabled admission. Wake is an explicit stage, followed
by human visual confirmation before freezing the full reference. The exact six-leg
plan then needs approval before submission. A failed settling leg remains failed;
later preplanned legs need a confirmed Stop and fresh admission. An unestablished
approach withholds that common-target write and marks the pair incomplete.
Unknown writes and other faults end continuation. Cleanup uses the existing Stop
and Sleep gates, followed by visual Sleep confirmation and a final read-only audit.

Thirty-one focused offline checks passed through the real controller code,
synthetic servos, mocked HTTP and the actual private file protocol. They cover
successful and failed six-leg comparisons, fixed endpoint/native-bracket matching,
withheld approaches, identity/configuration faults, unknown writes, stale requests,
explicit power stages, abort and drain. The final abort/file-protocol change was
retested separately. These are software results, not physical response evidence.

The prepared run reuses original backup/audit references and checks the installed
501-file baseline at admission and completion. It captures goal, trajectory,
measured position, raw PWM/current, configuration and read timing. Daemon logs
after the initial journal cursor and initial/final route facts are retained.
Native clocks remain distinct from local request timing; daemon FK is not
independent pose sensing. No robot was contacted during this integration pass.
One fresh attended comparison remains to run. Gain changes, mode correction,
network modification and publication are excluded.

## October 16 campaign revision, prepared offline

The first attempt ended before comparing the common target because a waypoint
failed settling. Requiring every waypoint to settle also prevents measuring the
fault under investigation. A new private, inert policy separates each of the six
planned target submissions into an independent leg: lower, common, upper, common,
lower, common. The full reference, six-axis endpoints, body target and limits stay
fixed. The policy proposes commands but has no transport or hardware launcher.

A failed leg remains failed under the unchanged 1°/1 mm criteria. Only an exact
retained acknowledgement of its complete endpoint plus fresh, specifically bound
`unsettled-target` evidence can classify a settling failure. A later leg needs
its own preauthorized plan entry, a distinct acknowledged Stop and a fresh idle,
awake, identity/ownership-admitted read after that Stop. A retained historical
fault is accepted only if it exactly matches this campaign's recorded settling
failure. Unknown writes, stale status, foreign motion, changed body targets or
unconfirmed recovery halt continuation. No destination is retried automatically.

A common-target leg additionally needs measured position on the intended side;
a requested waypoint does not establish approach direction. Each common target
retains exactly the same matrix and body target. Native bracket validation still
needs the existing joint-to-goal and target-stability checks. Twelve focused
offline policy tests passed, including successful and failed legs, fixed target
matrices, fresh Stop boundaries and lost-write aborts. The policy has not been
integrated with an attended hardware runner or qualified physically.

This revises the experiment proposal rather than weakening Stage A's old runner
or reclassifying its failed waypoint. It permits a useful unchanged-gain campaign
on the installed diagnostics before another maintenance deployment. Candidate-
gain motion still needs an explicit qualified handoff; both native and Python
maintenance lifetime fences remain. Mode correction stays separate.

## What the saved traces establish

Servo goals repeatedly match converted software targets, while measured joints
remain short with low sampled PWM. In four post-Wake/pre-yaw observations spanning
about 30.32 seconds between native read starts, sampled goals and positions stayed
unchanged. Their largest goal/present gap was 54 counts. This shows the sampled
error already existed at the daemon's nominal Wake destination; it is not solely
a consequence of a browser yaw ramp. It is neither continuous sensing nor proof
of a physically calibrated neutral pose.

| Saved condition | Goal minus present counts, in fixed seven-motor order |
| --- | --- |
| Nominal Wake destination, before yaw | 1, 5, −28, 19, −1, 54, −41 |
| Earlier +5.7° yaw destination | 1, 23, −1, 23, 2, 25, 2 |
| Earlier −10.6° yaw destination | 0, 3, −43, 3, −17, 3, −47 |
| Latest +11.3° yaw destination | 0, 13, 0, 35, 1, 48, 1 |

The affected joints and signs change with the destination/approach history.
However, omitted pitch, roll and translation were preserved from different
measured baselines. Even the two recent positive-yaw endpoints have different
acknowledged matrices. These are not matched, opposite approaches to one pose.

Observed mode 3, zero I/D/feedforward gains and output well below its sampled cap
are consistent with proportional holding under load/friction, without proving
it. A pure head FK/zero-offset explanation cannot alone account for the servo
goal/present gaps; calibration error could still coexist. The
[manufacturer's position-control description](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#position-pid-gain80-82-84-feedforward-1st2nd-gains88-90)
distinguishes generated trajectories, PID/feedforward output and the PWM cap.
The empirical integer-floor fit is not a complete firmware or torque model.

## Stage A: unchanged settings and a matched destination

Use a newly authorized, attended session with exclusive robot/bridge ownership.
Confirm current robot identity, daemon 1.10.0, installed diagnostic hashes, free
app/move ownership, fresh telemetry and disabled motors/torque. Saved network,
power and state facts are historical. Send Wake explicitly once, confirm it
visually, then check ready/idle state, enabled torque and settled measurements.
Do not install a patch, restart the daemon or alter motor settings for this stage.

1. Capture the idle nominal target and measured pose before head input. Collect
   at least three bounded native loop observations, with optional metadata,
   through the existing owner. Retain both goals and measurements; do not call
   a steady measurement successful arrival at the nominal target.
2. Freeze one complete destination `T = {yaw,pitch,roll,x,y,z}` from fresh measured
   state, plus the acknowledged body-yaw target. Record the resulting exact matrix.
   Preserve antenna state, posture, power supply, speed policy and capture cadence.
   Never reconstruct `T` from a later measured baseline or send yaw alone for the
   paired endpoints. The current controller preserves body yaw; if that cannot
   produce matching body targets, classify the pair as unmatched rather than
   bypassing the adapter.
3. Review two waypoint poses `L` and `R`, changing only yaw around `T`. A proposed
   initial offset is 3° on each side, retaining the previously used 5°/s angular
   and 1 mm/s linear limits. The waypoint offsets are experiment choices, not
   hardware-qualified values: verify all existing pose/speed limits and
   reachability before execution. Do not enlarge a failed waypoint to get a
   more visible result. Sensor traces, not visibility alone, distinguish this test.
4. Approach `T` from `L`, then in a separate successful leg from `R`, and finally
   repeat the first direction. Classify direction from fresh measured positions
   on opposite sides of `T`; a commanded waypoint is insufficient. Each waypoint
   must actually pass the unchanged combined arrival guard before continuing.
   Check that all accepted endpoint matrices and body targets match.
5. Retain at least three destination-stable native brackets within the existing
   settling window, with identical cadence and timestamp/sequence validation.
   Compare target→goal→trajectory→present gaps per motor, signed PWM/current,
   gains, modes, limits, voltage and temperature. Record the observed head response
   with a stationary external camera when available; daemon FK is not independent
   physical sensing. Add no weight or manual force to the head during the test.

No loop in this plan automatically retries a destination. A failed waypoint or
arrival ends that leg/pair. Keep the existing measured-hold recovery, then send
distinct Stop and Sleep cleanup through their current gates. A confirmed Stop
does not authorize an automatic return waypoint or reverse approach. The narrowly
fenced historical-fault allowance remains Sleep-only. Any continuation after
failure is separately reviewed future work, not part of the failed pair.

## Interpretation and validity

| Observed matched result | Supports investigation of | Does not establish |
| --- | --- | --- |
| Direction-dependent residual at the same full endpoint | Friction, backlash or hysteresis | Which mechanism, or a calibration fix |
| Similar signed residual/output from both directions | Repeatable holding-load equilibrium | Gravity/load rather than firmware behavior |
| Servo goals reached, independent head pose still wrong | FK, calibration or linkage geometry | That daemon FK is an independent measurement |
| Error changes with recorded voltage at comparable conditions | Supply contribution | Supply causality; no voltage change is planned |
| Goals, trajectories or matrices differ | Delivery/profile/target confound | A valid holding-load comparison |

Require repeatable changes larger than both encoder resolution and observed
within-condition spread. Keep individual brackets and the repeat-first result;
do not treat seven motors or repeated samples as independent trials. A change in
which joints carry error may reflect a coupled platform response.

Freshness/identity/ownership loss, unknown writes, new motor error bits, an
unreviewed voltage or temperature change, unexpected movement or failed arrival
invalidates that leg. Keep the 500 ms freshness limit and 1°/1 mm combined arrival
criteria. Capture cadence must stay within the existing shared native cooldown
and 200 ms budget. Software Stop retains its current limitations; it is not a
hardware emergency stop. Confirm final Sleep/disabled torque, drain reads and
release only the owned helpers and leases. If Stop or Sleep cannot be confirmed,
request operator recovery; missing network replies do not establish disabled
state. Save receipts privately.

## Stage B: conditional RAM P-only A/B/A identification

This is a later proposal, not an executable or numerically selected gain change.
Stage A should establish a repeatable comparison first. If it cannot pass its
waypoint/arrival gates, retain that result and reassess the next experiment;
do not relax those gates to reach Stage B. A later failed-arrival measurement
must still end its leg and enter cleanup rather than permit another motion.

The existing controller can enqueue D/I/P bytes at addresses 80/82/84 through
its serial owner. Enqueue success is not execution/readback proof, and the current
generic raw WebSocket is not a qualified gain transaction or rollback facility.
No second controller/serial owner may be opened. Thus hardware gain-write
reversibility is not currently qualified, despite RAM gains being writable.
A later private [owner transaction candidate](P_GAIN_TRANSACTION.md) implements
exact backup, readback and restoration offline. It remains uninstalled and does
not qualify Stage B or enable motion with changed gains installed.

Before any gain test, a separately reviewed owner transaction must provide:

- Fresh per-motor original P/I/D and configuration readback, an immutable backup
  and a narrowly fixed motor/P-only candidate. The candidate value remains unset.
- Exact preconditions and bounded completion fencing for queued writes. A delayed
  candidate must never execute after restoration or a stopped/expired session.
- Separate evidence of execution and readback. Test enqueue rejection, partial
  application, lost acknowledgment, delayed execution, failed readback and failed
  restoration offline. Unknown outcomes get no automatic write replay.
- Restoration of the exact original RAM bytes through the same owner, followed
  by independent readback of P/I/D and unchanged neighboring configuration.
  An enqueue reply, disabled motors or a restart is not verified rollback.

Only after that facility and a concrete value are qualified, authorize an attended
baseline A / candidate B / restored A comparison at identical complete targets,
with identical capture and power conditions. Change one preselected P channel;
leave I/D, operating/drive modes, current/PWM/voltage limits, homing offsets and
firmware unchanged. Change/read/restore while disabled, then independently verify
the intended gains after each explicit Wake; initialization can otherwise confound
the comparison. Restore original values before declaring completion. If restore
is unknown or failed, keep the robot disabled and report maintenance incomplete.

The [manufacturer notes that mode changes reset gains and profile/cap values](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#operating-mode11),
which is another reason to exclude mode correction and restart-based rollback.
Reversible reduction of error under B with restored-A replication would support
gain-sensitive holding behavior. It would not establish an inverse-error law,
prove mechanical health or select a production gain. No compensation, integrator,
force, supply adjustment or gravity/current-mode test is bundled with this plan.

## October 14 execution result

A later, separately authorized telemetry-only run attempted Stage A without
visual attendance. Wake was explicitly confirmed by telemetry, the complete
six-axis reference and body target were frozen, and the first 3° lower waypoint
was submitted at the unchanged speed limits. Its complete endpoint was
acknowledged, but the settling guard retained 1.212° combined angular error,
above the unchanged 1° limit. The failed waypoint ended the comparison; no
common-target return, upper leg or repeat occurred.

Measured hold, distinct Stop and Sleep completed; final disabled/zero-torque
observations passed. Gains, limits and modes were unchanged, and the mode
correction remained excluded. This outcome does not qualify Stage B or supply
a matched-direction result. Preserve the failed-waypoint gates and reassess the
next experiment offline rather than continuing this interrupted pair. See
[capture evidence and limits](HEAD_RESPONSE.md#unchanged-gain-matched-approach-attempt).

The subsequent [offline history replay](HEAD_RESPONSE.md#offline-first-waypoint-settling-history)
found no admitted post-acknowledgement snapshot within tolerance across 9.207
seconds. Early/late three-second mean angular errors were 1.187°/1.180°, and native
positions changed by at most one count across four stable brackets spanning
5.629 seconds. A sampled plateau rather than demonstrated slow convergence means
that extending the timeout is not an evidenced remedy. Kinematics model replay
also distinguishes the smaller goal-quantization contribution from the measured
servo gap. Preserve Stage A's failure termination and Stage B's unqualified status.
