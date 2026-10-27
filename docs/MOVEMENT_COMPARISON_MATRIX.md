# Six-axis movement comparison matrix — geometry 1 / protocol 3

The latest [October 17 selected continuation](#october-17-selected-continuation-and-vertical-findings)
is closed asleep. Daemon-local was narrowed to vertical only at the operator's
request; future tuning should start with vertical trials. Earlier preparation and
partial-run records below remain dated evidence.

Protocol 3 was implemented offline on **2026-10-17**. No robot request or motion
was part of that revision. Protocol 2's partial physical results remain dated
below; they do not qualify the new procedure. This is the successor to the small
[trajectory comparison](TRAJECTORY_COMPARISON.md), using the
[attended range survey](STATIC_ERROR_TEST_PLAN.md#october-16-wider-range-survey).
The [machine-readable target table](movement-comparison-matrix.csv) defines the
12 excursions. An injected runner and a synthetic-only CLI now implement four
conditions; this does not enable a new browser mode or qualify hardware use.
Read the [persistent bounded follower](BOUNDED_FOLLOWER.md) for implementation,
limits and integration requirements.

```sh
node tools/Prepare-Movement-Matrix.mjs
npm run compare:offline
```

The CLI accepts only `--demo`, loads no robot configuration and sends no network
request. It writes synthetic plans/results under ignored `local/`. Its approvals
and feedback are test fixtures, not physical arrival or clearance evidence.
Current preparation uses protocol 3 and the common **slow** profile, writing to
`local/movement-comparison-protocol3/`. It does not overwrite the frozen protocol
2 receipts. Existing injected callers can still construct canonical protocol 2
plans; selecting protocol 3 changes the plan hash and leg IDs.

## Purpose and proposed targets

Replay the same visible movements to compare both full-pose accuracy and visual
smoothness. Use approximately half of the historical encoder/FK-observed travel,
rounded conservatively, with a smaller forward target because of shell pressure.
These are **interior test targets, not a certified safe workspace**. Historical
contact, current height, actual starting state and the whole interpolated path
still matter. Single-axis trials do not qualify combinations.

| Head axis | Negative target | Positive target | Historical basis and selection |
| --- | ---: | ---: | --- |
| Yaw, relative to fixed body heading | −30° | +30° | About half of the observed approximately −66° / +58° endpoints; symmetric for direction comparisons. Full-range yaw touched the shell. |
| Pitch / nod | −18° | +18° | Approximately half of −36.95° / +36.32° observed at requested ±40°. |
| Roll / tilt | −20° | +20° | Approximately half of −40.83° / +40.67° observed. |
| X, backward / forward | −11 mm | +10 mm | Backward is about half of the −23.28 mm terminal observation at a −44.75 mm request. Forward is half of the earlier +20 mm trial reported without concern. Do not use half of the contact-limited +50 mm request or its approximately +31 mm partial travel. |
| Y, sideways | −22 mm | +22 mm | Rounded below half of −45.93 / +46.17 mm observed. |
| Z, down / up | −24 mm | +10 mm | Rounded below half of −49.12 / +21.61 mm observed; deliberately asymmetric. |

Signs use the existing task-frame convention. In particular, X positive is forward
and Z positive is up. Label yaw, pitch, roll and Y by sign until the operator
confirms the apparent direction from the recording viewpoint; avoid ambiguous
observer-left versus robot-left labels. The positive pitch endpoint is not
automatically labelled “head up.” Measurements are FK from encoders, not optical
pose or hard-stop measurements. Retain the survey's body-frame distinction.

“All axes” here means the six head pose coordinates. The body and antenna targets
are held constant and recorded. Separate antenna/body matrices can be added after
their own observed range and clearance review; no such range is inferred from
the six-axis head survey or the individual linkage motors.

## One matrix: 24 scored movements

Use this axis order: **yaw, pitch, roll, X, Y, Z**. For each axis execute:

1. Neutral → negative target.
2. Negative target → neutral.
3. Neutral → positive target.
4. Positive target → neutral.

That is 12 outward movements and 12 separately scored returns. Returns are
diagnostic trials, not invisible cleanup. There is no direct negative-to-positive
sweep: it doubles the stroke and changes its speed/path comparison. Other head
coordinates retain the same frozen neutral values for every target. Do not
combine yaw with lowering, or translation with tilt, in this version.

Use a **6 s nominal segment for rotations** and a **10 s nominal segment for
translations**, equally for each outward/return segment and every implementation.
After generation, retain a **10 s observation window** for every segment. These
are defined test stimuli and measurement windows, not estimates of how long the
session should take or a reason to cut a test short. Pauses and read drains are
recorded separately. A bounded read already in flight must drain.

At these ideal amplitudes, minimum-jerk peak reference speed is at most 9.375°/s
for rotations and 4.5 mm/s for translations. The corresponding linear reference
maxima are 5°/s and 2.4 mm/s. They are mathematical reference speeds, not measured
actuator speeds or certified robot limits. Screen the actual start-to-target
segments as well: following error changes the next segment's distance and can
introduce off-axis motion even though its destination is single-axis.

An optional second dataset uses **10 s rotation / 15 s translation** segments.
It changes only duration, has its own profile ID and repeats the full matrix.
Run it if the standard profile leaves a speed-dependent ambiguity; do not silently
slow individual failed legs or merge the two profiles' scores.

## Fixed reference and start quality

Freeze one complete nominal neutral pose `N`, body yaw target `B` and antenna
pair `A` before a comparison cohort. Neutral means zero pitch/roll/translation at
the survey's nominal task-frame height, with head yaw aligned to `B`. Apply the
same fixed body-frame transform to every pose. Store all matrices, units and
channel values; task-frame Z zero is not absolute physical head height zero.

Use the same `N/B/A` across the compared implementations. A pose measured after
each Wake must not redefine neutral, the excursion amplitude or the destination.
Keep measured initial state separate from `N`. If a later session needs a new
body frame or antenna baseline, create a new cohort and report that difference.
Do not silently rotate each target with fresh body heading and call the resulting
matrices identical. The ordinary 0.25° fresh-body-reference rule remains in force.

Record three different questions independently for every segment:

| Question | Required record |
| --- | --- |
| Was the prescribed matrix replayed? | Exact intended/accepted/stored complete targets, condition, order, duration and source hashes. |
| Did it reach its destination? | Existing combined 1° / 1 mm test, distinct post-write snapshots, sustained/final residual and separate native evidence. A miss remains a miss. |
| Is it a matched dynamic comparison? | Fresh measured start within 1° / 1 mm of that leg's prescribed start, body within 0.25°, antennas within 1° each, plus equivalent configuration, aim and observation policy. |

This fixes the workflow problem exposed by the latest roll attempt: failure to
reach neutral must remain visible rather than turning every next measurement
into another hidden centering attempt. **An accuracy miss alone is not a
freshness, ownership or hardware fault.** After a complete observation window,
the diagnostic runner continues to the next prescribed target only if
fresh stationary state, ordinary control/recovery status and its separately
qualified actual-start/return envelope all admit that path. It must label that
next segment's start as matched or unmatched before dispatch.

Unmatched segments can still describe prescribed-target replay, residual error
and exploratory visible motion. Exclude them from the strict paired smoothness
comparison. A cell without matched samples is reported as **not established**,
not zero error or a passed test. If a valid matched triplet cannot be collected,
address positioning as a separate experiment; do not keep nudging until one
reading happens to pass. Any extra positioning has an explicit ID and affects
the dataset's history.

This continuation policy is implemented in the dedicated matrix runner. It does
not clear faults,
remove recovery holds, replay an unknown write, or relax the arrival criteria.
The previous roll-only executor cannot run this matrix as-is: its ±15° roll and
±3 mm scope is intentionally too small. Before hardware use, a dedicated profile
must distinguish requested targets from measured drift and inward returns, and
screen their complete IK paths, joint margins and previously observed contact
constraints. A nominal-path preview alone cannot qualify an arbitrary bad start.

## Conditions, repetitions and order

Compare four paths without changing gains or mode:

| Condition | Reference and delivery |
| --- | --- |
| A: PC-linear | Existing capped-progress principle, serialized 20 ms nominal steps, no catch-up bursts. |
| B: PC minimum-jerk | Same interpolation, packet fields, pacing and guards as A; change the scalar time law only. |
| C: daemon-local minimum-jerk | One owned/cancellable goto per segment, verified installed math/defaults; preserve and measure stock terminal-target behavior. |
| D: persistent bounded follower | Carried commanded position/velocity/acceleration, bounded quintics in a fixed pose chart; no per-segment measured-state reset. |

Use the same complete head/body/antenna destinations, fixed segment durations,
source policy, camera/audio load and observation policy. A/B explicitly send the
exact endpoint once, as does D. C receives no silent endpoint repair. D can extend
its minimum duration to satisfy bounds; such a segment is explicitly marked and
excluded from the strict equal-duration dynamic comparison. Timestamp every Stop,
hold, task cancellation and positioning intervention. A common post-window
measured hold, if required by the owner, is outside the scored target window;
record the fresh start again afterwards. Do not insert an implementation-specific
hold or Sleep into one condition and omit it from the others.

First run one full 24-movement matrix per condition, ordered **A, B, D, C**. Review
coverage, contact, observer load and missing-start matches before collecting more.
For a repeatability dataset, collect four rounds. This order balances all twelve
ordered condition-to-condition transitions:

| Round | Whole-matrix condition order |
| --- | --- |
| 1 | A → B → D → C |
| 2 | B → C → A → D |
| 3 | C → D → B → A |
| 4 | D → A → C → B |

This yields **96 scored segments in the initial four-condition set**, or **384
across four rounds**, with four planned repetitions of each axis/sign/out-or-return cell per
condition. Count failures, interruptions and withheld cells explicitly. Extra
attempts get new IDs and never overwrite the original sample. Keep axis/sign
order identical within this matrix version. Later implementations replay the
same CSV and metadata; geometry, order, duration, aim, observer or configuration
changes require a new version/profile/cohort rather than an undisclosed edit.

Do not treat 384 segments as a single mandatory sitting. Review after each full
matrix and take operator breaks. The default **operator-sleep-wake** policy puts
an explicit reset checkpoint between whole conditions: Sleep acknowledgement,
native disabled/visual confirmation, explicit Wake, qualified awake feedback and
visual settled confirmation. The same frozen neutral/body/antenna references
remain in force. Wake does not prove the measured start matches; retain the
actual start test and any unmatched label.

Neither the trajectory runner nor `runAxis` sends power commands. The attended
session exposes distinct operator-invoked power/visual stages; no reset or
confirmation is replayed after uncertainty. Its confirmation stages can retry
read-only qualification without repeating Sleep/Wake. Within a 24-movement
condition, keep the same owner and awake state across ordinary pauses. A real
fault uses Stop/park and review; an accuracy miss never triggers Sleep. Final
Sleep is also explicit. The alternative **retain-awake** policy is available as
a separately hashed cohort, not mixed with reset-condition results.

## Make visual feedback useful

Before each axis block, show a clear cue such as **“Roll / negative / outward /
repeat 1”** and wait for the observer's ready signal. Then execute the four
preannounced segments with visible target/observation labels. Ask for feedback
after the block rather than seeking permission before each small movement.
Keep cues on the PC; do not add robot speech/wobbling to the experiment.

Prefer a fixed external view containing both head and base, with a second view
if one angle hides translation or tilt. Use 60 fps if available; retain actual
frame timestamps and dropped-frame evidence rather than assuming a constant
capture rate. Keep viewpoint, lighting, playback rate and framing the same across
conditions. A recording onset cue can align video with PC events approximately;
it does not synchronize encoder acquisition clocks. Keep recordings private.

Use anonymous condition labels when practicable and retain the mapping privately.
For each scored segment, collect separate 0–4 ratings for **interior-motion
irregularity**, **start/end jerk**, and **visible coordination/off-axis wobble**:
0 none seen, 1 slight, 2 clear, 3 pronounced, 4 severe. Record contact/pressure,
unexpected motion and observer confidence separately. “Not watched” or “not
enough movement to judge” is missing data, never a smoothness score of zero.
Visible coordination is an observation, not proof of asynchronous register writes.

Review clips side-by-side for the **same axis, sign, direction and speed profile**.
Do not compare A's outward tilt against C's return and attribute the difference
to execution location. Score the constant/central part separately from the
deliberately abrupt linear start/end so boundary easing does not hide interior
stutter. Do not give one implementation extra repeats simply to obtain a better
looking clip.

## Diagnostics and report format

Keep a stable key such as
`protocol-v2 / geometry-v1 / cohort / speed / round / condition / axis / sign / outward-or-return / attempt`.
Use that same key for trace, video clip and human rating. Retain:

- Exact measured start, prescribed start, all six-axis destinations/matrices,
  fixed body/antenna values, model hash and actual-start path-screen outcome.
- Nominal progress, monotonic send/ack times, generation duration and phase
  stretch; accepted/ignored/unknown outcomes and task UUID/list membership.
- The same single stored-target read after generation in all conditions,
  distinctly from native goals and measured pose. Acceptance is not arrival.
- Per-axis bias, combined angular/translation residual, primary travel achieved,
  maximum off-axis motion, overshoot, delay and measured arrival/not-arrival.
  Report endpoint errors at common times within the 10 s observation window and
  summarize its final 2 s, alongside the unchanged arrival classification.
- Send-interval/latency distributions, stale reads, snapshot ages, read load,
  pauses, task cancellations and all measured-hold/positioning interventions.
- Native goal/trajectory/present positions, PWM/current/limits, alerts and read
  sequence, collected through the existing owner during the same stationary
  observation windows at least 1.25 s after the preceding native completion.

Do not add high-rate raw motor polling during only one implementation. Use the
same existing cached status monitor while moving. A later moving-native-load
experiment needs its own qualification. HTTP response timestamps do not establish
sensor acquisition time; FK is not external head pose.

Estimate stationary measurement/video noise before reporting velocity ripple or
jerk. Preserve raw samples and actual timestamps; apply the same documented
processing to every condition. Do not manufacture jerk estimates from sparse
native reads or differentiate noisy irregular FK snapshots without qualification.
Do not time-warp clips or fit away different delays/phase stretch to make paths
look equally smooth. If PC duration stretches materially, run a separately named
duration-matched follow-up before attributing a B/C difference to execution site.

Summarize **per cell**: planned/issued/complete/matched counts, individual errors,
median and range across available repeats, visual scores/confidence, and contact
or freshness events. Keep accuracy, visual smoothness and data validity as three
separate columns. Four repetitions support a repeatability check, not a general
compatibility or statistical-significance claim. An incomplete dataset remains
useful evidence but cannot establish the missing comparisons.

## Before the first hardware matrix

The follower, runner, retained-owner adapter and explicit attended lifecycle have
offline tests. A cached-model screen covers 1,560 positions on all 24 nominal
outward/return geometries, retaining at least 314 encoder counts to the historical
joint limits. This is sampled model consistency, not actual-start clearance,
physical accuracy or a joint-derivative bound. Before hardware use, qualify
current actual-start/inward-return paths and the existing observer. Freeze the CSV hash, conditions,
reference, durations, cue/rating sheet and observer configuration. Reuse current
verified backups; another identical backup or routine daemon restart is not part
of this plan. Keep mode correction and gain changes separate. Confirm current
identity/version, sole writer and an attended observer before the explicit Wake.
The prototype remains unqualified for this matrix until those steps pass.

## Protocol 3: centering checkpoints and continuation

This revision addresses the workflow interruption exposed by the October 17 yaw
return. It does **not** correct the underlying static following error. Each
prescribed return still targets the same frozen nominal neutral and receives
the full scored observation window. The combined **1° / 1 mm arrival test is
unchanged**. No extra neutral packet, overshoot, calibration offset, goto, Sleep
or Wake is inserted to make a miss appear successful.

Before each axis, freeze a read-only centering checkpoint from the admitted
measured start. Normally its inactive coordinates retain the earlier 7° / 6 mm
allowance. A larger residual may be carried forward only on **one coordinate**,
from the immediately preceding completed axis's recorded neutral return. Keep
that return's failed accuracy and the next start's unmatched classification.
The checkpoint extends the allowance only toward that measured residual, with
a fixed experimental 0.5° / 0.5 mm measurement margin, clipped to the existing
global chart bounds. It does not expand again at each sample or leg. Unrelated
compound drift and poses outside the global bounds still stop the run.

Every leg's exact actual-start trajectory must then pass current full-path
model/joint and attended clearance review. The reviewer must acknowledge the
checkpoint hash and explicitly approve any extended residual envelope. A
previous nominal single-axis review does not approve the resulting coupled
return path. All generated and measured poses stay inside the frozen envelope.
This allows the observed +7.2° yaw residual to be reviewed before a pitch trial,
without treating +7.2° as the new neutral or certifying that path as physically
clear. The measurement margin is an experiment policy, not a robot limit.

For PC streams, an otherwise admitted stale cache can suspend new target output
while up to **three coalesced GET refreshes per leg** obtain fresh evidence.
Every subsequent dispatch still needs the ordinary 500 ms, identity/version,
epoch, ownership, body-reference and recovery gates. Progress remains capped;
there are no catch-up bursts or write retries. Pauses and duration stretch are
logged; a segment with such a pause is excluded from strict matched dynamic
scoring. A running daemon-local task retains immediate Stop/park on stale
telemetry: waiting for a read cannot suspend that task's local motion.

If a classified telemetry or diagnostic-read interruption does park a trial,
the same session can explicitly review it after confirmed Stop/hold and drain.
Current fresh idle state, original software, aim policy, native settings and
observer qualification are mandatory. Every submitted target must have a known
outcome, and any owned daemon task must be gone. Unknown writes, changed settings,
unconfirmed Stop, foreign motion and other fault types remain blocked. Successful
review retains the interrupted row and advances once to the next **unissued**
leg; `runRemainder` executes the rest of that axis. It never repeats the outward
movement, wakes the robot or retires the coordinator. Explicit Sleep/Wake remains
between whole conditions, and final Sleep remains explicit.

Summary fields distinguish exhausted queues from completed trials. Consuming an
interrupted row cannot turn an incomplete matrix into a successful one. A closed
older prefix can be restored as **historical references**, bound to its original
plan/results hashes and outcomes; it imports no new-protocol scores and proves
no current device state. This permits a later continuation at the unissued
PC-minimum-jerk pitch block while preserving the earlier 28 rows. A continuation
across protocol versions remains exploratory; a strict four-way comparison
needs a complete cohort using one procedure.

Offline tests exercise the observed residual, exact clearance refusal, envelope
growth rejection, the complete synthetic four-condition sequence, read delays,
daemon task cancellation, Stop races and historical restoration. These tests do
not establish physical clearance, smoothness or improved centering. No robot
contact, new backup, installation, daemon restart or motor setting change was
part of this revision. Reuse the existing verified software backups; fresh
metadata and changed content, if any, are sufficient for a later deployment.

## October 16 first attended condition

The first physical run is paused at the operator's request after **PC-linear**.
The initial explicit Wake and visual/awake native checks passed. Its measured
pose differed from nominal neutral by 3.25° / 3.06 mm; that difference was recorded
instead of redefining neutral. Before any scored head target, the run selected
the documented **slow profile for all four conditions**, because the standard
profile's conservative speed bound would withhold some paths from that start.
An idle local-controller handoff retained Wake and the frozen reference; it sent
no additional Wake, Sleep or head target.

All 24 PC-linear segments completed under one retained owner. Three met the
combined 1° / 1 mm arrival rule: positive pitch outward, negative Z outward, and
the final positive-Z return. Only two segments had matched prescribed starts.
The downward endpoint measured −24.01 mm against −24 mm; the final neutral return
ended at 0.31° / 0.17 mm combined residual. Most other accuracy misses remained
recorded misses; there was no per-leg correction or Sleep. The operator reported
**visible jitter on all six axes**. No contact/strain was reported for the yaw
block; the other axes were not explicitly rated for contact.

All **15,071** streamed writes were backend-accepted, with no unknown write
outcome. Nominal 10 s rotation ramps took a median **15.18 s**; nominal 15 s
translation ramps took **22.13 s**. Acceptance and duration stretch do not prove
physical smoothness. Logged cached snapshot start-age peaked at 338 ms during
the condition. Its 181 native observation brackets retained at least 1,267 ms
from preceding completion to the next bracket start; native register reads
peaked at 15.75 ms and observed motor temperature at 35°C. No high-rate moving
native observer or extra serial owner was introduced.

Dense model screening covered 24 actual paths at 1,025 positions each, retaining
at least 312 encoder counts to the current admitted joint limits. These 24,600
samples are model evidence, not continuous collision or physical-pose proof.
The original 501 software files matched before and after the condition. Existing
backups were reused; no software installation, daemon restart, gain, mode or
protection change occurred.

The final common measured Stop/hold and explicit Sleep completed; the operator
confirmed normal asleep/settled appearance. A subsequent native disabled-phase
qualification encountered a stale admission snapshot. A later **130 ms** status
read verified connected, ready, disabled and idle state, without repeating Sleep.
The native latency failure remains latched for explicit read-only review. This
exposed a live-coordinator retry integration gap, rather than a failed scored
movement or an unknown motion write. The idle local coordinator was retired;
there is no background robot polling during the operator's absence.

PC-minimum-jerk, bounded follower and daemon-local conditions remain **unissued**.
Resume must retain the exact frozen reference/slow profile and pending reset,
qualify the diagnostic-only stale-read recovery and current disabled device,
then await current attended authorization for the next explicit Wake. Do not
replay Sleep or repeat the completed condition. This partial dataset cannot
rank approaches or establish a smoothness improvement.

## October 17 partial PC-minimum-jerk yaw

Current attendance, identity/version, sole daemon owner and the unchanged 501-file
software baseline were requalified. The previous disabled native-read failure
passed explicit read-only requalification. One explicit Wake completed normally
according to the operator. The original frozen plan, nominal neutral, antenna
reference and common slow profile were retained. The measured Wake pose differed
from nominal by 3.43° / 2.93 mm; it did not become a replacement neutral.

Four PC-minimum-jerk yaw trials were attempted. The first negative outward ramp
was interrupted after 464 acknowledged writes, before its exact endpoint. Its
last target POST took approximately 3.45 seconds, exceeding the cached-read
freshness budget. A measured Stop/hold was acknowledged. After fresh idle and
native admission, the interrupted row was retained and the unissued return ran;
the outward command was not replayed and no additional Wake/Sleep was sent.
The positive outward ramp subsequently accepted and stored its exact +30°
endpoint, but its observation window was interrupted by another admission check.
Its known Stop/hold was confirmed; the cause of that check remains unresolved.
The final unissued return completed after renewed admission.

In total, **1,972 target writes** were acknowledged with no unknown write
outcome. Both return trials completed their observation windows, but failed the
combined 1° / 1 mm arrival rule. The final neutral return had approximately
**+7.16° yaw**, **7.29° combined angular error** and **2.38 mm translation error**;
a later idle sample remained around +7.2° yaw. This exceeded the frozen **7°
inactive-axis allowance** for the next pitch block. No pitch target was issued.
The allowance is a comparison/admission rule; these observations do not establish
a mechanical limit. It was left unchanged during this cohort.

The operator reported **smoother starts and stops than PC-linear, with jitter
still visible through the interior**, and no strain or problems. These separate
observations are useful hypotheses for further comparison; they do not establish
that all eased movements are smoother. Twenty B trials and all D/C trials remain
unissued. Across the original cohort, 26 trials completed and two were interrupted.

The private coordinator gained a targeted continuation policy: it can explicitly
abandon an interrupted PC/follower trial only after acknowledged writes,
confirmed Stop/hold, fresh idle/native admission and unchanged configuration.
It retains the failed row and proceeds only to an unissued leg. Unknown writes,
unconfirmed Stop and changed native settings remain blocked. A separate bounded
coalesced GET refresh can suspend generation while refreshing a stale cache;
the unchanged 500 ms gate still decides admission. Five targeted synthetic checks
passed. The GET-refresh branch was not exercised by the final physical return.
These changes are private experiment tooling, not a deployed browser or daemon
feature. Their mid-condition introduction is an additional comparison limitation.

Explicit final Stop and Sleep completed. The operator confirmed normal asleep,
settled appearance; final native/status reads verified disabled motors. The
original 501 software files matched again. The local coordinator exited and its
exclusive session was released, with no background polling. No daemon restart,
installation, new full backup, gain, mode or protection change occurred.

Before further motion, define how the experiment handles the observed neutral
return error: preserve the missed target and raw measurements, distinguish a
reviewed actual-start path from a matched prescribed start, and record any
separate reset intervention. Validate that procedure offline and apply it
consistently across conditions. Do not silently widen the frozen plan or replay
either interrupted outward trial.


## October 17 selected continuation and vertical findings

This attended session is closed, with normal Sleep visually confirmed, disabled
native diagnostics, unchanged software/sole serial ownership and coordinator exit
verified. No new robot software, daemon restart, full backup, gain, mode or
protection write occurred. Mode correction remains separate. These are hardware
observations; the earlier synthetic evidence is not substituted for missing trials.

| Approach | Completed / attempted | Arrival-qualified | Start/duration flags meeting runner criteria | Qualitative operator evidence |
| --- | ---: | ---: | ---: | --- |
| A PC linear | 24 / 24 | 3 | 2 | Interior jitter on all axes |
| B PC minimum-jerk | 21 / 24 | 3 | 2 | Smoother starts/stops; interior jitter remained |
| D bounded follower | 23 / 24 | 2 | 2 | Clearly preferred over the earlier PC conditions; improvement reported on all axes |
| C daemon minimum-jerk | 3 / 4 vertical trials | 2 | 0 | Pretty good motor coordination, with some remaining jitter |

C's other five axes (20 legs) were **excluded by explicit operator selection**.
Completed means the execution/observation window finished; it does not mean
arrival passed. Counts include retained protocol-2 history for A and B yaw.
Protocol changes, one round, unmatched starts, interruptions and unequal achieved
durations prevent a strict ranking. The runner flags above do not prove matched
physical speed. Qualitative answers were preserved privately; no 0–4 scores were
inferred from “better” or other prose.

The protocol-3 ledger contains 28 historical references, 45 new completions,
three interrupted trials and 20 exclusions. The selected queue is exhausted, with
zero unissued legs; the full matrix remains incomplete. Historical outcomes retain
another two interrupted B yaw attempts. None of those failed targets was replayed.

### Vertical endpoint and timing evidence

All targets below use the frozen nominal body/neutral reference and antennas.
Endpoint values are measured millimeters on Z, after the common observation
window, and retain off-axis errors in the raw evidence.

| Approach | Request −24 mm | Request +10 mm | Final neutral Z | Nominal ramp | Achieved vertical ramp time |
| --- | ---: | ---: | ---: | ---: | --- |
| A | −24.01 | +7.84 | −0.073 | 15 s | 22.01–25.12 s |
| B | −24.00 | +7.95 | −0.074 | 15 s | 21.90–22.70 s |
| D | −24.00 | +7.81 | Withheld before dispatch | 15 s | 21.56–22.44 s, completed legs |
| C | −24.00 | +7.91 | −0.074 | 15 s | 15.15–15.16 s, completed legs |

The similar upward shortfall persists across reference/execution paths. It should
not be hidden with UI offsets or treated as solved by smoothing. Slower actual PC
motion can affect visual jitter, but this session did not isolate speed as its
cause. Achieved ramp time includes task-list observation latency for C; it is
not a direct measurement of servo arrival time.

C's strict `exactEndpointStored` flag remained false. Numeric stored-pose
translation residuals in completed C legs were below 0.000000015 mm, with body
residual about 0.000000041 degrees. These floating-point residues are distinct
from millimeter-scale measured following errors. The exact flag and raw values
are retained; no endpoint correction was sent.

### Interruptions and harness corrections

B's forward stream had one POST timeout after 555 accepted targets in that leg.
The daemon later stored the exact timed-out target, while the HTTP reply remained
unresolved. The old owner/barrier was retained, the operator confirmed stationary
state, and a separate inspected connection sent one explicit Sleep. New-session
resume required verified disabled/native/software/visual closure and did not
replay the target. Existing known-Stop continuation still rejects unknown writes.

D's final vertical return was withheld before any target write because the measured
start changed during actual-path model review. A measured hold and Stop passed.
The planned condition-boundary Sleep followed; the withheld return stays failed.

C exposed a task-list race: an accepted return UUID disappeared from a cached list
before it was ever observed running, was dropped from application ownership, then
appeared as foreign in fresh telemetry. The task finished; a later explicit Stop
confirmed a measured hold. The private comparison owner now retains the accepted
UUID until telemetry started after acceptance sees membership, followed by a later
absence. Focused synthetic tests cover older/empty caches, observed transitions,
foreign handles and Stop/drain behavior. The two unissued legs then completed
using a fresh PC controller and qualified awake hold, without another Sleep/Wake.
This changes experiment bookkeeping, not daemon motion code or ordinary browser
control. The original interrupted return remains unscored.

### Next experiment: vertical first

The operator's explicit preference is to optimize repeated vertical motion before
expanding back to six axes. Keep −24 mm / neutral / +10 mm / neutral, frozen body
and antenna references, unchanged gains/mode/protection and the same observation
window. Preserve direction-dependent returns, off-axis error and interrupted rows.

Start by separating speed from execution path: repeat daemon-local vertical motion
at the current 15 s profile and the existing 10 s translation profile, with current
actual-start/model and attended clearance qualification. Then compare the bounded
PC follower using predeclared achieved-duration matching or report duration mismatch
as a confound. Do not call equal nominal durations matched physical speed. Collect
interior jitter, transitions and coordination as separate observations and record
confidence without inventing scores. Add repeated/counterbalanced rounds before
ranking approaches. Expand axes only after a useful vertical improvement.

This is a proposed next hardware experiment, not permission to start a new run.
The session ends asleep; fresh attendance, identity/version, ownership, native
settings, epoch, recovery and actual-path gates still apply. Mode correction is a
separate experiment.

## October 17 vertical speed and direction experiment

Four attended daemon-local blocks used the same fixed full reference, body yaw,
antennas, −24 mm / neutral / +10 mm / neutral targets, and 10-second observation
windows. Each condition had explicit Wake/visual admission and final Sleep/visual
disabled confirmation. The initial 15-second repeat and matched PC follower were
deferred when the operator requested speeds resembling Pollen animations.
The unchanged installed Sleep code has a conditional one-second recenter and a
two-second fold; Wake has a distance-dependent rise and 0.2-second roll segments.
Duration resemblance is not an exact reproduction of those paths or speeds.

All 16 legs completed; eight passed combined 1°/1 mm measured arrival. No guard
interruption, uncertain write, endpoint correction or failed-target replay
occurred. Starts were measured and retained rather than silently redefined as
nominal. This is exploratory one-round evidence, not a counterbalanced ranking.

| Nominal duration | Observed task/generation duration | Down target −24 mm | Neutral from below | Up target +10 mm | Neutral from above |
| --- | --- | ---: | ---: | ---: | ---: |
| 15 s | 15.17–15.22 s | −24.00 mm | −2.62 mm | +7.81 mm | −0.074 mm |
| 10 s | 10.13–10.19 s | −24.00 mm | −2.63 mm | +7.86 mm | −0.085 mm |
| 2 s | 2.14–2.16 s | −23.99 mm | −2.58 mm | +7.79 mm | −0.085 mm |
| 1 s | 1.20–1.23 s | −24.01 mm | −2.39 mm | +8.02 mm | −0.094 mm |

Z values are encoder-derived measured pose, not independent physical metrology.
Full combined errors and off-axis motion remain in private receipts. Durations
include task-list observation latency and are not direct servo-arrival times.
The operator reported similar jitter at 15/10 seconds, upward generally smoother
than downward, two seconds quite smooth and one second good. No numeric ratings
were inferred. The two-second trial was explicitly cleared before one second;
normal final Sleep was visually confirmed in every condition.

### Direction-dependent following error

The two neutral returns in each condition had identical observed seven-motor goal
register vectors. Complete native brackets compared the stored daemon target and
converted joints with those registers: sampled goal delivery agreed exactly.
Poor neutral returns retained up to 63 counts of goal/present error, with sampled
PWM below 8.4% of its cap; the goal/internal-trajectory difference in these poor
returns was at most two counts. Neutral returns from above had at most three
counts of sampled goal/present error. These non-atomic, sparse brackets do not
exclude brief saturation or establish a physical cause.

The repeatability across durations and equality of neutral goal registers
support an approach-history-dependent following error, separate from network
loss, missing targets or the choice of easing. Friction, backlash and compliance
under load remain candidates. Faster execution did not eliminate the static
shortfall. No P-gain benefit, profile remedy or operating-mode correction was
tested. One-second stored endpoints differed from requested translation by less
than 0.000064 mm: these tiny interpolation residues do not explain the millimeter
following error, and strict exact-endpoint flags remain false.

### Communication observations

Four explicitly started/stopped read-only collectors reused the existing passive
ARP/route/NetworkManager observer, with independent PC and loopback status samples
at nominal one-second intervals. Source hashes, readiness, finish handshakes,
packet-drop counters and owned-child exit were retained. No networking or logging
setting was changed. All 847 PC and 778 loopback status requests succeeded; no
captured IPv4 route-change or selected conflict event appeared, and ARP capture
reported zero drops. Initial/final route snapshots retain the existing workaround.

PC maxima by condition were 329/187/125/625 ms; corresponding loopback maxima
were 87.63/89.54/80.79/76.72 ms. The 625 ms independent PC probe began while still
waiting for Wake, before its request. It did not trigger a motion guard. Separate
probe intervals and unsynchronized clocks do not locate the latency cause.
Successful availability and a finite event-free capture do not qualify continuous
feedback freshness or prove that the earlier routing failure is repaired.

### Slow-speed coordination: source and offline model

Installed-matching Python source runs the backend at nominal 50 Hz and submits a
six-joint Stewart vector. The native writer uses one grouped `sync_write` for
those six motors; body/antennas have separate writes. This argues against six
sequential head-motor commands as the explanation. It does not prove identical
physical start times or native bus cadence.

An offline model used the installed-matching kinematics, Pollen interpolation,
the existing integer-count conversion and ideal 50 Hz sampling. Reusing the same
saved actual-start geometry at each duration, the central 20–80% of the downward
path had these predicted characteristics:

| Duration | Unchanged count goals per motor | Frames where only some head-motor count goals change |
| --- | --- | --- |
| 15 s | 31.6–41.8% | 86.4% |
| 10 s | 8.7–15.3% | 33.7% |
| 2 s | 0% | 0% |
| 1 s | 0% | 0% |

These are **synthetic count-reference statistics**, not measured bus packets or
physical servo timing. Ideal symmetric pure-Z motion produced synchronized count
changes for all six motors, including slow speeds; the saved actual start also
contains off-axis corrections and unequal joint paths. Discrete small goals can
contribute to apparent stepping, but this model alone cannot explain the
directional physical response or attribute jitter to quantization.

The next useful diagnostic is a finite, bounded in-process trace of commanded
pose, computed six-joint/count vector, enqueue/execution times and existing native
position-cache values/sequences at the backend cadence. Reuse cached feedback and
the sole serial owner; do not multiply diagnostic bus reads or synchronous disk
writes to obtain a trace. The current 1.25-second native brackets characterize
settling, not individual motor coordination during motion. Compare symmetric
pure-Z and the actual-start path, and upward/downward motion. Qualify observer
overhead before an attended repeat. At that checkpoint the trace was proposed;
the later [joint-trace record](JOINT_TRACE.md#attended-152-second-vertical-traces)
documents its installation and eight attended 15/2-second vertical captures,
including two incomplete traces. Servo-profile interpolation and P-only response tests remain separate
possible experiments; raising packet rate alone does not add encoder resolution.

All four coordinators and collectors exited, raw torque/disabled checks passed,
and unchanged 501-file/sole-owner audits passed. Backups were reused, with no new
full backup, install, service restart, gain, mode, protection or website change.
