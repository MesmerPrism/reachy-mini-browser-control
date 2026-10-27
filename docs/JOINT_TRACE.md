# Bounded joint delivery trace

October 17, 2026. The diagnostic patch is installed after ARM runtime validation
and disabled-motor overhead checks. A later attended 15/2-second vertical run
collected eight physical movement traces; six have complete coverage. See the
[movement findings](#attended-152-second-vertical-traces) and their limitations.
It observes the existing controller owner. It does not change trajectories,
servo conversion, gains, operating modes, protections or motion admission.
The separate mode correction remains excluded.

## Question it addresses

The attended vertical experiments found slow interior jitter despite better
coordination with the bounded follower and daemon-local movements. Two-second
vertical movements looked quite smooth; one-second movements looked good.
The same neutral goal-register vectors produced different measured results
depending on approach direction. These are separate observations: improved
visual smoothness does not establish endpoint accuracy.

An offline encoder-count model predicts staggered small goal changes at slow
speed for the saved starting geometry. The existing sparse servo-register
brackets cannot establish whether that pattern occurred on the robot. This
trace connects actual generated joint vectors to native serial-call timing and
the feedback already read by the controller. It adds no servo reads.

## Captured evidence

| Phase | Recorded fields | Meaning |
| --- | --- | --- |
| Reference | Frame ID, seven target joints, latest requested pose snapshot, Python tick clock | Actual joint vector passed to the head enqueue; pose and joints are independently sampled |
| Enqueue | Frame ID, start/end, accepted flag, six encoded head counts | Existing queue admission interval; acceptance does not prove execution |
| Execution | Frame ID, start/end, result, six encoded head counts | Existing grouped head goal-position call, once, on the existing serial worker |
| Feedback | Existing read sequence, start/end, cache publication flag, nine cached joint positions, cache wall timestamp | Successful read/cache update or explicit failure; no extra polling |

Native times use one monotonic clock, exported as integer nanoseconds relative
to capture start. Python tick times and the Python clock bracket around native
start are decimal strings to preserve precision. Do not subtract the Python
and native clock values. Match native events by frame, rather than assuming
append order is execution order: a fast worker can finish before enqueue returns.

The six Stewart motors retain their existing grouped write. Body and antenna
writes keep their original path and are not individually timed by this trace.
Feedback spans sequential existing reads; it is not a simultaneous sample of
all motors. Native completion timestamps bound host calls, not servo acceptance,
sensor sampling, USB transmission completion or physical motor response.

## Bounds and controls

The candidate is disabled by default. A deliberately configured private token
and a direct loopback caller are required for its daemon routes. Forwarded
requests are rejected. Routes expose observer start, stop, snapshot and clear;
they accept no motor IDs, bus addresses, motion targets or file paths. The
observer cannot construct another controller, authorize motion, Wake or Sleep.
Existing identity, version, ownership and recovery gates remain necessary for
any separately authorized movement.

One retained capture is allowed, fenced by daemon session, capture ID and native
epoch. Bounds are 64–16,384 events and 1–60 seconds; defaults are 8,192 events and
30 seconds. The deadline limits recording, not a motion or experiment. Memory
is reserved before recording; producers use a nonblocking recorder lock.
They perform no disk writes or JSON serialization. Capture overflow, expiry,
contention, worker interruption, unattributed head writes and other unobserved
mutation/raw-packet commands are explicit
exclusions. Normal motor commands retain their original execution behavior.

Stop here means **stop recording**, not stop robot motion. It drains admitted
trace producers and places a non-motion barrier on the existing worker queue.
Snapshot/export follows that barrier; clear requires the exact sealed handle.
Export constructs Python objects after recording, so collect it after the
movement and observation are finished. Between-leg export requires the current
idle owner; no next target is submitted until export and clear finish. Measured
ARM export costs are recorded below. Maximum-capacity cost remains unqualified.
A pending barrier may be inspected using that same handle; never replay a motion
because its diagnostic trace is incomplete. No background sampler is started.

Raw traces, tokens, candidate patches and deployment receipts belong under
ignored `local/`. The reviewed public export contains this contract, the offline
analyzer and synthetic tests. Existing verified backup archives are reused;
there is no new full robot backup for each diagnostic iteration.

## Offline analysis

The analyzer is a pure saved-file operation and imports no robot controller:

```sh
node tools/Analyze-Joint-Trace.mjs --capture local/saved-joint-trace.json --output local/new-joint-analysis.json
```

It refuses overwrite and confines output to the existing ignored local directory.
Input is bounded to 32 MiB. Analysis reports native reference intervals, queue
admission duration, queue-to-execution bounds, grouped write duration/interval,
existing feedback completion gaps and six-joint encoder-count step distributions.

Coverage requires complete frame phases, matching conversion, confirmed writes,
ordered read sequences and no loss/overflow/interruption/expiry. An empty trace
cannot qualify. Qualified following-error associations use the latest completed
group write preceding a feedback bracket with no overlapping write. Partial
captures retain descriptive metrics but do not qualify following-error analysis.
Coverage is not an arrival or motor-health certification.

A disabled-motor capture can contain feedback but no target frames. Its feedback
timing remains descriptive evidence for the overhead check; its deliberately
unqualified movement coverage is expected, rather than a motor fault.

## Qualification and next use

Offline checks exercise the real Rust controller against a memory serial bus,
compiled Python bindings, the daemon's actual head-send branch, inert ASGI
routes and synthetic analyzer fixtures. They verify unchanged motor packets,
failure propagation without replay, barrier behavior, explicit loss and strict
private endpoint admission. This is offline evidence only.

Qualification passed 58 Rust tests, including real compiled Python bindings,
10 daemon integration checks and all 513 project tests. Both production builds
passed; the explicit 196-file source inventory passed its privacy/ZIP checks.
The native Windows CPython 3.12 debug wheel imports successfully and both
candidate wheels have verified package records. The daemon retains all 327
bundled assets and 488 unchanged payload entries. These offline checks alone do not qualify
the ARM runtime, device overhead or physical response.

The later ARM release wheel loaded on the robot's ARM64 CPython 3.12 runtime.
An isolated generated-PTY fixture exercised the actual extension and manager:
80 virtual grouped goal writes, exact count conversion, 20 traced frames,
23 feedback events, no lost events, and capacity/expiry behavior. OS tracing
found no physical device open or INET connection in that fixture. All ten daemon
integration checks passed on ARM. This is runtime evidence, not physical motion.

The physical installation changed exactly eight package paths, including two
new modules and the two package records. The resulting 503-file inventory was
verified, with 495 previous files unchanged. Existing rollback wheels were
reused; only 68,754 bytes of original installed RECORD data needed new preimages.
No new full backup, gain/mode/protection change, Wake or movement command occurred.
One controlled daemon restart preserved no-startup-Wake. A private service
environment under `/run` enables the loopback observer until reboot; persistent
configuration is unchanged. Recording is stopped and both captures were cleared.

The disabled-only physical test compared five consecutive 100-sample windows:
recording off/on/off/on/off. Both recording windows retained 505 consecutive
feedback events with no loss, expiry, overflow or interrupted read. All 500
sampled cache timestamps advanced; no head-target event was recorded.

| Measurement | Recording off | Recording on |
| --- | --- | --- |
| Native published mean period | approximately 20 ms | approximately 20 ms |
| Maximum sampled cache completion age | 18.8–23.4 ms | 21.6–24.3 ms |
| Daemon CPU, percent of one core | 50.2–53.4% | 53.8%, 61.9% |
| Whole-daemon read syscalls per second | 1,469–1,478 | 1,455–1,466 |

Recorded native feedback gaps had medians of 20.03/20.08 ms, 95th percentiles
20.68/20.80 ms and maxima 24.01/22.39 ms. Read-plus-cache-publication medians were
1.85/1.87 ms. These observations show no freshness or read-load regression in
this sample. Whole-process I/O counters are not serial-only counts, and the CPU
increase is not isolated from background load. No fixed CPU budget is certified.
Resident memory rose approximately 1.6 MiB across the sequence, including exports;
this short run does not establish long-term memory behavior.

Snapshot/export took 110/129 ms for these feedback-only captures. Export stays
outside movement capture; maximum-capacity export and physical joint-write
producer cost have not been measured. Final readback confirmed disabled torque,
the same sole daemon owner and the loaded candidate image. The attending
operator confirmed that Reachy remained asleep and settled, with no unexpected
movement throughout installation, restart and observation.

The journal also reported cloud WebRTC relay authentication and TURN DNS lookup
warnings. Loopback trace authentication succeeded and local status stayed
available; the cloud media path was not qualified by this test.

The later movement experiment below used fresh preparation against this 503-file
baseline. Older helpers expecting 501 files remain historical and must not be
reused as though this installation were unchanged.

## Attended 15/2-second vertical traces

The operator watched two daemon-local minimum-jerk blocks, each requesting
−24 mm, neutral, +10 mm, neutral, with ten seconds of observation after each
movement. Nominal durations were 15 and 2 seconds. Explicit Wake and visual
confirmation preceded each block; Sleep/Wake separated conditions. Final Sleep
was acknowledged, native disabled checks passed, and the operator confirmed
asleep/settled behavior. The same sole daemon and 503-file software inventory
passed both final audits. No install, service restart, new full backup, gain,
protection or operating/drive-mode change occurred; mode correction stayed separate.

Each leg recorded into an 8,192-event, 60-second bounded capture. Export followed
task disappearance and the completed observation window, with current idle and
identity checks. The eight captures contain 34,126 events. All were sealed,
exported and cleared; no overflow, deadline expiry or worker interruption occurred.
Export took 524–996 ms, outside movement. The observer adds no motor reads.
This run did not compare moving overhead with recording disabled, so it does not
isolate tracing cost or establish a general performance budget.

Six captures qualify complete frame/read coverage. The two slow return captures
each lost one observer event: one has a feedback-sequence gap, the other a missing
frame phase. Their descriptive count/timing metrics are retained, but their
following-error associations are excluded. They are not treated as lost motor
commands or successful complete traces. No motion was replayed to repair evidence.

### Goal counts and write timing

The following uses each actual joint-reference change window, including eased
ends, with a 1e−8 rad change threshold. It is not the earlier offline model's
central 20–80% window. Actual measured starts retain ordinary off-axis residuals;
these conditions are not exact matched-start causal experiments.

| Leg | Unchanged goal updates per head joint, 15 s | Same measure, 2 s |
| --- | --- | --- |
| Down 24 mm | 50–58% | 11–13% |
| Up to neutral | 50–51% | 13–14% |
| Up 10 mm | 68–73% | 17–19% |
| Down to neutral | 81–84% | 24–27% |

Only some joint counts changed on roughly 56–70% of slow updates, versus 6–21%
of faster updates. These are rounded integer goals in **grouped six-motor
writes**, not six independently scheduled motor commands. A repeated count is
not a missed packet, and different count-change times do not prove different
servo acceptance times. The two incomplete slow captures are descriptive only.

Across legs, grouped host write-call duration had 95th percentiles of
0.106–0.119 ms; queue-to-execution 95th percentiles were 1.04–1.73 ms. Occasional
write intervals reached 60 ms in the slow block; the nominal backend period is
20 ms. The trace does not locate the origin of each gap or timestamp USB/servo
acceptance. Existing feedback generally continued near 20 ms. Recorded PC
snapshot reads had medians 33/30 ms, 95th percentiles 50/45 ms and maxima
110/109 ms for the slow/fast blocks. No movement freshness guard or uncertain
motion write occurred. Both bounded journals had no traceback or IK-error log;
cloud relay/TURN warnings persisted. This is availability evidence for this run,
not proof that the historical network fault is permanently repaired.

The operator reported coordination-related jitter with no contact or strain at
15 seconds. Two seconds looked much better; upward still looked smoother than
downward. This supports count staircases as a contributor, without proving they
are the sole cause. Mechanical friction/load and control response remain open.

### Static following error remains separate

Only four of eight legs passed combined measured arrival. Both speeds reached
the downward target and the neutral return from above. Both missed the upward
target and neutral return from below. Neutral goal-register vectors were identical
from either direction and across speeds; measured results were not:

| Neutral approach | Measured Z, 15 s | Measured Z, 2 s |
| --- | --- | --- |
| From below | −2.76 mm | −2.62 mm |
| From above | −0.074 mm | −0.085 mm |

At the sampled neutral return from below, head goal/present differences were
27–68 encoder counts, with absolute PWM 32–80 against a limit of 885. From above,
differences were 0–3 counts and absolute PWM 0–3. Sampled trajectory registers
were within two counts of the neutral goals; these sequential brackets are not
simultaneous bus observations. The repeated approach dependence is larger than
one-count quantization and supports a separate load/control/mechanical question.
It does not identify a particular mechanism or establish that a gain change helps.

### Resolution and next experiments

The observed model number 1200 maps to XL330-M288-T. Its position register uses
4,096 counts per revolution, approximately 0.088° per servo output-shaft count.
This is command/sensor resolution, not a requirement that physical motion jump
between rigid steps; Cartesian head displacement per count depends on geometry.
The manufacturer documents built-in profiles driven by Profile Velocity and
Profile Acceleration, and says zero Profile Velocity disables profiling.
See [ROBOTIS's model and profile reference](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#what-is-the-profile).
Both profile registers read zero in this experiment. No profile setting changed.

The next useful work is to resolve observer event loss, then isolate update
timing from quantization using the saved vectors. A separately prepared,
reversible profile experiment could test interpolation while preserving the
existing operating/drive modes, exact backup/readback/restoration and path bounds.
Higher streaming rate alone cannot add position resolution. Profile smoothing,
static-error correction and the retained mode-correction candidate must remain
separate conditions; no remedy is established by this run.

A startup diagnostic issue also surfaced before Wake: requesting the optional
stored target pose while it is still unset produces an assertion/HTTP 500 in
the daemon. The private runner now requests measured state for disabled-only
brackets; awake target checks remain strict. This required no robot software
change and is separate from network loss and the movement findings above.

## Offline producer-contention fix

A later source-only candidate replaces the native exclusive append mutex with
shared read admission and individually reserved, preallocated event slots.
Reference/enqueue and feedback/execution producers no longer compete for one
exclusive append lock. No dependency, bus operation, conversion, command retry,
trajectory, gain or mode change is added. At this source-only checkpoint the
installed recorder still had the older append path. Subsequent ARM and disabled
device results follow below.

Saved slow captures locate one missing feedback event and one missing reference
event. Both use the old native `try_lock` append path; its existing deterministic
contention test explicitly demonstrates diagnostic loss while commands continue.
The exact thread schedule at the physical loss instants was not observed, so
the source mechanism is supported without claiming a timestamped causal proof.

The replacement reserves and initializes every slot before enabling recording.
An atomic reservation assigns each event a distinct slot; publication performs
no vector growth or file/JSON work. Lifecycle writers are serialized separately,
and seal waits for admitted publishers before snapshot. Unexpected lifecycle
unavailability or a missing reserved publication interrupts coverage. Explicit
unattributed-write loss, overflow, expiry and worker interruption remain exclusions;
the fix never upgrades an incomplete capture to qualified evidence.

Native validation passed the worker/binding/strict-model suite and concurrent
producer stress. Twelve rounds of eight concurrent producers retained 98,304
events with no loss or duplicate sequences, without exceeding allocated storage.
Tests also hold one publisher open while another completes, ensure seal drains
both, preserve a contiguous overflow prefix, and fence stale epochs. Host timing
and ARM producer overhead still require qualification; shared read admission is
not a claim of a wait-free recorder or a hard real-time bound.

The full native suite passed 65 tests. A memory-bus worker capture crossed the
compiled Python snapshot binding and passed the public analyzer with complete
three-frame/read coverage. The Windows CPython 3.12 extension wheel imports and
its package records verify; only the extension and its RECORD differ from the
reviewed container. Controller, worker, conversion and daemon sources remain
unchanged. All 513 project tests, both production builds and the explicit
197-file source privacy/ZIP checks passed. These are offline results only.

The separately prepared [servo-profile A/B/A experiment](SERVO_PROFILE_EXPERIMENT.md)
specifies exact profile preimages, readback, restoration before Sleep and the
unimplemented hardware-owner admission requirements. It changes no mode and
does not yet authorize a profile write or movement.

### Subsequent isolated ARM runtime qualification

The combined profile-entry/recorder candidate built in ARM release mode and
loaded from an isolated overlay. Its retained PTY recorder fixture completed
80 virtual grouped goal writes, exact conversion and 20 traced reference/enqueue/
execution sequences with zero lost events and 23 cached-feedback events. Capacity
and expiry exclusions passed. The exported normal capture passed the public
analyzer without coverage exclusions. Profile preparation was rejected while the
observer was active, before creating a pending transaction.

The process-tree syscall receipt and its downloaded copy show only the generated
PTY and no physical device opens or INET connections. Production package hashes
and the existing physical serial owner remained unchanged, and fixture processes
and generated staging were retired. This validates ARM execution and virtual
queue/trace behavior; it does not measure physical producer overhead or certify
the resolution of event loss during real movement. The fix was uninstalled at
that checkpoint; the later device result follows.

### Recorder fix: disabled device check

The later October 17 device pass installed the recorder fix together with the
private profile entry. Five ten-second windows used the same disabled owner and
100 state/cache observations each, in off/on/off/on/off order. Each recording
was explicitly sealed, exported and cleared before the next window. There were
no movement targets or reference/enqueue/execution events in these captures.

The two captures retained **505 and 506 consecutive feedback events**, with zero
loss, overflow, expiry or interruption. All 500 sampled cache timestamps advanced.
Feedback completion-gap medians were 20.08/20.09 ms, 95th percentiles 20.61/20.67 ms
and maxima 23.20/24.91 ms. Median read-plus-publication time was about 1.87 ms.

| Measurement | Recording off | Recording on |
| --- | --- | --- |
| Maximum sampled cache completion age | 22.9–23.8 ms | 33.6 / 23.7 ms |
| Daemon CPU, percent of one core | 49.0–53.3% | 61.0 / 61.2% |
| Whole-daemon read syscalls per second | 1,475–1,476 | 1,465 / 1,457 |
| Median state HTTP read | 6.5–8.3 ms | 9.4 / 9.5 ms |

RSS increased about 2.8 MiB over the complete sequence, including exports.
Recording has measurable overhead; the sampled cache remained fresh under this
load, but CPU and memory budgets are not certified. Whole-process I/O includes
HTTP and background activity, so it cannot isolate serial traffic or prove no
additional bus reads. Cache completion age is not physical sensor age.

These feedback-only captures intentionally lack movement-frame coverage. They
cannot qualify concurrent producer contention, following-error association or
loss resolution during real movement. Fresh attended moving traces are still
required. Package/loaded-image checks, disabled torque and the sole owner were
verified after the experiment; the private candidate remains installed. See the
[disabled profile qualification](SERVO_PROFILE_EXPERIMENT.md#disabled-only-physical-qualification).

Related: [head response](HEAD_RESPONSE.md),
[vertical experiments](MOVEMENT_COMPARISON_MATRIX.md#october-17-vertical-speed-and-direction-experiment),
[bounded follower](BOUNDED_FOLLOWER.md).

The subsequent attended original-profile downward leg retained 1215 complete
frames and 1276 feedback reads and passed the public analyzer without exclusions.
It finished with 0.28 mm / 0.87° endpoint residual; the operator still saw jitter.
The accepted return failed, and its active capture could not be exported after
readiness was cleared. This exposes a recovery limitation, not evidence that the
return was unissued. The subsequent candidate permits authenticated
observer sealing under inhibition, as described below; it was uninstalled at
that earlier checkpoint.
See the [partial A1 and recovery record](SERVO_PROFILE_EXPERIMENT.md#first-physical-leg-and-restoration-only-recovery).

### Export after inhibition: offline continuation contract

Only `stop`, `snapshot` and `clear` may bypass the backend readiness flag. They
require the current daemon backend, its live native owner (directly or through
its existing head-lease proxy), the configured secret token, a loopback peer,
no forwarded-client headers, and the original owner-session/capture/epoch handle.
A closed/replaced owner or foreign handle is rejected. No controller is opened,
no servo register is read, and no motion or readiness authority is restored.
Native sealing retains the existing queue barrier and producer drain rules.
`start` remains readiness-gated and is denied after motion inhibition.

For a failed job, retain its status and handle, verify the same owner, seal once
and export the existing capture before an explicit original-profile restoration.
Save the raw export durably before clearing it. If sealing/export is unavailable,
keep the handle and recovery lock for inspection; never restart a capture or
replay the failed target to obtain a replacement trace. Recording completeness
does not turn an interrupted job into a completed movement or physical-arrival
result.

Offline tests cover authenticated in-process HTTP recovery and an actual native
worker with generated registers. A failed movement was sealed/exported while
readiness stayed cleared; restoration remained a separate explicit operation.
The subsequent isolated ARM/PTy pass exercised the same routes on an actual
native worker: fourteen completed captures passed coverage analysis, and a
failed-job capture was exported while motion/readiness stayed inhibited. The
process-tree audit showed no physical-device opens or INET connections;
production files, journal and serial owner were unchanged. At that checkpoint the
private candidate was uninstalled and still needed attended installation/physical qualification.
See the [ARM record](SERVO_PROFILE_EXPERIMENT.md#head-only-continuation-isolated-armpty-qualification).

The subsequent attended installation retained all six completed physical captures
(four original-profile A1 legs and B's down/return), totaling 7298 complete frames
and 7654 feedback events. B's next preflight found the backend closed after a
motor-communication error; its upward target and capture never started. The
completed return had already been exported. Inhibited export requires a retained
live owner, so it cannot recover a capture after that owner has been destroyed.
This is a separate lifecycle gap from readiness-only inhibition. Original-profile
recovery and visually confirmed Sleep completed; A/B/A remains incomplete.
See the [physical result and limits](SERVO_PROFILE_EXPERIMENT.md#head-only-physical-comparison-and-backend-loss).

A subsequent uninstalled Python candidate contains classified cache-feedback
faults after confirmed output revocation, retaining this observer's owner and
private restoration access. Fresh feedback alone does not release its output
fence. Synthetic active/paused fault tests cover inhibited export and explicit
restoration/fresh acknowledgement. The subsequent native-worker/ARM qualification
induced real native-cache errors through a generated PTY, retained/exported the
interrupted trace and kept it excluded. Four completed captures passed coverage;
production stayed unchanged and disabled. See the
[feedback-error recovery contract](SERVO_PROFILE_EXPERIMENT.md#feedback-error-owner-retention-offline).


The later attended feedback-recovery installation completed all twelve vertical
A/B/A captures: 14,585 complete frames and 15,302 feedback events, all coverage
qualified. No feedback-cache failure occurred in this physical run; the recovery
fault path remains separately tested on ARM/PTys. The traces retained similar
upward joint asymmetry across original, candidate and restored-original profiles.
See the [complete physical A/B/A record](SERVO_PROFILE_EXPERIMENT.md#feedback-recovery-installation-and-complete-vertical-aba)
for endpoint misses, visual observations and remaining maintenance-gate failures.

## Encoded-goal and terminal-hold analysis

The offline analyzer now reports `encodedGoalMinusCachedPositionCounts` separately
from floating-reference error. Native conversion quantizes each reference; a
fractional difference from that floating reference is not itself a servo tracking
error. Neither metric reads a servo goal register or proves physical delivery.

`terminalHold` separately examines the final constant six-head encoded-goal
suffix. It uses at most the last two seconds of aligned, non-overlapping feedback
brackets and requires at least one second, ten reads, qualified trace coverage
and encoder-grid-consistent cached positions. A changing last goal, short capture,
missing feedback or partial trace cannot become qualified terminal evidence.
Trace coverage can pass while terminal-hold analysis remains unavailable.

Each joint retains signed goal-minus-feedback statistics, observed position span
and the median position shift between the two halves of the window. A constant
command with moving feedback remains visibly moving in those statistics. Body
reference and cached position statistics are separate; body-write execution is
not recorded by this six-head observer. Terminal qualification is attribution of
saved samples, not a new settling, safety, arrival or calibration rule.

Reanalysis of the twelve October 18 A/B/A traces found identical complete neutral
poses, body references and six encoded head goals for the upward and downward
returns within every condition. Their final two-second windows had at most one
count of per-joint position variation. Upward returns retained as much as
81 counts of error; downward returns were within three counts. This separates
persistent endpoint error from moving-ramp lag. The exact model replay and power/
actuator hypotheses are recorded in
[head response](HEAD_RESPONSE.md#offline-upward-following-and-wake-audit-october-18).
