# Reversible servo-profile experiment

Prepared October 17, 2026; updated October 18 after isolated ARM qualification and
an attended partial A/B/A. The head-only continuation candidate is installed.
A1 completed all four legs and B completed down/return before a motor-communication
error closed the backend. The operator reported similar jitter with the candidate
profiles; A2 is untested. Original profiles and the guarded disabled service are
restored, with visually confirmed Sleep. No profile benefit is established and
mode correction stays separate. See the
[latest physical result](#head-only-physical-comparison-and-backend-loss).

The subsequent [feedback-error recovery candidate](#feedback-error-owner-retention-offline)
passed offline and [isolated native-worker/ARM checks](#feedback-error-recovery-native-worker-and-armpty-qualification)
and is uninstalled. It retains diagnostic/restoration access after a classified
cache fault, with output inhibited until explicit recovery.

## Question and conditions

The [vertical traces](JOINT_TRACE.md#attended-152-second-vertical-traces) show many
unchanged or staggered integer goal changes during slow motion despite grouped
head writes. Two-second motion looked much better. Direction-dependent static
following error remains at both speeds, so smoother motion is not arrival proof.

The proposed experiment asks whether servo-side profiling reduces visible slow
interior stepping without unacceptable lag, wobble or endpoint error. It does
not change packet cadence, conversion, P/I/D, current/PWM limits, protections,
operating mode or drive mode. It is not a test of the retained mode correction.

Use a new A/B/A comparison with the same daemon-local four-leg plan in every
condition: down 24 mm, neutral, up 10 mm, neutral; 15 seconds per movement and
ten seconds of observation. Rate upward/downward motion separately. A1 uses exact
original profiles, B uses the reviewed candidate, A2 verifies the restored
baseline. Twelve synthetic legs passed plan construction. These are no physical
results; the earlier hardware run is historical context, not A1 of this experiment.

Every condition uses the same explicit, recorded measured-hold setup. Do not
silently redefine neutral or claim matched starting poses if measured starts
differ. Record their residuals and review the complete actual path. Interior
20–80% smoothness, start/stop behavior and static arrival are separate scores.

## Proposed fields and values

Only the six Stewart motors' RAM addresses 108–115 may change: four bytes of
Profile Acceleration followed by four bytes of Profile Velocity, little endian.
The eight-byte range ends before Goal Position at 116. Body and antenna profile
registers are excluded. All other bytes retain their original policy.

The observed unchanged drive mode selects velocity-based profiling; position
mode remains 3. The manufacturer's units are 0.229 rpm per velocity unit and
214.577 rev/min² per acceleration unit. These fields are not millisecond durations
under this drive mode. See the [ROBOTIS control table and profile semantics](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#profile-acceleration108).

The **experimental candidate** is velocity 13 and acceleration 42 on each head motor:
17.862°/s and approximately 901.2°/s², with characteristic acceleration time
about 19.8 ms. This is a concrete proposal, not an established tuning value.
Velocity exceeds twice the largest central slow-reference slope in the saved
qualified captures; the approximately one-backend-period acceleration time is a
hypothesis to test. Fresh velocity limits, identity, firmware and neighboring
configuration must admit these values before hardware use. Historical zero
profiles are not a substitute for fresh readback.

Profiles operate independently inside each servo. They do not add encoder
resolution or guarantee synchronized physical arrivals. Profile-induced joint
lags can change the Cartesian path; checking only the original goal curve's IK
is insufficient. The offline transaction oracle is not a firmware trajectory
emulator or a collision/clearance certificate.

## Wake, handoff and restoration

1. Verify current identity/version, exact software, sole owner, disabled state,
   absence of pending transactions and current attended authorization.
2. Wake using original profiles. Obtain visual raised/settled confirmation.
3. On the same controller, explicitly Stop/drain/hold as reviewed. Pause the
   ordinary target producer and fence its queue; verify fresh stable goals and
   unchanged configuration before profile maintenance. This setup must be the
   same in A1, B and A2. Configuration changes while holding can still cause
   physical response; they require authorization and observation.
4. Read twice, persist and verify the exact original profile bytes and protected
   configuration. Persist an unresolved marker before any possible write.
   Apply only the preselected eight-byte fields, once; independently read back
   every motor and the complete batch before granting a new motion generation.
5. Hand back to the existing guarded movement owner only with fresh identity,
   observer, actual-path and current-epoch qualification. Keep all freshness,
   ownership, scope, output and recovery guards. Record profiles around the
   condition to detect resets or competing writes.
6. After the condition, Stop/drain/hold and reclaim the maintenance fence.
   Export the sealed trace outside movement. Restore exact original profiles
   before Sleep, verify original bytes and protected state, durably record
   closure, then retire the unresolved marker.
7. Sleep with original profiles, verify disabled motors and obtain visual
   confirmation. Repeat the same original-profile Wake/Sleep policy for A2.

Applying profiles before Wake would contaminate its trajectory and starting
condition. Leaving the candidate active for Sleep would also confound the
familiar centering animation. No automatic restart, Wake, motion replay or
unattended fallback is part of this experiment.

## Failure and backup policy

An acknowledgement, enqueue and readback are distinct evidence. A lost reply
never permits reapplying the candidate. Withhold further comparison targets,
retain the unresolved marker and owner inhibition, and reconcile by fresh reads.
Explicit restoration writes only missing original profile bytes. If a prior
restoration succeeded despite a lost reply, fresh original readback closes it
without another write. Unknown byte patterns, identity/configuration drift,
lost ownership or failed reads retain inhibition and require review.

Reuse verified software rollback archives. The experiment needs only its exact
profile preimages, configuration fingerprints and small transaction receipts.
Content-addressed identical register backups are reused across trials; do not
create another full robot archive. Restart is not rollback. The offline native
candidate now rejects a pending profile transaction before serial-port opening
or initialization. A pending marker must not be removed to bypass that guard.
The subsequent candidate adds an explicit restoration custodian, described below.
At the isolated ARM checkpoint it was not deployed; the later disabled-only device
qualification below is the evidence for the current private installation.

## Offline evidence and remaining admission work

The private transaction oracle accepts generated memory images only and rejects
a physical adapter unconditionally. Its 16 fault tests passed, covering exact eight-byte
boundaries, application/restoration, partial batches, missing acknowledgements,
corrupt backups, neighboring-byte/goal/owner drift, failed reads, pending-marker
inhibition, and backup reuse. It preserves all other fixture bytes. Its motion
handoff is a state-machine fixture, not a working hardware maintenance entry.

The installed native raw-write API reports queue admission. It is insufficient
for this transaction. Do not use it, a second serial owner, raw HTTP commands or
a helper that creates a new hardware controller as a maintenance workaround.

### Guarded native entry: offline qualification

A separate native candidate now implements `profile_entry` and `profile_status`
on the existing Python control-loop instance. Its operations are `prepare`,
`apply`, `restore` and `close-no-write`, using the same serial worker. There is no
new HTTP route, startup task or generic register-writing permission. The explicit
no-reboot constructor policy is prepared for isolated qualification; it does not
change the normal constructor's default policy.

This first entry is **disabled-only**. It checks all nine motors' identity,
firmware, torque, stationary state and bounded health, and independently compares
two fresh preparation snapshots. The later device-qualified version requires
at least 200 ms between them, Moving=0 and raw signed velocity magnitude at most
one, with exact encoder/configuration stability. Body and antenna profiles are preserved. The
six head profiles must match the reviewed zero baseline, and candidate velocity
must fit fresh head velocity limits. The existing reviewed input-voltage alert
exception requires explicit selection; other faults fail admission. Mode, gains,
goals, limits and protected neighboring configuration remain unchanged.

Before queue admission it persists an unresolved marker and fences ordinary
commands, including previously queued commands. Preparation saves and verifies a
SHA-256-addressed exact preimage. Identical preimages are reused. Application
writes each head's fixed eight bytes once, requires a valid worker ACK, then
independent per-motor and final batch readback. Completion is distinct from queue
admission. Expired, cancelled, duplicate and wrong-owner requests cannot write.

Unknown acknowledgement or partial failure retains inhibition. Explicit restore
reads the current bytes and writes only candidate fields that still differ from
the verified original. If restoration already took effect, it does not repeat
that write. Fresh verification also reconciles terminal receipt/unlink/sync
failures. `close-no-write` is available only when no candidate write was possible
and fresh stable original state is verified. A stale session cannot affect a new
transaction. Filesystem receipts are process-crash protection; Windows power-loss
durability is not claimed. Protocol replies have no nonce and snapshots are not
atomic; bounded reads and readback do not eliminate those protocol limitations.

The candidate passed **86 native tests**, including the actual Tokio worker,
compiled Python entry and GIL release, all six partial-batch boundaries, unknown
apply/restore acknowledgements, missing effects despite ACK, configuration drift,
queue fencing, journal failures, backup reuse and unchanged excluded fields.
The recorder fix is retained unchanged. The Windows CPython 3.12 wheel builds,
imports and verifies its package records. These are memory-bus and host-runtime
results, not servo-firmware behavior or physical validation.

The pinned ARM release build and runtime qualification **passed** with the retained
dependency/toolchain, an isolated wheel overlay and a newly generated PTY. Three
trials exercised unchanged closure, changed profile/restoration and lost-ACK
reconciliation on one owner: 18 virtual profile writes, exact original restoration,
one reused preimage and constructor inhibition by a pending marker. The fixture
rejected torque, goal, gain, mode and reboot packets. An additional recorder fixture
on the same ARM binary checked 80 virtual grouped goals, 20 complete traced frames,
zero lost events, overflow and expiry; profile entry was rejected during an active
observer. Both syscall audits and the downloaded trace receipts verified zero
physical device opens and zero INET connections. The production owner and all 503
installed files remained unchanged. Verified generated staging was removed after
evidence download. Neither fixture emulates real servo profile dynamics or proves
Cartesian clearance, endpoint accuracy or smoothness.

The new daemon transport and pending-state custodian now pass their isolated ARM
qualification below. Device recorder overhead and a disabled-only profile
roundtrip with exact restoration subsequently passed as recorded at the end
of this document. The guarded handoff to motion while profiles
are changed is **not implemented**: this entry continues to inhibit ordinary
commands until restoration. Implement and qualify that handoff and verify physical
recovery before reviewing fresh actual paths, profile-induced deviations and the
attended A/B/A run. Do not apply the disabled-only entry while awake.
The two-second condition remains a later speed anchor, not another simultaneous
variable. A gain or operating-mode experiment requires a separate comparison.

## Daemon integration and cross-process recovery

A subsequent candidate integrates the entry with the daemon's
existing `RobotBackend.c`. It adds no browser or HTTP API. An explicit private
configuration enables a Unix socket with a private directory, same-UID peer
credentials, a separate token, bounded strict JSON frames and a fresh process
epoch. It pins current machine/hardware identity, daemon version, canonical
serial path and the native image's hash and loaded inode. Default startup behavior
is unchanged when this configuration is absent. Opt-in maintenance startup rejects
startup Wake, simulation and configured gain writes, and selects the no-reboot
native policy before constructing the owner.

The daemon checks disabled state, app/movement ownership and observer inactivity
before entry. Its ordinary setters and publisher are fenced around native
maintenance. Admission epochs propagate through asynchronous work and callbacks;
requests created before maintenance cannot resume afterward. Busy ordinary requests
fail without queuing. Successful closure retires old target intent before restoring
ordinary admission; it sends no Stop, centering, Wake or other motor command.
Status does not consume candidate admission capacity, and exhausted candidate
history cannot block explicit restoration. Unknown outcomes retain inhibition.

The new native **v2 journal** persists session, candidate, machine/serial binding
and exact health policy before queue admission. Original register preimages retain
their content-addressed format and are reused. The owner holds an OS file lease
for its lifetime; cooperating normal/recovery constructors acquire it before serial
opening. Private state and serial exclusivity remain prerequisites. This is not a
fence against an uncooperative privileged process changing files or the serial bus.

After the old owner process exits, an explicitly authorized, attended custodian can
claim the lease and reconstruct the exact pending transaction. It checks the session,
binding, write intent and backup digest before opening the port. Constructor and
worker initialization send no writes. Fresh disabled/stationary identity/configuration
snapshots precede any restoration. Only head profile fields that still differ from
their original bytes are restored, with the same ACK and independent readback rules.
No candidate application is available, and ordinary native commands remain inhibited
even after closure until the custodian exits. It never starts, stops or restarts the
daemon. Restarting normal service is a separate action after verified closure.

A valid preparing journal without a possible write can use explicit fresh no-write
closure. Unknown byte patterns, stale identities, missing/corrupt required backups,
incomplete journal data and legacy v1 pending markers remain blocked for review;
there is no automatic marker deletion, migration or candidate replay. Goal and
protected-position drift still fail comparison. Cross-process recovery does not
relax those guards or prove physical arrival.

The final offline suite passed **92 native tests**, including compiled manager/worker
integration, process exit without destructor cleanup, OS-lease exclusion and fresh
cross-process restoration. **20 Linux service/custodian tests** cover peer credentials,
private framing, stale work, loaded-image replacement, explicit authorization and
cleanup after uncertain restoration. Ten existing daemon tests, all 513 project tests
and both production builds passed. Private wheel records and Windows imports verify;
the new ARM release cross-build also passed. Native packet conversion and recorder
sources are unchanged from the preceding candidate. The OS lease API requires Rust
1.89 or newer; the retained build toolchain satisfies that requirement.

These offline results are generated-register, host-process and Linux IPC evidence.
The subsequent ARM qualification follows; the candidate was uninstalled at that checkpoint.
Changed-profile motion handoff remains unimplemented.

## ARM daemon and recovery qualification

The pinned ARM release wheel and daemon wheel passed runtime qualification on
October 17 using a new isolated overlay and a parent-generated PTY. The actual
`Daemon.start` startup hooks, `RobotBackend` constructor and guards, authenticated
Unix service, compiled worker and default recovery factory executed. Media and
kinematics base initialization, normal backend/publisher threads, WebSocket
listening and hardware identity used inert fixtures. No physical daemon instance
was started, replaced or restarted.

Three transactions passed with all original fixture bytes and disabled torque
verified after each. A same-owner changed/restored transaction made twelve virtual
profile writes and retired old target intent and a delayed coroutine without motor
commands. A second producer lost the third apply acknowledgement, rejected replay
and exited without destructor cleanup. Once its PID was absent, a new custodian
reconstructed the persisted transaction through the default native factory and
restored only those three changed fields: six writes including the partial apply.
A third producer exited after preparation; its custodian performed fresh no-write
closure with zero profile writes. Recovery results retained `recoveryOnly` after
closure. Each transaction had one content-addressed preimage; existing software
rollback archives were verified and reused without another full robot backup.

Fourteen negative child processes rejected live owners, ordinary startup with
pending state, corrupt machine/serial binding or corrupt required preimages.
Independent process-scoped syscall review verified that each rejected child made
zero serial opens. Whole-tree review found zero physical device opens and zero
INET connections. The peer rejected every mutation except the six head motors'
fixed profile fields; no goal, torque, gain, mode or reboot packet was permitted.
The final fixture's thirty warmup reads had a maximum roundtrip of 1.44 ms against
the native constructor's existing 10 ms read timeout. This is fixture timing,
not a physical bus performance measurement.

Two earlier fixture attempts are retained separately: one failed on synthetic
package resource metadata before serial construction, and one reported missing
virtual IDs during startup. Correct package metadata, raw-mode PTY preparation,
peer scheduling and latency checks allowed the unchanged candidate to complete.
Those attempts do not establish a new physical startup defect or remedy.

Read-only checks before and after verified all 503 installed files and the same
sole physical serial owner. Final daemon status reported disabled motors; no new
visual observation is claimed. Evidence was downloaded and independently checked
before the exact owned overlays and staging files were removed. No Wake, Sleep,
Stop, physical motion, installation, service action or mode correction occurred.
This qualifies ARM code paths against virtual registers. Disabled-only physical
restoration, recorder overhead and the still-unimplemented changed-profile motion
handoff remain prerequisites for the attended A/B/A movement experiment.

Raw traces, prototype sources, generated fixtures, private identities and hardware
receipts remain under ignored `local/`. The preceding qualification did not
deploy the candidate; the subsequent physical installation follows.

## Disabled-only physical qualification

The October 17 attended device pass installed the private daemon integration,
recorder fix and native entry, reusing verified rollback wheels. Four integration
problems were resolved before the successful changed-profile trial:

- The unchanged CLI supplies a gain-configuration file even when its flag is
  omitted. Maintenance correctly refused that startup before serial construction.
  A temporary runtime adapter calls the actual daemon entry with no gain file,
  startup Wake disabled and shutdown Sleep disabled. The persistent launcher and
  robot configuration were preserved.
- Stationary, torque-disabled motors reported Moving=0, unchanged goal/present/
  trajectory positions, zero PWM/current and raw velocity 0 or 1. The former
  exact-zero check withheld preparation. The revised check allows magnitude at
  most one while requiring exact stable encoders and protected configuration
  across independent snapshots at least 200 ms apart. Moving=1, larger velocity,
  encoder drift, cancellation and deadlines still reject admission. This is a
  bounded admission rule, not a physical stationarity certificate.
- A recovery attempt hung while Python close held the GIL and joined the worker.
  Deterministic host and ARM tests reproduced a worker needing the GIL during
  close. Releasing the GIL around the join fixed that regression. The exact
  timed-out helper process group was retired before another serial owner was
  allowed; pending state remained intact. The runner now contains timed-out
  helper descendants without replaying their operation.
- Fresh nine-motor reads showed model 1200 for body/head and 1190 for antennas,
  all firmware 53. The earlier fixture incorrectly assumed nine model-1200
  motors. Admission now checks the exact per-ID mapping. A wrong head or antenna
  model still rejects the transaction; antenna fields remain excluded from writes.

The final native suite passed 98 tests. Focused isolated ARM execution covered
the mixed-model fixture, signed one-unit velocity noise, changed/restored profiles,
wrong-model rejection and the GIL close regression before that binary was
installed. These fixture results are separate from the physical evidence below.

The real preparing transaction first closed through the cross-process custodian
using **reads only**. The custodian exited, released serial ownership and left no
pending marker before an explicit normal-service start. An unchanged same-owner
transaction then prepared and closed without writes. The changed transaction
applied acceleration 42 / velocity 13 to six head motors and restored their exact
original zero profiles. Both transactions reused one content-addressed preimage.

Independent serial decoding found exactly twelve acknowledged eight-byte writes
at address 108: six candidate values followed by six original values. All complete
packets passed CRC validation. The live trace ended during a later routine position
read; those unobserved trailing replies were excluded. Full earlier post-restore
snapshots verified all nine original profiles, disabled torque and stable goal/
present/trajectory positions. No goal, torque, gain, mode or reboot write appeared
in the roundtrip capture. The existing explicitly reviewed input-voltage alert
exception remained selected; voltage limits and protections were unchanged.

Final checks verified all 505 installed package files, the loaded native image,
one serial owner, no pending transaction and disabled motors. The candidate remains
installed. No Wake, Sleep or movement command was sent. The operator confirmed
that Reachy remained asleep and settled through the service transitions and
profile tests, with no movement.
Downloaded evidence hashes were checked before removing approximately 77 MB of
unneeded remote wheels and traces; live adapter/configuration, journal and existing
rollback artifacts were preserved. No new full robot backup was created.

This qualifies disabled register restoration and no-write recovery on this device.
It does **not** qualify recovery after a physical partial apply, changed-profile
motion, improved smoothness, endpoint accuracy or clearance. The next implementation
gate remains an explicit same-owner awake hold/handoff and return to maintenance,
with original profiles restored before Sleep. The entry must continue rejecting
awake use until that path is implemented and qualified. Mode correction stays
separate, and no public browser command or automatic recovery was added.

## Awake handoff: offline contract

A subsequent private source candidate implements the missing awake hold/handoff.
It is **not installed**. The earlier disabled-only physical result does not qualify
this new code, and this offline pass sent no robot request, Wake or movement.
The existing backup wheels are reused; mode correction remains separate.

The explicit sequence is `prepare-awake`, optional `apply`, `handoff`, private
vertical legs, `pause-output`, observer seal/export/clear, `reclaim`, then `restore`.
Preparation requires all nine motors already in torque-enabled position hold,
fresh stable readback and the same exact identity, gains, limits and health policy.
It never enables torque, changes modes, creates a measured-hold target or performs
Wake. The caller must establish and review that hold first. Disabled `prepare`
retains its previous policy and cannot grant a motion lease.

Awake sessions use a distinct `reachy-profile-awake-v3` pending marker and a
durable motion-authorization sidecar. The immutable original profile preimage
remains content addressed. A handoff requires a fully acknowledged preparation
or application, another stationary read pair and the complete selected profile
batch. It returns a private capability bound to the same daemon owner/session;
ordinary commands remain inhibited and pending state remains present. There is
only one grant per transaction. Unknown application/handoff outcomes cannot be
replayed or upgraded into motion by a status read.

Only six-head grouped goal commands carrying the current native session and
generation may execute. Ordinary goal, body, antenna, torque, raw-write, gain and
mode commands remain blocked. Existing cached-position feedback continues, along
with the bounded diagnostic reads and exact health reads needed by the normal
publisher. Targets expire after 100 ms in the queue; expiry, queue/write failure,
owner close or explicit reclaim revokes the lease and fences queued targets.
There is no automatic Sleep or restart on a pause or fault.
The existing typed Stop remains available without a motion capability or new
arming: it revokes output, marks the local job interrupted and retains recovery
inhibition. Its acknowledgement does not establish physical stationarity.

The private daemon binding uses the retained Pollen `goto_target` / `play_move`
implementation and its existing head publisher. It requires current ownership,
inactive tracking/speech/gravity compensation, position mode, and cache completion
age below the unchanged 500 ms limit. Age is computed within the native clock
domain; a Python/Rust clock-resolution difference must not create a false future
sample. During handoff, output waits for the first resumed fresh native sample;
the bound is not extended to admit a stale target.

Each private vertical-leg request needs the capability and explicit actual-path
clearance. It preserves the supplied, matched starting matrix rather than rebasing
it; combined starting errors must be within 1 mm and 1°. Its destination keeps
orientation and horizontal position fixed, with vertical offset in −24 to +10 mm.
Only the prepared 15-second reference or two-second anchor duration is admitted.
One local job runs at a time. Job completion reports generator completion, **not
physical arrival**. Existing measured arrival and actual-path review remain
independent responsibilities of the attended experiment owner.

The retained Pollen generator emits body and antenna values even when its inputs
are omitted. The capability allows those setter calls only when their values
exactly match the held values, then suppresses them. The publisher also suppresses
body/antenna writes. It never substitutes an ordinary setter if a scoped enqueue
fails. A separate `pause-output` withholds repeated hold targets after a local job;
the observer's worker barrier must still drain preceding targets before export.
Feedback continues during this pause. A pause alone is not a drain receipt.

Reclaim invalidates native output **before** queue admission or readback. Delayed
coroutines cannot resume after the owner epoch changes. Fresh stationary readback
then returns to maintenance. Restoration preserves the original configuration and
exact profiles at the new held head pose; it does not require the head to return
to its pre-trial encoder position. Body/antenna goals and positions remain fixed,
and all excluded configuration stays protected. Only a durably authorized motion
session permits these head goal/encoder differences. A recovery custodian can
restore such a session after the old owner exits, but cannot grant motion or start
normal service. Corrupt or incomplete policy retains inhibition.

Offline tests exercise the compiled worker, native Python entry, retained Pollen
trajectory code, private manager, grouped packets, trace export, queue fencing and
exact restoration against generated registers. Their IK/FK and servo response are
synthetic: they cannot establish physical coordination, clearance, following error
or profile-induced lag. ARM runtime qualification must cover the new methods,
awake journal/recovery and actual startup binding before installing this candidate.
An attended original/candidate/restored vertical comparison remains the next
physical experiment, using original profiles for every Wake and Sleep.


## Awake handoff: ARM runtime qualification

The later amended candidate passed aarch64 / CPython 3.12 execution with generated
PTYs. It was uninstalled at that checkpoint. Twelve two-second A1/B/A2 vertical legs and a separate
15-second leg completed; all twelve final raw captures passed the unchanged public
trace analyzer. Native tests total 114, and all 16 focused awake daemon tests pass.
Eight ARM boundary cases include actual daemon startup/RobotBackend construction,
power/model/configuration rejection, queued expiry, stale feedback and tracking loss.

Qualification found and fixed an awake recovery startup conflict. Ordinary
no-reboot maintenance now requires all nine torque states disabled, while a
restore-only custodian with a validated awake journal requires all nine enabled.
It reads these states; it never enables torque or grants recovery motion. Mixed
torque is rejected. Existing pre-open journal/binding/preimage checks and the OS
owner lease remain required. A separate producer-exit test restored profiles at
the changed virtual head pose, with excluded motors and configuration fixed.
Lost-ACK partial application was reconciled without replaying the candidate.

The analyzer also exposed frame IDs consumed while output was paused. The owner
now checks pause before the publisher allocates observer frames, under its existing
lock. Native sealing remains a separate queue barrier. The proxy stays defensive;
the analyzer's coverage checks were not loosened. The exact final Python wheel
was rerun with the amended ARM native image.

Typed Stop interrupted the virtual job without a capability or arming field,
revoked output and retained pending recovery. Generator failure, an expired queued
target and stale cache also withheld further targets. A deterministic logger
callback stall exercised real worker expiry/freshness; a slow PTY reply alone was
not sufficient because normal reads time out. The nominal fixture uses the real
backend's five read retries; scoped head writes remain single-attempt and the
500 ms cache and 100 ms queued-target limits are unchanged.

Full-tree syscall auditing found zero physical device opens and zero fixture INET
connections. Independent packet decoding matched the virtual peer and found only
reads, reviewed head profile fields and six-head grouped goals. The real service,
sole physical serial owner, 505 installed files, private configuration and real
profile journal remained unchanged, with disabled status. No physical Wake, Sleep,
Stop, motion, installation or restart was sent. Hash-verified evidence was downloaded
before exact owned cleanup; existing backups were reused without a new full copy.

Identity, media, IK/FK and instantaneous servo response are fixture surfaces.
The startup test keeps normal run/publisher threads and WebSocket inert; the
trajectory test uses retained Pollen goto/play_move and the actual publisher branch.
These results do not establish physical smoothness, profile lag, clearance or
arrival. Next is a separately authorized attended installation/disabled overhead
check and vertical original/candidate/restored comparison, with original profiles
for Wake and Sleep. Mode correction remains separate.

## Awake handoff: installation and admission fixes

The amended native/daemon candidate was subsequently installed with an attended
operator. Disabled recorder checks retained complete feedback-only captures and
fresh cache samples, with a recording cost around nine percentage points of one
CPU core. These results do not qualify moving-load overhead or smoothness.

Real integration exposed two gaps beyond the generated-PTY qualification:

- Ordinary calls could collide with the routine publisher's maintenance lock.
  Admission now waits at most 100 ms while retaining the epoch captured before
  waiting. Inhibition and any intervening maintenance transition still reject the
  request. Twenty-one focused Windows/ARM tests passed, including actual Pollen
  Wake/Sleep with synthetic pose response. A later real Wake completed with visual
  confirmation that the head was raised and settled.
- The real measured FK rotation had an orthonormality defect around 0.00052,
  whereas requested poses require less than 0.000001. Measurement conversion now
  accepts only a defect bounded by 0.001 and projects the rotation onto SO(3) using
  SVD, preserving translation exactly. Requested targets remain strictly rigid,
  and matched starts must remain within 1 mm and 1°. Twenty-seven focused tests
  passed on Windows/ARM, including larger defects, reflections, non-rigid requests
  and out-of-tolerance starts. The Python-only fix is installed; its physical
  awake handoff is still pending.

The first handoff was withheld before any vertical comparison target. Its
unchanged-profile session closed without a profile write, followed by an
acknowledged factory Sleep. A separate disabled no-write closure encountered
one-count encoder variation on one servo. Packet decoding showed only reads,
all nine torques off, and unchanged profiles/goals/configuration. Bounded fresh
verification passed the original exact comparison without changing its policy.

A final ten-second disabled cache sample had no non-advancing reads and an 18.8 ms
maximum observed completion age, at about 51% of one CPU core. These finite samples
are not real-time guarantees. No candidate profile or vertical comparison target
has yet been applied in this pass. Existing rollback artifacts are reused; only
small exact package-record/configuration metadata receipts were added. Mode and
gain correction remain separate, with original profiles required for Wake/Sleep.

## Awake hold: encoder variation and offline candidate

The next attended continuation completed Wake with visual confirmation and froze
its measured neutral. Preparation first rejected stationarity, then differing
independent snapshots. A later fresh preparation passed, but native handoff failed
before any movement job or motion grant. The existing revoke path overwrote the
native error state, so its exact rejection reason was not retained. Do not treat
the handoff cause as conclusively diagnosed by a later closure capture.

No candidate profile was applied. A bounded no-write closure capture retained
16 complete nine-motor snapshots across eight checks. Two head encoders varied by
one count; all goal/profile/configuration bytes matched the immutable preimage.
Moving flags were zero and absolute raw velocity was at most one. Only read bus
instructions were captured. Exact closure eventually passed, after which normal
factory Sleep completed. Fresh disabled/original-profile/no-pending readback and
the operator's asleep/settled confirmation finished the attempt.

The new native proposal changes **encoder equality**, not the profile values or
commanded motion range:

- Only the six head present-position readings may differ by one signed count.
  Both fresh snapshots must satisfy the bound, and unchanged transactions retain
  the immutable saved anchor; repeated comparisons cannot ratchet it away.
- Goals, all configuration, profile comparisons, body positions and antenna
  positions remain exact. A one-count goal change is rejected.
- The 200 ms independent-read dwell, clear Moving flag, absolute raw velocity
  limit of one, deadlines, health/identity checks and existing ownership/epoch/
  unknown-write/recovery fences remain enforced. No automatic retry or motion is
  introduced by this native change.

All 124 native offline tests passed. Tests cover one-count head variation through
preparation/closure and awake handoff/restoration, two-count rejection, signed
wraparound, every protected configuration/goal byte, body/antenna exclusion,
no accumulated drift, and unchanged larger-velocity/Moving rejection. Compiled
manager/worker integration also passed with generated registers and synthetic
pose feedback. The initial fixture-path failures are retained separately from
the successful run.

The revision subsequently passed **21 focused ARM/PTy cases**: adjacent head
encoder codes during disabled/awake preparation, handoff and restoration; two-count
and body/antenna rejection; unchanged goal/anchor and velocity/Moving gates; and
lost-ACK restoration with candidate replay rejected. Virtual profile writes were
restricted to the reviewed six-head fields. No goal, torque, mode or gain write
was admitted by the fixture. Syscall auditing found no physical-device or INET
access; the production owner, files, journal and configuration remained unchanged.

It was then installed in an attended disabled service transition, replacing only
the native image and its package record and updating the private image pin.
Original profiles, gains and modes were verified; existing rollback artifacts
were reused. A fresh original-profile Wake completed in software; visual admission
and the A/B/A movements remain pending. The captured closure window does not
establish the cause of earlier untraced velocity failures, and one encoder count
is not a Cartesian stationarity or arrival certificate. The failed physical
attempt supplies no profile smoothness score.

## First physical leg and restoration-only recovery

The next attended continuation visually confirmed Wake, passed matched setup and
the native handoff, and completed the original-profile 24 mm downward leg with
a 15-second ramp and ten-second hold. Endpoint error was 0.28 mm in translation
and 0.87° in orientation. The operator reported visible interior jitter, with no
contact or strain. All 1215 recorded target frames had complete reference,
enqueue and execution phases; 1276 feedback reads were retained. The public
analyzer reported no coverage exclusions. Median native group-write duration
was 0.071 ms, maximum enqueue-to-execution time 3.72 ms, and maximum write interval
26.6 ms. Feedback is sequential cached readback, not simultaneous servo sampling.
These measurements do not prove the cause of the visible jitter.

The return request was accepted, then failed immediately inside the owned
trajectory. No retry was sent. The job failure discarded its exception detail,
and readiness-dependent HTTP routes prevented exporting the active observer or
sealing it for in-process restoration. The incomplete return supplies no endpoint
or smoothness score. **No candidate profile was applied; A/B/A is unfinished.**

After stopping the old service without Sleep or torque changes, read-only
custodian captures showed the body encoder one count below its immutable
preimage. Its goal and all protected configuration/profile fields were unchanged;
all nine torques remained enabled, Moving flags were clear and absolute raw
velocities were at most one. Head goals/positions reflected the authorized
downward leg. Antenna goals/positions were unchanged. Eight fresh original-only
closure checks retained the same excluded-motor rejection.

The installed correction is restricted to **restoration after journaled head-only
motion**. Excluded body/antenna encoder readings may differ by at most one signed
count from the immutable preimage. Their goals and configuration remain exact.
Fresh independent stationary snapshots, velocity/Moving/health checks, deadlines,
original-profile readback and ownership/epoch/recovery fencing remain enforced.
Preparation, candidate application, motion handoff and reclaim retain their
previous excluded-motor policy. No motion grant or automatic retry is added.

All 127 native offline tests passed. Three fresh ARM/PTy custodians verified
one-count original-only restoration, two-count rejection and exact body-goal
rejection, with no virtual goal/torque/mode/gain/profile writes. Production files,
journal and configuration remained unchanged during those fixtures. Earlier
multi-operation instrumented runs hit deadlines and are retained separately;
a later boundary-fixture assertion was corrected. The successful focused pass
used syscall filtering to reduce tracing overhead and did not extend deadlines.
It qualifies the recovery path, not the complete changed-profile experiment.

The native-only image and package record were then installed while the physical
owner was absent, and the existing original-only custodian successfully cleared
the transaction. Original startup was temporarily used to regain ordinary Sleep
admission, with startup Wake disabled and the original gain initializer pinned
to the immutable preimage. The service retained enabled torque; an initial
disabled-start expectation was therefore rejected without another startup or
Wake. A single factory Sleep subsequently completed and was visually confirmed.

The temporary cleanup override was removed. Final no-reboot maintenance startup
verified disabled torque, original profiles/gains/modes, the sole serial owner,
505 installed files, the loaded image and no pending transaction. Final
diagnostic reads respect their shared cooldown; immediate consecutive metadata
and loop reads had produced expected unavailable responses. Thirty spaced cache
reads advanced, with maximum sampled completion age 19.3 ms. Existing rollback
artifacts were reused, with only small record/configuration preimages added.
Mode correction remains separate; nothing was published.

The next continuation must preserve omissions through the entire trajectory path: Pollen's GotoMove
materializes omitted body/antenna targets from fresh measured starting values.
An offline reproduction using retained goto/play_move fails when the body reading
differs from the lease by one count. A head-only adapter should return only head
samples to play_move, leaving excluded targets untouched. Also add authenticated,
same-owner observer sealing under inhibition, and retain bounded failure codes
before lease revocation. These continuation fixes are not installed or qualified
by the recovery result above. The physical return's exact cause remains unproven.
The following offline checkpoint implements those fixes.

## Head-only continuation and inhibited export: offline

The new private Python candidate changes the experiment's trajectory adapter,
observer route provider and state-router wiring. It changes no native runtime,
servo profile default, gain, mode, controller bound or ordinary power path.
Existing rollback sources and the installed native image are reused; it is
uninstalled and has sent no robot requests.

The head-only adapter subclasses the retained Pollen `GotoMove`, using its
minimum-jerk head interpolation and requested duration. Its samples return
`(head, None, None)` to the unchanged `play_move`. Newly measured body/antenna
encoder values therefore cannot become new omitted-field targets. The lease's
body reference and excluded-setter checks remain unchanged. Target validation,
the frozen vertical envelope, matched measured start, freshness, ownership,
command epochs and unknown-completion fencing still apply.

Observer stop/snapshot/clear can now resolve the current live backend/native
owner after a fault clears readiness. Loopback/token authentication, forwarding
rejection, capture identity, draining and native sealing remain mandatory. Start
retains its readiness gate and is denied after inhibition. Export neither clears
the motion fault nor grants output. The first fault is retained as a bounded
code and exception type, including native enqueue uncertainty, freshness failure,
excluded-target mismatch, Stop, timeout or retired lease. Arbitrary exception
text is never returned through status.

Offline validation passed:

- 50 distinct Python cases: 13 new continuation/recovery cases, 16 retained awake
  cases, ten trace cases and eleven power/admission cases. The retained awake
  cases also ran inside the power fixture, yielding 66 successful executions.
- Exact head-curve equality with the retained Pollen implementation at 101
  samples for each of three endpoints. Injected one-count body/antenna noise
  reached no excluded setter; direct excluded-target changes still failed.
- An actual compiled native worker completed all twelve simulated A1/B/A2
  two-second legs, then revoked motion on an injected ownership fault. The same
  owner sealed/exported the failed job under inhibition, followed by explicit
  original-profile restoration. Body/antenna goals remained unchanged. Generated
  registers and synthetic IK/FK do not model mechanics or physical arrival.
- All twelve completed captures passed the public analyzer: 781 complete frames
  and 1224 feedback events. The interrupted-job capture was exported and retained
  separately, excluded from completed-comparison evidence.
- 45 targeted JavaScript trace-analysis and manual-controller regression tests.
  Wheel checks verified 494 baseline members against the saved installed
  inventory, retained every other member, and validated both wheel records and
  the reused ARM native image.

Initial harness/dependency-path and fault-fixture failures are retained separately
from the passing result. No production deadline or admission rule was relaxed to
make a fixture pass. This qualifies local continuation behavior, not the pending
full multi-operation ARM experiment or a physical servo-profile benefit.

Before a device retry, qualify this exact wheel in an isolated ARM/PTy owner,
including repeated legs and fault/export/original restoration. Resolve the
previous multi-operation timing failures without changing production deadlines.
Then perform an attended no-startup-Wake installation using existing rollback
artifacts, verify original profiles and owner/pending state, and run the frozen
A/B/A protocol with original profiles for Wake/Sleep. Keep failed requests as
failed evidence; never replay the earlier return. After inhibition, save status
and seal/export the existing trace before explicit recovery. Mode correction
remains separate.

## Head-only continuation: isolated ARM/PTy qualification

The exact Python wheel above and the reused installed ARM native image passed
one isolated runtime sequence under Python 3.12 on aarch64. The physical daemon
remained running and disabled. A separate generated PTY, journal, owner and
private socket were used; no production controller was constructed by the fixture.

The actual native worker and private maintenance service completed all twelve
two-second A1/B/A2 legs, followed by an original-profile 15-second downward leg
and 15-second return. The candidate adapter preserved the exact retained Pollen
head curve at 303 comparison samples and made no excluded setter calls despite
simulated one-count noise in measured body/antenna getters. Native excluded goals
and configuration stayed exact; this test did not relax their admission rules.

A changed-profile simulated leg then lost ownership. Output was revoked, its job
failed, and readiness cleared. Authenticated stop/snapshot exported the same
capture under inhibition. Wrong tokens, foreign handles, a replaced native owner,
new trace start and target replay were rejected. The bounded first-failure result
survived revocation. Recording had to be sealed before a separate explicit
original-profile restoration; the failed job remained failed evidence.

All fourteen completed captures passed the public analyzer: **2461 complete target
frames and 2831 feedback events**. The generated peer recorded 2470 six-head goal
packets and 24 allowed profile writes, including exact restorations. Its packet
allowlist rejected torque, mode, gain and non-head goal writes. Final virtual
profiles, protected configuration and excluded motors matched their originals.
The interrupted capture is retained separately and excluded from completed-leg
scores, even if its recorded phases are complete.

The fixture used actual Pollen interpolation/playback, the actual head publisher
branch, native worker, Unix maintenance transport and in-process HTTP trace routes.
IK/FK, instantaneous servo response and readiness publication were synthetic.
It did not exercise production media initialization or a real TCP HTTP listener,
measure physical jitter, establish arrival, or demonstrate a profile benefit.

Filtered process-tree syscall tracing covered file/device opens, connections and
ioctls, without logging every serial read/write. Only generated PTY device paths
were found, with no physical-device opens or INET connections. Production checks
before/after matched 505 package files, the same sole serial owner, journal,
configuration and service units; status remained disabled. Native production
deadlines were unchanged. Earlier differently instrumented multi-operation
failures remain historical failed evidence; this pass qualifies the selected
repeat/return/fault-export sequence, not every maintenance boundary combination.

The initial evidence download encountered private root-owned file permissions.
Only the owned fixture receipts were made readable; the already completed trial
was not rerun. Download hashes and the independent packet/syscall/trace reviews
passed. After evidence retention, exact verified staging files and directories
were removed, and production invariants were checked again. No installation,
service restart, Wake/Sleep/Stop or movement command was sent to the physical
daemon. Existing artifacts were reused with zero new full backups. The Python
candidate is uninstalled, physical A/B/A remains incomplete, and mode correction
remains separate. An attended installation and a comparison runner that also
collects failed receipts are the next preparation before physical testing.

## Head-only physical comparison and backend loss

The qualified Python-only candidate was installed on October 18 with motors
disabled. Three Python runtime files and the daemon package record changed;
the native image, original configuration and existing rollback sources were
reused. The fault collector's five focused offline cases passed. Original
profiles were verified for both Wake/Sleep transitions, and the operator
confirmed each Wake before comparison motion. No mode or gain experiment was
included.

A1 completed all four 15-second movements with ten-second holds. B applied the
reviewed six-head acceleration/velocity values 42/13, verified their readback,
and completed its downward movement and return. B's combined starting-pose
residual against the frozen A1 neutral was 0.33 mm / 0.79°, within the unchanged
1 mm / 1° admission limits. Dense actual-path reviews and fresh-start rechecks
remained required; endpoint misses were retained as misses.

| Condition | Completed leg | Measured endpoint residual, translation / rotation |
| --- | --- | --- |
| A1, original profiles | Down 24 mm | 0.28 mm / 0.77° |
| A1 | Return | 4.63 mm / 3.89° |
| A1 | Up 10 mm | 6.74 mm / 5.97° |
| A1 | Return | 0.13 mm / 0.35° |
| B, profiles 42/13 | Down 24 mm | 0.28 mm / 0.73° |
| B | Return | 4.69 mm / 4.13° |

All six captures passed coverage analysis without exclusions: 7298 complete
frames and 7654 feedback events. Their median reference intervals were
20.31–20.43 ms, median group-write durations 0.069–0.073 ms, maximum native queue
delay 4.73 ms, and maximum recorded feedback-completion gap 24.38 ms. These
captured intervals ended before the subsequent fault; they do not rule out a
later failed bus read. Group writes and host timing do not establish simultaneous
individual servo acceptance. The operator reported interior jitter in A1 and
**similar jitter in B**. This incomplete comparison establishes no smoothness or
accuracy benefit from the tested profile.

At 07:40:40 UTC, after B's completed return, the daemon reported a motor-
communication error. It closed the backend, relinquished the serial handle and
removed the private maintenance socket. The following preflight withheld B's
upward leg before any target or intent marker was submitted. A2 never started.
The completed return trace was already exported and cleared; there was no
active upward capture to export. HTTP and SSH remained reachable. The operator
confirmed that Reachy was stationary and settled without concerns.

The error's physical trigger remains unknown. The bounded kernel-log window
contained no entries; this does not exclude a bus, electrical, power or scheduling
fault. Concurrent DNS/TURN and relay-authentication errors are separate recorded
facts, without evidence that they caused the motor error. This event also does
not explain the historical missing IPv4 route.

A three-case offline reproduction using the unchanged guard and retained Pollen
wrapper identifies a compatible teardown path. A failed native position read
can replace the cache with an error; the cache-age getter then raises. The guard
checks freshness even while target output is paused, revokes output and clears
readiness, but rethrows the exception. Pollen's wrapper closes the backend and
the guard's private service. The reproduction uses synthetic cache errors and
readiness publication: it proves this code path exists, not that the unrecorded
physical exception followed it. The first fixture attempt omitted its synthetic
readiness publication and failed an assertion; correcting that fixture did not
change installed code or production admission rules.

Recovery used the qualified cross-process original-only custodian after stopping
the error-state service and verifying that no serial owner remained. Syscall
decoding verified 32 read instructions and exactly six writes restoring original
head profile fields, with no goal, torque, mode, gain or reboot writes. The
transaction marker cleared. A temporary original-initialization startup, with
startup Wake disabled, regained ordinary factory Sleep access. This normal
initializer is distinct from the no-reboot maintenance entry; the entire cleanup
startup is not classified as read-only. One factory Sleep completed, and the
operator confirmed asleep and settled.

The temporary cleanup override was removed and the guarded service restored.
Final checks verified all 505 installed package files, the loaded native image,
original profiles/gains/modes, disabled motors, no pending transaction and one
serial owner. All 30 sampled cache timestamps advanced; maximum sampled
completion age was 21.1 ms. Existing backups were reused, with zero new full
backups and no website publication. Mode correction remains separate.

Before another moving comparison, investigate preservation of the bounded first
failure, sealed trace and same-owner original-restoration access when cached
feedback becomes erroneous. Reproduce transient and persistent read failures,
including between captures, without weakening freshness or write fencing.
Retaining an owner for diagnostics must not admit further targets or automatically
resume a failed trajectory. Independently instrument the underlying read failure;
do not attribute it to the candidate profile without evidence. A fresh comparison
must retain this partial run as incomplete and establish new matched starts.

## Feedback-error owner retention: offline

The October 18 Python-only candidate addresses teardown during an existing awake
head lease, including the paused interval between captures. Native cached-read
exceptions, invalid cache ages and expired freshness are classified at the cache
boundary. On such a fault, the publisher revokes native output, retires target
intent and clears readiness. Once revocation is confirmed, it contains this
classified exception so Pollen's wrapper does not close the native owner and
private service. Failed/uncertain revocation still propagates; unrelated publisher,
ownership, tracking and programming exceptions retain their fatal behavior.
The ordinary non-maintenance path is unchanged.

Private status retains the first bounded failure code, native cause category and
exception type. A single bounded private receipt records its timestamp, job/session
context, paused state, bounded exception/cause text and stack-frame locations.
The configured receipt directory must already exist and be canonical and private;
files are exclusive, mode 0600 on Linux and at most 16 KiB. Raw text and paths do
not enter status or HTTP responses. A persistence failure is reported without
discarding the owner or restoration access. Later faults cannot overwrite the
first receipt. Recording does not add a serial owner, register read or motion.

After a feedback fault, status and authenticated stop/snapshot/clear remain
available on the same retained owner. New trace start, ordinary commands,
candidate application, a new motion grant and target replay remain blocked.
An active trajectory stays failed/interrupted; a previously completed job is not
retroactively marked failed when the fault occurred between captures. A later
fresh packet does not release the fence.

Recovery has two explicit steps. First, after the existing trajectory/observer
drains, restore the original profiles through the existing native transaction.
The native worker's periodic reads can remain paused while that transaction is
locked; freshness is therefore not made a prerequisite for restoring originals.
The known completed restoration closes the transaction and resumes its native
reader, while the Python output fence and cleared readiness remain latched.
An uncertain restoration reply does not count as known completion.

Then the private `acknowledge-feedback-recovery` operation requires the exact
restored transaction handle, current token/UID, owner epoch, attendance,
identity/version, power, app and idle gates,
no pending native transaction or active motion, a known completed original
restoration and a finite native-cache age below 500 ms. It reads the cache rather
than the bus, retires targets and the previous command epoch, and releases ordinary
admission without a servo write. Old capabilities and already-created coroutines
remain retired. The successful acknowledgement's request ID is retired and its
transaction handle cannot acknowledge a later recovery. It neither resumes the
failed trajectory nor changes its score.

The fault stays in private maintenance status rather than Pollen's fatal backend
error field. The retained daemon status code would latch ERROR on that field
without automatically returning to RUNNING; avoiding that separate fatal path
preserves accurate recovery admission. Readiness remains false throughout fault
retention and original restoration, until explicit fresh acknowledgement.

Offline validation passed 24 new focused cases and the retained regression suites,
for 90 successful Python test executions in the final run, including repeated
retained cases. Coverage includes persistent/transient errors, paused and active
jobs, first-fault privacy, storage failure, authenticated inhibited export,
restoration uncertainty, freshness boundaries, owner/context loss, Stop and
post-recovery epoch fencing. The tests use the actual candidate guard, retained
Pollen playback/wrapper/status methods and in-process HTTP routes with generated
native behavior and readiness publication. Initial context-fixture and Windows
text-decoding mistakes were corrected before the final pass; production rules
were not relaxed to pass them.

Packaging verified 494 baseline non-record wheel members against the saved
installed inventory. Only the maintenance Python module and wheel record change.
The same native wheel and pinned rollback source are reused; no native deployment
build or full backup was added. The candidate is uninstalled. No robot connection,
request, installation, restart, Wake or movement was sent, and mode correction
remains separate.

Before deployment, qualify the exact wheel with the existing actual native worker
and isolated ARM/PTy owner: inject a cache error during a leg and between captures,
retain/seal/export the same observer, restore originals, and acknowledge only after
native feedback resumes. Check both persistent errors and uncertain revocation/
restoration replies. This offline patch does not establish the physical bus-error
cause, a servo-profile benefit or general hardware compatibility.

## Feedback-error recovery: native worker and ARM/PTy qualification

The exact Python wheel above was exercised under Python 3.12 on aarch64 with the
same retained native image. A generated PTY register peer, separate journal and
private Unix socket isolated the actual native worker from the production owner.
The unchanged Pollen backend-closing wrapper ran around the fixture publisher;
the test did not simply catch and ignore its exceptions. The actual head publisher,
Pollen playback, maintenance server and in-process HTTP observer routes were used.
IK/FK, instantaneous servo response, power/context and readiness publication were
generated fixture surfaces. Production media/startup and real TCP HTTP serving
were not exercised.

Two real native-cache-failure sequences passed:

1. After a downward leg and return had completed and their captures were exported
   and cleared, bad position-reply checksums caused the native position cache to
   become erroneous. The owner and private service survived with output revoked,
   readiness cleared, a first-fault receipt and the completed job preserved.
   Original restoration closed the transaction. Continued bad replies still
   blocked acknowledgement; fresh replies alone did not resume output. Exact-handle
   acknowledgement then released admission without an extra head packet. A
   previously created coroutine and the former lease remained retired.
2. A bad position-reply checksum during a trajectory failed the job and revoked
   output. The same owner's observer sealed/exported the interrupted trace while
   readiness stayed cleared. Wrong tokens and foreign capture epochs were denied,
   and restoration was blocked until sealing. After original restoration and
   resumed fresh feedback, an acknowledgement from the previous transaction was
   rejected. A new explicit acknowledgement released admission without a head
   packet. A new session then completed an upward leg and return; the failed
   target was not replayed.

All 24 focused regression cases also passed on ARM, including private receipt
failure, owner/context/authentication loss, uncertain revocation/restoration and
post-recovery epoch fencing. Their native behavior is generated; these auxiliary
cases do not establish that every uncertainty boundary was induced in the real
serial worker. The two main sequences above used actual protocol failures and
actual erroneous native-cache reads.

Four completed captures passed the public analyzer: **367 complete frames and
440 feedback events**. The interrupted trace retained 12 complete target frames
and 24 feedback events, with `feedback-unavailable` exclusion; its job remains
failed evidence. The peer recorded 22 faulted position-read batches, 379 accepted
six-head goal packets and 36 allowed profile application/restoration writes.
It rejected all other write forms. Final profiles, protected configuration and
body/antenna state matched their originals. Host/peer evidence does not establish
physical servo acceptance, arrival or smoothness.

The initial attempt used an instruction-error byte together with full-length
position data. It completed two movements and passed 24 ARM cases, but its generic
position-read path accepted the parameters and the intended cache failure did
not occur. This is retained as a failed qualification, with separate traces.
The retained generic reader parses status error information but does not reject
it on that path; this differs from a checksum failure and is a separate follow-up
observation. It does not identify the physical error's cause or establish how
all real servo error replies behave. The second attempt changed only the
generated peer to corrupt checksums and improved fixture diagnostics; the exact
runtime wheel, native image and production deadlines stayed unchanged.

Independent process-tree syscall analysis found only generated PTY device opens
and no INET connections. Read-only checks before/after both attempts matched the
same sole production serial owner, 505 package files, journal, configuration and
service units; production remained disabled. Both fixture process trees exited.
After downloaded hash/evidence review, only exact verified staging was removed,
including the archived failed virtual journal. No production controller was
constructed by the fixtures, and no installation, service restart, Wake/Sleep/Stop
or motion request was sent to it.

The candidate remains uninstalled. Existing native and rollback artifacts were
reused with no new full backup, publication or mode correction. The next device
stage requires a later attended installation request, fresh identity/disabled/
owner checks, and original profiles for any later Wake/Sleep. This result qualifies
the tested owner-retention/recovery sequence; the physical A/B/A remains incomplete.


## Feedback-recovery installation and complete vertical A/B/A

The subsequent attended October 18 run installed the exact ARM-qualified
feedback-recovery Python module and updated its daemon RECORD. It reused the
native image and rollback sources; no mode/gain correction, full backup,
configuration change or publication was included. The existing no-startup-Wake /
no-shutdown-Sleep service policy stayed in place.

Disabled recorder off/on/off windows retained 506 consecutive feedback events
without loss or head goal writes. Maximum sampled cache completion age was
24.2 ms; CPU was 61.7%, 61.8%, 53.9% of one core respectively. This is a finite
recorder comparison, not a controlled measurement of the entire patch against
the preceding package. It provides no physical timing guarantee.

A1 original profiles, B acceleration 42 / velocity 13, and A2 restored originals
completed the same four targets: frozen measured neutral −24 mm, neutral,
neutral +10 mm, neutral. Each used a 15-second daemon-local minimum-jerk ramp and
ten-second observation hold. Wake/Sleep used original profiles between conditions.
Each Wake was visually confirmed; initial poses matched the same frozen A1
reference within the unchanged 1 mm / 1° admission bounds. The frozen reference
is a measured, slightly tilted pose, not a calibrated level pose. Actual-path
reviews used the preceding measured endpoint; misses were not rebased away.

| Movement | A1 original | B candidate | A2 original |
| --- | --- | --- | --- |
| Down 24 mm | 0.32 mm / 0.69° | 0.28 mm / 0.67° | 0.35 mm / 0.71° |
| Rise to neutral | 4.70 mm / 4.77° | 4.99 mm / 4.76° | 4.72 mm / 4.59° |
| Rise 10 mm | 6.87 mm / 6.36° | 6.82 mm / 6.02° | 7.04 mm / 6.13° |
| Descend to neutral | 0.09 mm / 0.45° | 0.07 mm / 0.40° | 0.08 mm / 0.53° |

Errors are target-to-measured FK translation norm / relative orientation angle.
They are not external metrology or a certificate of arrival. All **twelve traces**
passed coverage analysis: **14,585 complete frames and 15,302 feedback events**.
Maximum sampled cache completion age was 27.7 ms; the largest recorded feedback
completion gap was 24.1 ms. No feedback-cache fault occurred in these movements.
Owner retention and fault acknowledgement therefore remain ARM/PTy fault-injection
evidence, not an induced physical-fault result from this run.

The operator reported similar interior jitter and upward tilt in all conditions,
with no contact/strain concerns. Both upward legs visibly extended some supporting
arms less than others; initial descent and final downward return stayed closer
to the requested orientation. At the upper endpoints, requested-minus-measured
joint errors were roughly +7.4 to +8.2° at motor 15 and −5.8 to −6.2° at motor 16;
other joints also had unequal errors. This supports direction-dependent joint
following as a separate issue from staircase visibility. It does not identify
load, friction, calibration, control mode or gain as the cause. This tested profile
setting showed no clear benefit and was restored, not promoted as a default.

The installed Wake source defines `INIT_HEAD_POSE = np.eye(4)`, briefly requests
20° roll, then returns to neutral in 0.2 seconds. It does **not** request a lasting
tilt. Saved post-Wake FK samples showed about 2.6–2.9° roll / 1.9–2.4° pitch,
confirming that a repeatable Wake is not proof of physical leveling. These model
estimates do not separate joint following from calibration/mechanical offsets.

Before A1, a preparation snapshot mismatch and a subsequent no-write closure
stability rejection retained inhibition. A fresh explicit no-write reconciliation
succeeded on the same owner, with no extra Sleep/Wake. A serial-only syscall trace
of that successful reconciliation showed read instructions and no observed
mutation instruction; a final cache-read intent was detached before syscall return
and is excluded from confirmed packets. The earlier rejected snapshots were not
captured, so their exact difference remains unknown.

A1/B reclaim responses were unavailable; read-only status confirmed native output
revocation, and explicit original restoration succeeded without replaying reclaim.
A2 reclaim succeeded. The remaining gate diagnostics should be improved separately;
completed traces do not make those rejected operations successful.

Final checks matched 505 package files, the same native image/controller owner,
service/configuration hashes, original profiles/gains/modes, disabled motors and
no pending journal or ordinary inhibition. Thirty final cache samples advanced
with maximum completion age 22.2 ms. The operator confirmed normal final Sleep,
asleep and settled. The lease was released. DNS/TURN credential errors persisted
in the daemon journal, but no motor-communication error was logged in this window;
that does not establish a cause for earlier bus or network failures.

Next: investigate the repeatable upward static following error and Wake bias,
using these per-joint traces and direction-matched endpoints before another profile
tune. Preserve the mode-correction separation and exact restoration/ownership gates.
