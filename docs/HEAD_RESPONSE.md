# Head target response and settling

The next [separate I0/I1 probe](I_GAIN_TRANSACTION.md) is implemented and validated
offline, with P300 fixed and only motor 15 eligible. Its software restoration
checks do not establish physical integral response or complete head leveling.

The [completed October 19 P-only A/B/A](P_GAIN_TRANSACTION.md#october-19-completed-common-start-and-matched-p300p360p300)
used the same original-P300 approach history before all three conditions and
identical delivered and independently read-back servo goals. Motor 15's upward
terminal errors were **74 → 59 → 74** and **86 → 58 → 86 counts** for
P300/P360/P300. The operator saw less tilt in B and more again in A2; other joints
retained substantial errors. This single ordered comparison supports a reversible
position-loop contribution after correct goal delivery. It does not establish a
mechanical, electrical or calibration cause, general gain policy, or a remedy for
slow-motion quantization. Original settings and normal final Sleep are verified;
no permanent gain or mode change was adopted. The preceding interrupted A/B
attempt remains separate evidence under its earlier preparation protocol.

The October 17 [bounded joint trace](JOINT_TRACE.md) adds
observation of actual generated joints, grouped native write calls and existing
cached feedback. After ARM/runtime and disabled-only qualification, eight attended
15/2-second vertical captures were collected; six qualify complete coverage.
They show grouped head writes with staggered integer goal changes, fewer repeated
goals at two seconds, and persistent direction-dependent neutral error at both
speeds. Conversion and control settings are unchanged. Read the
[dated findings and exclusions](JOINT_TRACE.md#attended-152-second-vertical-traces);
quantization, timing and static error need separate follow-up experiments.

A requested head pose, an acknowledged request and a measured pose are separate
evidence. The local bridge retains its exact sent matrix, body yaw, command epoch
and request timing. It waits for later measured feedback using the existing
one-degree combined angular and one-millimetre translation criteria. A response
alone does not satisfy arrival. An unsettled target ends through the guarded
measured-hold recovery path; it is not retried or compensated automatically.

For the smoothness investigation, the [teleoperation research guide](research/README.md)
maps two dated external reports to this evidence and the proposed matched
trajectory/location comparison. It preserves the distinction between uneven
motion, static following error and unqualified Sleep-center accuracy.
The [prepared A/B/C experiment](TRAJECTORY_COMPARISON.md) now supplies an offline
Pollen-math oracle, capped PC references and a separately guarded local-goto task
path. The later attended attempt completed one PC-linear excursion and a separate
daemon-local return, both without full measured arrival. It withheld the remaining
matched conditions because the baseline was not re-established. Read its dated
record for timing, native feedback and the limits of this partial comparison;
it does not establish a smoothness ranking.

## Daemon 1.10.0 semantics

The official release is pinned to
[`7f54717586369155900eeeb43fd4bbbb62064f22`](https://github.com/pollen-robotics/reachy_mini/tree/7f54717586369155900eeeb43fd4bbbb62064f22).
Its [move router](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/app/routers/move.py)
returns `status: ok` after the backend stores the requested pose. The
[robot loop](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/robot/backend.py)
performs inverse kinematics later. A caught inverse-kinematics error can retain
previous computed joint targets. Therefore an acknowledged pose does not prove
that a new joint goal was calculated or delivered to motors.

The [state router](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/app/routers/state.py)
creates its timestamp when constructing the HTTP response. This timestamp does
not establish encoder acquisition time. Reported head pose comes from forward
kinematics using joint feedback; it is not an independent optical measurement.

The local bridge requests `with_head_joints=true` alongside the measured pose in
the existing full-state GET. It retains bounded finite joint feedback as optional
diagnostic evidence. Missing or malformed joints remain unknown and do not alter
control admission or arrival. No additional polling request is added. Native
diagnostics label the 1.10.0 timestamp as `response-created` and keep sensor age
unknown; other version semantics remain unverified.

The router also offers target-state flags, but the release's
[`FullState` model](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/app/models.py)
omits those target fields, so its ordinary model validation discards them. An
offline reproduction confirmed this serialization gap. A proposed upstream
serialization patch was initially private and uninstalled; the later attended
deployment below installed the qualified private artifact. Even with that patch,
stored requested pose and computed joint target must remain distinct: the latter
can be older after an inverse-kinematics failure and has no request correlation.

## Current evidence and next validation

Attended local pilots on October 14 showed visible antenna movement and normal
Wake/Sleep, but both small and larger yaw changes failed settling. Saved sent
matrices preserve requested rotation, omitted translation/axes and body yaw. The
measured yaw plateau persists under healthy HTTP timings. Independent rotation
fixtures and offline plateau replays support the conversion and recovery behavior.
They do not establish the physical cause or resolve reliable yaw control.

An additional attended local capture on October 14 confirmed seven native joint
values, the active AnalyticalKinematics engine, Rust kinematics 1.0.3 and motor
controller 1.5.6. Both approximately six-degree yaw attempts still failed settling.
The operator saw the repeated turn, reported uneven motion and no unexpected
movement, then confirmed normal Sleep. Exact, uncapped journal intervals contained
no logged inverse-kinematics errors. The final asleep observation window remained
reachable; this does not establish long-term network reliability.

Read-only calculations using the installed kinematics model reproduced the sent
poses within 0.01 degrees and 0.032 mm. Comparing these derived joint goals with
pre-recovery feedback showed larger positive-yaw gaps on Stewart joints 1/3/5 and
negative-yaw gaps on 2/4/6. Derived goals are not observed daemon or motor targets.
At that stage, missing target fields prevented observing the computed goals;
this evidence does not identify a mechanical, calibration or motor-controller cause.

## Motor conversion and delivery audit

The version-matched [motor-controller 1.5.6 source](https://github.com/pollen-robotics/reachy-mini-motor-controller/tree/dff1c536a75735a950564e18240d6a67b056819c)
shows that Python setters acknowledge queue submission. Its native worker later
executes the command; both the ordinary loop and shutdown drain discard execution
errors without logging them. Consequently, clean daemon journals do not rule out
serial-write failures. The pinned rustypot sync-write path broadcasts goals and
does not read individual motor acknowledgements. Local serial-write completion
is separate from motor acceptance and measured arrival.

The [pinned rustypot conversion](https://github.com/pollen-robotics/rustypot/blob/7b1ab271c40a3837d25d21494a7c8626b3e969a0/src/servo/dynamixel/xl330.rs)
truncates radians to 4096 counts per revolution, with less than one count of
conversion error for these targets and no direction-dependent branch. Applying
that exact conversion to the saved model-derived goals leaves positive-yaw gaps
of 23/24/24 counts on joints 1/3/5 and negative-yaw gaps of 21/21/22 counts on
2/4/6. This does not explain the plateau through rounding alone. These remain
derived goals, not observed daemon computations or motor goal registers.
The audited native files match both the PyPI source archive and pinned Git
commit. The subsequent package pass verified the original installed ARM extension
against the official wheel before qualifying its replacement.

The initial private diagnostic proposals cover bounded execution-error
logging in both native processing paths and exposure of the existing native
joint-cache timestamp. Fault-injection tests check error reporting without
additional retries or changed command order. Extracted daemon tests check that
joint values and timestamp come from one cache object. These are offline harness
results, not a full native-package build or daemon/hardware integration test.
The cache timestamp describes read completion, not physical sensor acquisition;
it does not date the separately calculated FK pose.

A later full-package validation built the patched native library and Python
wheels for Windows and ARM64 Linux. Nine complete native-library tests used an
in-memory serial port to exercise the actual worker, failed serial writes and
motor packet bytes. Complete daemon wheels were installed in an isolated test
environment; actual ASGI routes, models, optional fields and rollback passed.
Overlapping patch contexts and new-file rollback headers were corrected.

Source-archive builds contained Git LFS pointers and were rejected as deployment
artifacts. The final private daemon candidate instead preserves the official
wheel's assets and changes only four reviewed Python modules and RECORD. Payload
hashes, RECORD entries and rollback were verified. Source-built integration
artifacts must not be substituted for this asset-preserving candidate.

An attended software check on the robot's ARM CPU passed 46 assertions using
temporary package overlays, the recorded NumPy/Pydantic versions and fake
backends. The harness blocked socket, controller, worker-thread and process
construction. Its Linux libc import lookup used the already loaded process
library; this confined harness adaptation changes no package behavior. Scratch
files were removed, the original service process and payload stayed unchanged,
and status still reported disabled/asleep. This establishes target-platform
import/serialization compatibility, not live daemon lifecycle, serial transport
or physical motion validation. At that checkpoint, the diagnostic proposals
remained uninstalled. The later deployment used separate attended authorization
and an exact device backup because lifecycle changes can cause motion and setup.

The controller requires exactly seven finite values for optional native joint
diagnostics. Missing or malformed evidence stays unknown and does not affect
admission. It can retain the proposal's optional numeric sample timestamp in the
same state GET, without comparing device clocks or changing freshness checks.
The public diagnostic summary explicitly leaves computed joints unavailable,
serial outcome and motor-goal acceptance unknown, and pose/joint sample
correlation unknown. Simulation is labelled separately. Neither acknowledged
writes nor convergence supplies the missing motor-delivery evidence.

## Attended diagnostic deployment and capture

The qualified private ARM motor-controller and asset-preserving daemon payloads
were installed on October 14 after a complete package/configuration backup was
verified on both robot and controller PC. Only the reviewed native extension,
four Python modules and corresponding installed RECORD entries changed. Assets,
dependencies, launcher, service configuration and permissions were preserved.
The daemon was stopped without requesting its shutdown Sleep trajectory, then
the service was stopped before replacing code. The restarted owner loaded the
new native extension, remained disabled/asleep and exposed advancing native
joint-cache timestamps. Versions remain 1.5.6 and 1.10.0; artifact hashes identify
the private changes. These diagnostics do not broaden version admission.

An explicit Wake and visual confirmation preceded a six-degree yaw command.
Requested yaw was 5.9 degrees; measured yaw was approximately 2.27 degrees at
the settling fault, with 3.64 degrees combined angular error and 0.75 mm
translation error. Actual computed joint targets stabilized at the requested
pose. Before recovery, target-minus-measured encoder counts for Stewart joints
1 through 6 were approximately 22, -1, 24, 1, 25 and -2. The final matching-goal
samples retained identical measured joints while native cache timestamps advanced.
These are observed software goals, not independently read motor goal registers.

The operator explicitly requested twice the range. That new twelve-degree command
targeted 13.8 degrees from its fresh measured baseline, within the existing
controller limit and at the same speed. Measured yaw reached approximately
8.49 degrees at the fault, with 5.47 degrees combined angular error and 1.69 mm
translation error. Before recovery, joint gaps were 18, -1, 36, 1, 49 and 0 counts.
The operator reported a clearly visible turn and no unexpected motion. The local
repeat observer exited early because its idle helper rejected its own active
worker; the independent full capture and unchanged controller settling guard
recorded the complete command, plateau and recovery. No uncertain write was
replayed. Stop and Sleep completed, and normal Sleep was confirmed.

The two complete remote captures returned 372 and 371 successful reads, with no
reported native execution failures/recoveries or IK errors in their uncapped
journal windows. A pre-Wake request for target pose hit the existing assertion
on an uninitialized target; measured-only startup checks remained healthy.
Individual local snapshots also exceeded the existing freshness limit; writes
were withheld when admission failed. A final 30-second asleep window returned
29 healthy snapshots, with no failures and a maximum snapshot read of 208 ms.
Cache read completion is still separate from sensor acquisition and FK-pose
timing. Media relay warnings are separate from motor-write evidence, and
authenticated hosted media remains unverified.

The next discriminating evidence is motor goal-position register readback paired
with present positions through the existing controller owner. Quiet execution
logs and daemon computed goals do not prove individual servo acceptance. Keep raw
receipts and identities private, retain rollback backups, and do not increase
settling tolerances, broaden admission or resume prior targets.

## Offline servo-register readback candidate

A subsequent October 14 offline pass adds a private readback candidate through
the existing native control-loop owner. One explicit request reads goal-position
and present-position counts for the body and six Stewart motors. It sends a
Protocol 2 sync-read covering registers 116 through 135; it sends no motion,
torque, mode, reboot or calibration instruction. The [XL330 register table](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/)
defines goal position at 116 and present position at 132. Each returned motor
record contains both signed counts from its contiguous reply, with fixed motor
order, a host request sequence and native read-start/completion timestamps.

This request uses the existing worker queue and serial connection, with one
outstanding request, a one-second cooldown and a 200 ms absolute software budget.
Expired, cancelled and shutdown requests are skipped; caller timeout retains busy
ownership until the queued operation is dropped or completed. No retry or cache
fallback is added. The Python binding releases the GIL while waiting. An explicit
threadpool daemon endpoint exposes typed readback, returning sanitized unsupported
or unavailable responses. Ordinary state polling does not request these registers.

The diagnostic parser follows the [Protocol 2 framing and byte-stuffing rules](https://emanual.robotis.com/docs/en/dxl/protocol2/):
it checks CRC, ordered motor IDs, every status error bit, decoded payload length
and bounded frame allocation. A narrow private dependency change makes ordinary
reads reject unexpected response lengths before conversion. This prevents a late
20-byte diagnostic reply from being accepted by a normal four-byte position
decoder or causing its existing unchecked conversion to panic.

Twenty-seven full native-library tests passed with an in-memory serial bus,
including malformed and fragmented replies, signed counts, delayed replies,
subsequent ordinary I/O, queue limits, timeout/cancellation, shutdown, FIFO order,
clone replay prevention, actual Python getter types and GIL release. Review found
and fixed cooldown extension on rejected calls and Python container conversion
mismatches. Eighty-two installed daemon/rollback checks passed, preserving all
327 assets. Exact compiled Windows native/daemon packages passed ten export
checks and 76 ASGI assertions, with installed payload hashes verified. Native
source rollback restored all 22 baseline files byte for byte.

Windows and ARM64 Linux wheels were built and their architecture, RECORD and
generated stubs checked. The new ARM artifact has not been loaded on the robot;
cross-building and host tests do not establish target runtime, serial timing or
firmware compatibility. The browser controller's 401 offline tests and both
production builds passed. No robot requests, deployment, restart or movement
occurred during this offline pass. The candidate remains private and uninstalled;
the earlier attended diagnostic installation is a separate artifact.

Readback remains observational. The protocol supplies no transaction nonce:
`read_sequence` identifies a host request and cannot conclusively correlate a
sufficiently delayed reply with that request or a browser command epoch. The
timestamps bound sequential replies, not simultaneous motor sampling or physical
sensor acquisition. Driver scheduling also limits deadline guarantees. Requested
software targets, observed motor registers and measured arrival remain distinct;
no freshness, ownership, version, arrival or recovery guard is changed.

## ARM deployment and live readback blocker

The readback candidate was subsequently validated on the robot's ARM64 CPU on
October 14. Seventy-six isolated import/ASGI assertions passed against its actual
Python and dependency versions, with an inert backend and no motor-controller
construction. The native extension loaded and matched the reviewed artifact hash.
Those assertions establish target runtime compatibility, not live serial behavior.

After a byte-verified package/configuration backup was retained on both machines,
the six reviewed payload files and their installed RECORD entries were replaced.
The service restarted with its existing no-startup-Wake setting. The new owner
loaded the expected native extension, reported ready and disabled, and provided
advancing joint-cache timestamps. Normal state requests remained healthy. Assets,
dependencies and service configuration were preserved; version admission is unchanged.

The explicit pre-Wake register endpoint returned unavailable (503). A bounded
serial-syscall trace attached only to the existing owner's serial descriptor
explained this response: all seven motors returned CRC-valid, correctly ordered
20-byte replies, each with raw status byte `0x80`. Their goal and present counts
matched while disabled. The installed strict parser rejects every nonzero status
byte, so no successful typed readback sample was produced. The trace was detached;
no second serial owner or raw-packet command was introduced.

The [Protocol 2 error field](https://emanual.robotis.com/docs/en/dxl/protocol2/#error)
distinguishes the hardware-alert bit from instruction-error bits. Captured routine
reads also passed CRC checks and reported hardware error value 1 (input voltage)
and present voltage of 7.3–7.4 V. The pinned upstream backend filters that voltage
error when voltage is at most 7.8 V. This explains its quiet hardware-error logs;
the filter is not evidence of the actual motor's permitted voltage range. Motor
model, firmware and configured voltage limits remain unqueried, and this alert
has not been established as the cause of the earlier yaw shortfall.

Wake and yaw were withheld because usable readback was a prerequisite for this
capture. Final status still reported disabled, with no active app or move and
healthy ordinary telemetry. No Wake, motion, Stop or Sleep command was sent in
this deployment window. The hosted publication was unchanged.

The next private change should expose alert-bearing observations explicitly and
provide bounded, fixed READ-only model/configuration/error registers through the
same worker. Instruction errors, malformed frames and transport failures must
remain unavailable; an alert must not become a clean-health result. The existing
raw-packet WebSocket path was reviewed but not used: its native wait has no timeout
and holds the GIL, so a client timeout would not cancel it. Do not bypass the
readback prerequisite or change motor voltage limits, shutdown bits or calibration.

## Offline alert reporting and motor metadata

A new private candidate addresses the live readback blocker without hiding motor
alerts. Goal/present samples retain each raw status byte and expose a derived
hardware-alert flag. Only status values 0 and 128 can produce a sample; any
instruction-error bit, malformed frame or transport failure remains unavailable.
A successful diagnostic response is not a motor-health result or motion clearance.

The candidate adds an explicit motor-metadata endpoint through the same native
worker and serial owner. Fixed reads cover model number and firmware, configured
minimum/maximum voltage, shutdown mask, raw torque enable, hardware-error status,
present voltage and temperature. Each of its three sequential phases retains its
own status bytes and derived alerts; hardware-error flags include unknown/reserved
bits. Unknown model numbers, unusual limits and raw byte values stay observable.
No motor rating is inferred and no EEPROM, calibration or motion write is added.

The fixed [register-map](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#control-table)
profiles are 0/36, 60/11 and 140/7 (start address/length). The final profile includes
documented position-trajectory bytes before voltage and temperature. Its minimum
payload length exceeds ordinary position and PID read lengths, including stuffed
responses. A proposed three-byte voltage profile was rejected because stuffing
could make a delayed reply resemble a normal four-byte position response. The
first two spans include reserved addresses; firmware support remains unverified
and rejected spans have no fallback probing or partial-success response.

Position and metadata requests share one outstanding-request limit, one-second
cooldown, host sequence and 200 ms queue/execution budget. All three metadata
phases use that single deadline. Python waits release the GIL; both daemon routes
run in the threadpool. Ordinary state polling remains unchanged. Phase results
are sequential: a hardware-error read cannot retroactively explain or clear an
alert from another phase. The existing protocol nonce/correlation limits remain.

Thirty-eight native tests passed with a memory bus and actual Python bindings.
Installed daemon and rollback artifacts passed 285 ASGI assertions. The exact
compiled Windows packages passed 31 export checks and 278 ASGI assertions with
installed payload hashes verified. All 327 official asset entries were preserved;
incremental native source rollback restored 25 baseline files byte for byte.
Windows and ARM64 wheels passed architecture, RECORD and generated-stub checks.
The controller's 401 tests and both production builds passed on Node 24.13.1.

This candidate remains private and uninstalled. Its ARM binary has not been
executed; cross-building does not establish ARM runtime or live firmware/bus
compatibility. This pass made no robot requests, restarts or movement and did not
change the hosted publication. The previously installed strict readback remains
the deployed artifact; its last live unavailable result is historical evidence.

## Device alert and metadata validation

The alert-bearing candidate subsequently passed 278 isolated checks on the
robot's ARM runtime and was installed after a verified backup on both machines.
The daemon restarted with automatic Wake disabled and healthy ordinary telemetry.
Initial diagnostic requests still returned 503 despite complete motor replies.
An existing-owner descriptor-only trace verified all 21 metadata frames, covering
all three fixed profiles, with correct CRC, identity and length.

The remaining failure was reproduced offline at the native/Python boundary.
PyO3's sample classes identify their module as `builtins`; Pydantic 2.12.5 rejects
them before reading attributes when using `from_attributes=True`. Earlier API
tests used `SimpleNamespace`, which did not reproduce this restriction. A focused
memory-bus regression now passes real frozen native samples through the exact
strict models and ASGI handlers. Both routes explicitly extract only their
declared model fields, then apply unchanged strict validation and derive alerts.
This changes one daemon module and its installed RECORD, with no native rebuild,
additional read, fallback or relaxed validation. Package and rollback variants
passed 278 assertions each; the corrected package passed another 278 isolated
ARM checks before backup, installation and restart.

After this correction, three metadata and three goal/present endpoint requests
succeeded while the robot remained disabled. Host sequences advanced, explicit
raw alerts and derived flags agreed, and an immediate cross-endpoint read returned
503 as expected from shared cooldown admission. Normal status/state observations
remained healthy; tracing was detached and final service/ownership checks passed.

All seven tested motors reported model number 1200, firmware 53, configured
minimum/maximum voltage of 3.5/7.0 V, and present voltage of 7.4 V. Hardware-error
status was 1 (input voltage), with raw Alert `0x80` retained in each phase.
The shutdown mask was 52, raw torque enable was zero, and temperature values
were 26–29 under the pinned register map. Goal and present counts matched while
disabled. This confirms the observed voltage exceeds the configured maximum;
it does not establish the physical electronics' safe supply rating, factory
intent, or the cause of earlier yaw settling failures. No motor limits, shutdown
bits, firmware, gains or calibration were changed.

No Wake, movement, Stop or Sleep command was sent in this window. These results
establish disabled-state diagnostic compatibility for the observed firmware;
they add no moving-register, physical arrival, hosted-controller or phone evidence.
The operator subsequently clarified they were absent during this deployment
window, so these observations have no visual confirmation.
The corrected private daemon and native payloads are now installed. Backups and
raw receipts remain private. The hosted publication and existing control gates
remain unchanged.

## Attended moving-register comparison

A subsequent October 14 test had a confirmed operator and visual checks after
explicit Wake and Sleep. The original adapter's label reads 7.3 V. Pollen's
[hardware specification](https://github.com/pollen-robotics/reachy_mini/blob/main/docs/source/platforms/reachy_mini/hardware.md)
lists a 6.8–7.6 V robot input range, and its
[troubleshooting guide](https://github.com/pollen-robotics/reachy_mini/blob/main/docs/source/troubleshooting.md)
states that the higher servo voltage is intentional. Raw input-voltage alerts
remained visible; no motor configuration or control admission was changed.

Two bounded local yaw trials again failed settling: a roughly 6° change reached
about 1.8° against a 5.7° destination, and an operator-requested 12° change reached
about −5.9° against a −10.6° destination. The larger motion was clearly visible
with no unexpected motion reported. Measured holds and explicit Stops completed.

In three target-stable read brackets for the first trial and two for the second,
all seven servo goal registers exactly matched the pinned native conversion of
the daemon's requested joints. Measured register positions still fell short;
the largest last-sample joint gaps were 25 and 47 encoder counts respectively.
All observed metadata samples during both captures reported torque enabled on
every tested motor, voltage 7.3–7.5 V and only input-voltage error status 1.
No native execution or IK failure was reported in the bounded journals. These
observations narrow the shortfall beyond software-target conversion and delivery
to the goal registers for the sampled intervals; they do not establish its cause.

The repeat observer prematurely rejected a retained fault from the preceding
trial. Its stage result remains failed. Independent capture and a fresh fault
with the new command epoch recorded full-endpoint acknowledgement and a subsequent
settling failure before Stop. This distinguishes a harness limitation from the
robot's measured failure and avoids claiming a successful arrival.

Reads are sequential, lack a device transaction nonce and cannot exclude an
intermittent fault between samples. Torque enabled and goal acceptance do not
prove mechanical health. No gains, current/PWM limits, voltage limits, calibration
or firmware were changed. Final visual Sleep, disabled motor readback and a
30-second reachable window passed. These are local hardware observations, with
no hosted, phone, camera/audio or simulation validation added. Private captures
are retained; the hosted publication remains unchanged.

## Offline servo-loop audit

The moving-register captures do not include PWM, current, active gains, operating
modes or internal trajectories. They cannot distinguish output saturation,
trajectory lag, proportional-control static error or mechanical loading. The
bundled gain configuration is not observed hardware state: the pinned daemon
applies it only when a hardware configuration path is supplied. The native PID
encoder correctly writes D/I/P at addresses 80/82/84.

The pinned legacy XL330 map incorrectly uses unsigned types for goal/present PWM
and velocity/position trajectories. A new private fork corrects those four raw
types and adds a fixed-profile read through the existing controller worker. It
retains signed values, all seven actual mode registers, gains, limits, watchdog,
goal/trajectory/present positions and separate phase alerts. It uses the existing
shared request slot, cooldown and 200 ms deadline; no address selector, retry,
cache fallback, extra owner or ordinary polling is added. Reserved bytes are
not interpreted as documented registers.

The [ROBOTIS control-table documentation](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/)
distinguishes current limits by operating mode, mode-dependent profiles and gain
resets. Goal acceptance and firmware Moving/In-Position flags do not replace this
controller's measured arrival checks. Raw current, which XL330 measures at the
supply input, is not a direct torque measurement. These interpretations do not
justify adjusting gains, limits or calibration without further evidence.

Forty-six native tests passed with a memory serial bus, including signed extremes,
fixed-profile offsets, malformed/late replies, shared deadline/queue behavior and
real frozen native samples through all three exact strict models and ASGI routes.
The actual Windows candidate passed 729 installed-package ASGI checks and 510
additional strict-schema checks; the exact deployed package rollback passed 279.
Windows and ARM64 wheels passed RECORD, architecture, generated-stub, payload and
byte-exact source rollback checks. All 327 official daemon assets were preserved.
The ARM artifact has not executed on the target, and the new register spans and
worker timing remain unverified on the live bus. The candidate is uninstalled.

A separate daemon proposal removes a legacy body-mode-0 write and early torque
enable on exit from gravity compensation. Thirty-one inert transition checks
reproduce the old behavior and verify the corrected call order with ordinary
Disabled-to-Enabled unchanged. This path was not used in the sampled yaw tests.
It preserves the body's existing mode and does not repair an already incorrect
mode. This proposal is separate from the diagnostic wheel and remains uninstalled.

The private repeat observer also now exempts only the preceding settling fault
fenced by an acknowledged Stop; saved-receipt replay verifies that current faults
and unknown outcomes still abort. The original hardware script/receipts are
preserved. This pass made no robot requests, restart or movement. It establishes
no yaw-cause or physical improvement, and changes no browser motion gate or hosted
publication. Phases remain sequential and same-profile replies lack a transaction
nonce; future measurements must retain those limitations.

## Disabled servo-loop deployment

On October 14, the exact diagnostic-only candidate passed 1,239 isolated checks
on the robot's ARM64 runtime: 729 installed-package ASGI checks and 510 strict
schema checks. The production native binary loaded, but these tests used inert
backends and constructed no motor controller. This establishes ARM execution,
not physical bus compatibility by itself.

A package/configuration backup was verified on both machines before stopping the
daemon without requesting Sleep. Installation changed six reviewed payload files
and their two installed RECORD files. All 496 candidate payloads and installed
RECORD mappings were verified before startup. The unchanged launcher explicitly
disabled startup Wake; the daemon returned ready with disabled motors. The body
mode correction remains a separate, uninstalled proposal.

Three live servo-loop reads then succeeded through the existing controller owner,
interleaved with goal/present reads and bracketed by ordinary state and metadata.
Loop sequences advanced from 3 to 5 to 7. HTTP reads took 22–27 ms, with native
read intervals of about 12 ms. All seven observed motors retained model 1200 and
firmware 53; the fixed register spans worked for these disabled-state samples.

| Observed register | Values across the three loop samples |
| --- | --- |
| Operating / drive mode | 3 / 0 on every tested motor |
| Position P gain | 200 on one motor, 300 on the other six |
| Position I / D gains | 0 / 0 on every tested motor |
| PWM limit / Goal PWM | 885 / 885 |
| Current limit / Goal Current | 1750 / 1750 |
| Profile acceleration / velocity | 0 / 0 |
| Present PWM / current | 0 / 0 |
| Goal / trajectory / present position | Equal in each disabled-state sample |
| Voltage / hardware error | 7.4–7.5 V / input-voltage status 1 |

The [ROBOTIS register documentation](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/)
identifies mode 3 as position control. Its output is limited by Goal PWM; Current
Limit and Goal Current have different roles in torque and current-based position
modes. Profile velocity zero denotes an unbounded profile velocity, not a command
to remain stationary. Zero integral gain is consistent with proportional-control
static error, but these sleeping samples do not demonstrate that cause, output
saturation or the settings during earlier yaw trials. Small raw velocity readings
were retained rather than treated as proof of motion or discarded.

All phase Alert bits remained explicit. Final metadata reported torque disabled
on all seven motors. A 30-second read-only window retained fresh identity/version,
advancing joint-cache timestamps, a stable daemon owner and no active app or move.
No Wake, movement, Stop or Sleep command was sent, and no motor gain, limit, mode,
calibration or firmware setting was changed. These observations have no new visual
confirmation and add no physical arrival, moving-response, hosted or phone evidence.
The diagnostic-only patches are installed; private backups and raw receipts are
retained. The next useful moving capture would compare goal, trajectory, measured
position and signed output while preserving the existing settling guards. No yaw
cause or physical improvement is established, and the hosted publication is unchanged.

## Moving servo-loop comparison

A subsequent October 14 local capture explicitly Woke the robot before a roughly
12° yaw change at 5°/s. The first capture's timing gate withheld its head command;
its command list is empty and its acknowledged Stop/Sleep receipts are preserved.
A fresh capture then started yaw immediately after read-only diagnostic admission.
The operator did not watch either turn; only the final asleep, settled state was
later visually confirmed.

The full 11.7° yaw destination was acknowledged from a measured starting yaw of
about −0.3°. The local freshness guard interrupted settling with retained measured
yaw about 6.5°, combined angle error 5.35° and translation error 1.68 mm. The fault
was **stale-status**, with settling time remaining; it was not an arrival or an
`unsettled-target` timeout. The measured pose is feedback retained in that fault
record, not an independent physical observation at the exact fault instant.

Three repeated brackets with unchanged destination pose and requested joints
produced the following comparison across all seven tested motors:

| Comparison | Observed result |
| --- | --- |
| Converted daemon target → servo goal | Exact count agreement |
| Servo goal → internal trajectory | At most 2 encoder counts apart |
| Servo goal → measured position | Up to 48 counts apart |
| Present PWM in these brackets | Maximum absolute raw value 56 of cap 885 (6.33%) |
| Position gains / operating mode | P 200/300, I/D 0, mode 3 |

Across the full capture, signed PWM ranged from −47 to 63 and raw input current
from −29 to 34. All sampled moving metadata showed enabled torque and only the
retained input-voltage error. No native execution or IK failure was reported in
the bounded journal. These observations put the sampled trajectory much nearer
the accepted destination than the measured position, with output below the PWM
cap. Sparse samples cannot exclude brief saturation, and low output with position
error does not establish a mechanical or gain-related cause. No gains, limits,
mode, firmware or calibration were changed; the mode proposal remains uninstalled.

Stop was acknowledged immediately after the observer failed. The first Sleep
observer sent no command because it rejected the historical stale-status fault
despite fresh ready/idle state after Stop. A Sleep-only observer then accepted that
preceding fault only when fenced by the acknowledged Stop's epoch and completion
time; current recovery, readiness, ownership and unknown-outcome gates stayed
unchanged. Nineteen offline saved-receipt checks verify this cleanup distinction.
Sleep was acknowledged and independent local/remote 30-second windows passed with
disabled motors and zero sampled torque bits. The capture itself finished before
Sleep; the separate cleanup receipts establish the final state.

A later read-only bridge snapshot took 1.31 seconds and failed freshness admission;
subsequent bridge and daemon status reads again confirmed disabled, ready and idle
state. No command was sent during this check. The moving stale-status event used
a cached snapshot whose start was more than 500 ms old while a replacement read
was pending. This is a timing observation, not evidence that diagnostic reads
caused the delay or that Reachy lost network access. The freshness limit was kept.
Private raw traces retain all stages and limitations; the owned bridge and leases
were cleaned up. No hosted or phone validation or website publication was added.

## Offline proportional-output and freshness follow-up

The fixed-profile decoder preserves raw gain, signed PWM/current and signed
position/trajectory bytes; an independent audit found no software scaling defect.
The [ROBOTIS gain documentation](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#position-pid-gain80-82-84-feedforward-1st2nd-gains88-90)
defines the controller P gain as the table value divided by 128. It does not
establish the complete firmware conversion from an encoder-count error to the
raw PWM register. Applying that gain directly to the larger captured errors
gives the following comparison, with that unit assumption explicitly unverified:

| Trajectory minus present counts | Naive `(300 / 128) × error` | Observed raw PWM |
| --- | --- | --- |
| 18 | 42.19 | 21 |
| 33–35 | 77.34–82.03 | 38–41 |
| 48 | 112.5 | 56 |

The larger positive pairs happen to fit half those naive products. That is an
empirical fit, not a verified firmware formula: the negative one-count pairs
do not follow it exactly. Neither rescaling the readback nor doubling gains is
justified. Even the naive largest product is only 12.71% of cap 885. Forty-eight
counts describe about 4.22° at one servo, not head yaw. Proportional holding under
load/friction remains a hypothesis; no gain, limit or motor-mode change was made.

The saved freshness trace gives a concrete scheduling problem: a 131 ms completed
batch was 525 ms old by its start time when the guard fired, while a replacement
323 ms batch was still pending. The replacement finished 60 ms after the fault.
Both read durations were below 500 ms; their scheduling gap still expired the
cached start-age. This does not establish why the HTTP reads took that long.

Local motion workers now share a sequential monitor with at least 100 ms between
attempt starts, replacing the fixed 250 ms interval. Slow reads run back to back
without accumulating monitor waiters or overlapping mandatory batches. Cleanup
stops rescheduling, including after an in-flight read completes. Stale fault
details freeze cached age/read duration and pending-read age separately. The
500 ms start-age limit, command epochs, ownership, recovery, omitted targets,
bounded slew and combined measured arrival gates remain unchanged.

Six deterministic offline cases reproduce the old timing failure, verify the
earlier polling, retain rejection/no stale writes for a 700 ms read, and cover
coalescence, minimum spacing, rejection cleanup and close during a pending read.
The monitor may now attempt 10 reads per second instead of 4, potentially increasing
mandatory GET traffic from 20 to 50 per second on fast responses. This trades
polling load for less scheduling slack; hardware load effects and physical head
response remain unvalidated. The isolated 1.31-second read still exceeds the gate
and is not repaired by this scheduling change. This pass contacted no robot and
installed no packages or settings; the mode correction remains separate and
uninstalled. The hosted publication is unchanged.

## Disabled polling load qualification

On October 14, the production local monitor and status-read path were exercised
against daemon 1.10.0 with motors disabled. Five 30-second phases compared the
previous fixed 250 ms schedule and the new sequential schedule in old/new/new/old
order, followed by the new schedule with bounded native diagnostics. The adapter
and request allowlist permitted only GETs; no motion worker was started. Warmup
requests were excluded consistently from the load measurements.

| Phase | GET/s | Median / p95 / max snapshot ms | Largest sampled cache start-age ms |
| --- | --- | --- | --- |
| Old, first | 20.25 | 31 / 39 / 70 | 317 |
| New, first | 47.56 | 36 / 51 / 95 | 196 |
| New, second | 48.31 | 31 / 40 / 96 | 180 |
| Old, second | 20.22 | 34 / 56 / 92 | 342 |
| New with diagnostics | 48.71 | 32 / 49 / 214 | 305 |

All requests succeeded. No recorded batch or sampled cache age exceeded the
unchanged 500 ms limit, and mandatory batch concurrency stayed at one. The last
phase added 18 servo-loop and 6 metadata reads through the existing serial owner,
with at least 1.25 seconds from one diagnostic completion to the next start.
All ten metadata samples across admission, load and final checks reported zero
torque bits for all seven motors. Every daemon sample reported disabled motors;
the final independent 30-second window also retained free ownership, advancing
joint-cache timestamps and the same daemon process and diagnostic payload hashes.

Daemon statistics reported zero loop errors. Deduplicating their approximately
once-per-second reports gave median loop frequencies of 49.32 and 49.23 Hz in
the old phases, 48.93 and 48.83 Hz in the new phases, and 48.85 Hz with diagnostics.
The largest reported loop intervals were 26.75/27.62 ms in the old phases and
34.46/31.57/33.48 ms in the new phases. These are descriptive sequential samples,
not proof of a causal or statistically significant slowdown. They do not support
a claim of zero load impact.

Cache maxima are sampled, with actual observer gaps up to 69 ms. Reconstructing
the preceding cache age immediately before recorded status replacements gave
321/203/196/343/317 ms in phase order, also below the gate; this is not a continuous
measurement. The test qualifies only this disabled workload on the observed
robot, firmware and network. It adds no moving settling evidence, explanation of
the original stale read or yaw shortfall, or hosted/phone/audio/video validation.
Retained input-voltage alerts remain explicit; zero sampled errors or torque bits
are not a general motor-health guarantee.

No Wake, movement, Stop, Sleep, daemon restart, package installation or motor
setting change was sent. The mode correction remains separate and uninstalled.
The sampler exited, outstanding reads drained and the exclusive robot lease was
released. No new visual confirmation or website publication was added. Raw
receipts and independent review remain private.

## New polling yaw capture

On October 14, the user explicitly authorized one unattended local capture with
Wake first and Sleep afterward. The roughly 12° yaw change used the previously
observed visible test range, but this turn obtained no visual confirmation.
Fresh identity/version, disabled torque, ownership and installed-payload checks
passed before Wake. Wake was acknowledged and independent awake/servo checks
passed before yaw. No package, gain, limit, calibration or servo operating-mode
change was made; the mode correction remains separate and uninstalled.

Measured starting yaw was −0.65° and the complete +11.3° destination was acknowledged
at a requested 5°/s limit. Retained feedback at the settling guard was +6.28°,
with combined angular error 5.24° and translation error 1.84 mm. The fault was
**unsettled-target**, with no settling time remaining and post-write feedback.
It was not a stale-status failure or successful arrival.

| Quantity during the 10.011-second motion-monitor window | Observed result |
| --- | --- |
| Bridge GET starts, including capture-observer and guard callers | 626, or 62.53/s |
| Mandatory batches / maximum concurrent batches | 124 / 1 |
| Snapshot median / p95 / maximum duration | 24 / 34 / 45 ms |
| Largest sampled cache start-age / largest observer gap | 159 / 36 ms |
| Largest reconstructed age before a recorded replacement | 167 ms |
| Recorded batches or sampled ages exceeding 500 ms | 0 |
| Distinct daemon statistics reports / median loop frequency | 11 / 49.13 Hz |
| Largest reported loop interval / reported loop errors | 28.90 ms / 0 |

The GET rate includes external status callers; the monitor's own ten-attempt-per-
second schedule is not a total caller-rate limit. The separate SSH capture used
localhost GETs and added daemon load beyond this bridge count. Cache ages are
sampled or reconstructed in the local clock domain, not continuous sensor-age
measurements. Statistics reports repeat across polls, and passive logging adds
timing overhead. The trial supports freshness under this particular workload;
it does not establish that earlier delays are eliminated or that other loads pass.

Nine servo-loop reads and four moving metadata reads produced three destination-
stable loop brackets. All seven goal registers exactly matched the converted
daemon targets; internal trajectories were at most 2 encoder counts from goals,
while measured positions were up to 48 counts short. Sampled PWM in those brackets
was at most 56 of cap 885 (6.33%); across the full capture PWM ranged from −50 to
63 and raw input current from −29 to 33. Mode 3, P gains 200/300, I/D gains zero,
limits and retained input-voltage alerts were unchanged. No native execution or
IK failure was reported in the bounded journal. Non-atomic, sparse brackets do
not exclude brief saturation or establish the physical cause of the shortfall.

The guard applied its existing measured hold. Distinct Stop and Sleep commands
were acknowledged, with Sleep admitting only the older settling fault fenced by
the acknowledged Stop's epoch and completion time; current readiness, ownership,
freshness and recovery gates stayed intact. Local and independent remote
30-second observation windows reported disabled motors; three final raw metadata
samples reported zero torque bits. These were discrete telemetry observations,
without visual confirmation. The same daemon owner and diagnostic hashes were
retained. All 971 traced requests and 160 batches had terminal records, with no
request/batch errors or dropped logs and all optional/mandatory reads drained.
The owned bridge and capture helper exited and both leases were released. No
hosted, phone or media validation or website publication was added.

## Offline quantized-output comparison

The October 14 follow-up compared the two saved servo-loop captures without
contacting the robot. All 42 destination-stable motor observations across six
brackets fit this empirical integer model exactly:

```text
raw PWM = floor(raw P gain × (trajectory counts − present counts) / 256)
```

Thirty-three observations have nonzero error, representing only six distinct
nonzero gain/error/PWM triples. With P 300, these are −1/−2, 12/14, 18/21, 33/38,
35/41 and 48/56. The earlier interpretation omitted integer quantization: flooring
the negative one-count product gives −2, so that case does fit. Across all 196
loop observations, 193 fit and three differ by −1 raw PWM. The wider data include
changing targets and non-atomic observations. This improves the empirical fit;
it does not verify firmware scaling, establish the physical cause or justify
rescaling readback, doubling gains or adding target compensation.

[ROBOTIS documents](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#position-pid-gain80-82-84-feedforward-1st2nd-gains88-90)
the controller P gain as table P/128 and PWM output limited by Goal PWM. That does
not establish the complete encoder-count-to-raw-register conversion used above.
Captured position I/D and feedforward gains were zero. Goals were inside the
configured position limits, trajectories were within two counts of goals, and
the sampled PWM was well below its cap. Proportional holding under load/friction
remains a hypothesis; no software delivery or decoder defect was demonstrated.

Raw velocity was not globally stuck or unsigned: cleanup samples contain negative
and larger positive values. Near-rest samples nevertheless report raw velocity 1
while sampled encoder positions remain unchanged. The
[documented velocity unit and threshold](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#moving-threshold24)
do not make that evidence of sustained physical rotation. No subtraction, scaling
or velocity-based arrival exception was added. The mode proposal remains separate.

`tools/Analyze-Servo-Trace.mjs` provides repeatable, offline-only comparison of
saved native captures and their acknowledged yaw receipts. It separates converted
goal delivery, trajectory/position error, sampled caps and provisional model
residuals; malformed or mixed brackets remain excluded/unknown. It requires valid
native timing/sequences and one unambiguous same-epoch destination, preserves raw
values, and creates a new output only beneath the existing ignored `local/` tree:

```sh
node tools/Analyze-Servo-Trace.mjs --capture local/capture.json --yaw local/yaw.json --output local/comparison.json
```

The tool imports no robot controller and sends no requests. Offline tests cover
negative flooring, mismatched output, absent/mixed evidence, signed bounds,
timing/sequence rejection, command ambiguity and private output/overwrite checks.
No gains, limits, operating mode, motion gate, package or robot state changed in
this pass. It adds no physical-response or hosted validation.

## Static-error investigation and next test plan

Offline inspection found a 54-count goal/present gap already present at the
nominal Wake destination. Four native observations spanning about 30.32 seconds
had unchanged sampled goals and positions. Earlier positive and negative yaw
trials shifted the largest gaps between different joints, but their complete
Cartesian targets differed. Neither result proves load, friction or calibration
as the cause. Servo-level gaps cannot be explained by head FK alone.

The [reversible test plan](STATIC_ERROR_TEST_PLAN.md) first compares unchanged
settings at one frozen six-axis destination approached from measured positions
on opposite sides, with a repeat of the first direction. Failed waypoints/arrival
end the comparison through existing Stop/Sleep cleanup; they do not authorize
an automatic return. A later P-only RAM A/B/restored-A comparison is conditional
on a separately qualified owner transaction with verified readback/rollback.
Enqueue success and restart are not rollback evidence. Its concrete gain remains
unset; no settings runner, hardware action or mode correction was added.

## Unchanged-gain matched-approach attempt

The subsequent October 14 device run was explicitly authorized without visual
attendance. Wake was sent first and confirmed by telemetry. The private runner
froze all six measured head coordinates and the body-yaw target, then submitted
the first waypoint 3° below the frozen yaw at unchanged 5°/s and 1 mm/s limits.
The exact complete endpoint was acknowledged, but measured arrival failed.

At the retained `unsettled-target` fault, requested yaw was −3.170° and measured
yaw −1.960°, compared with a −0.170° baseline. Combined angular error was 1.212°
against the unchanged 1° limit; translation error was 0.458 mm against 1 mm.
This was post-write feedback at the end of the settling window, not a stale-status
fault. The observer's earlier 1.111° error is a different measurement.

The failed waypoint ended the sequence. No common-target return, opposite-side
waypoint or repeat was submitted. Thus the
[matched-approach experiment](STATIC_ERROR_TEST_PLAN.md) remains incomplete and
provides no direction, hysteresis or holding-load comparison. No arrival gate
was relaxed, failed target enlarged or destination automatically retried.

Four destination-stable native brackets showed exact agreement between all seven
converted joint targets and servo goals, with matching body targets. Maximum
goal/trajectory difference was 2 counts; maximum goal/present difference was
13 counts. Sampled PWM in those brackets peaked at 17 of cap 885 (1.92%). All
28 motor observations fit the provisional integer-floor model. Nine loop reads
and three moving metadata reads retained mode 3, P 200/300, zero I/D/feedforward
gains and the existing limits. No native execution or IK failure was reported in
the bounded journal. Sparse, non-atomic samples neither exclude brief saturation
nor establish the physical cause of the shortfall or justify changing gains.

During the 10.017-second motion-monitor window, bridge GET traffic averaged
60.50 requests/s, including guard/observer callers. Mandatory batches did not
overlap; the longest read was 47 ms and maximum sampled cache start-age 166 ms,
below the unchanged 500 ms freshness gate. Separate localhost capture GETs added
daemon load. Sampled ages and daemon statistics are not continuous sensor-age
measurements or evidence that wider browser/media workloads pass.

The existing measured hold completed, followed by distinct acknowledged Stop and
Sleep commands. Final local and independent remote observation windows reported
disabled motors; three final metadata reads reported all torque bits zero.
There was no visual confirmation. All 851 traced requests and 154 batches had
terminal records, with no errors or dropped events and all reads drained. Owned
helpers exited and both leases were released. The same daemon owner and qualified
payload hashes were retained; no gain, limit, mode, package, restart or network
change was made. The mode correction remains separate and uninstalled. No hosted,
phone, media or publication validation was added.

## Offline first-waypoint settling history

The next October 14 pass replayed the saved first-waypoint trace without contacting
the robot. The full endpoint acknowledgement preceded the retained fault by
9.207 seconds. All 108 distinct, admitted post-acknowledgement snapshots remained
outside the unchanged arrival criteria: combined angular error ranged from
1.101° to 1.272°. Mean error in the first and last three-second windows was
1.187° and 1.180°, respectively. The largest distinct-snapshot gap was 138 ms.
These sampled observations show little net convergence across the window; they
do not support a longer timeout as a demonstrated fix.

Four target-stable native brackets span 5.629 seconds between read starts. Goals
and internal trajectories were unchanged in those samples. Five measured motor
positions were identical across samples; the other two varied by one encoder
count each. Sampled Moving values were zero, while goal/present gaps remained
up to 13 counts and PWM up to 17/885. This is a sampled plateau, not proof of
continuous immobility or a particular load/friction mechanism. Servo Moving or
In-Position flags do not replace Cartesian measured arrival.

Offline replay through the cached Windows kinematics model reproduced the saved
inverse-kinematics joint targets within numerical precision. Forward kinematics
of those exact joints differed from the Cartesian request by about 0.002°;
forward kinematics of the quantized servo goals differed by about 0.224°.
Measured encoder counts instead produced 1.114–1.209° of modeled error, consistent
with the observed shortfall. Goal quantization therefore does not explain the
whole gap. These are model calculations, not independent physical sensing,
calibration verification or a new ARM runtime test. Numerical seed differences
remain recorded privately. No target rounding or feedback correction was added.

`tools/Analyze-Head-Settling.mjs` now summarizes saved local settling history. It
requires one unambiguous head-target request and a matching acknowledged endpoint
and retained fault. It verifies input/result/write/fault epochs, exact pose/matrix
agreement and acknowledgement chronology; it recomputes error from measured axes.
Pre-acknowledgement, stale, blocked, recovery and changed-target observations stay
excluded. Consistent snapshot starts are deduplicated; conflicting duplicates
fail analysis rather than allowing one copy to create false arrival evidence.
It reports sampling gaps, early/late error distributions and per-axis spread.
Short or sparse coverage leaves the window comparison unknown. All durations use
the saved bridge clock, without subtracting native/daemon timestamps.

```sh
node tools/Analyze-Head-Settling.mjs --trace local/trace.jsonl --motion local/motion.json --stop local/stop.json --output local/settling.json
```

The trace uses the saved passive observer's `status` records; the motion receipt
contains a single head-target in `commands` or `phases`. Stop supplies the retained
fault. The analyzer imports no controller, performs no network reads or writes
and creates a new output only under the existing ignored `local/` tree. It is
diagnostic tooling, not an armed runner or automatic plateau classifier.

Eleven new offline tests cover convergence, oscillation, duplicate conflicts,
stale/pre-acknowledgement samples, epoch/target ambiguity, mixed measurements,
chronology, insufficient coverage and private output/overwrite guards. No
delivery, decoding or premature-timeout defect was demonstrated by this pass.
The 1°/1 mm arrival criteria, freshness, deadlines, command conversion and recovery
remain unchanged. No gain, limit, mode, package, daemon restart or robot movement
occurred. The mode correction remains separate and unchanged; the incomplete
matched-direction experiment does not qualify the conditional gain stage.

## October 17 vertical direction and coordination findings

The later attended [vertical speed experiment](MOVEMENT_COMPARISON_MATRIX.md#october-17-vertical-speed-and-direction-experiment)
completed all four legs at nominal 15, 10, 2 and 1 seconds. The operator found two
seconds quite smooth and one second good, with upward motion generally smoother
than downward. Faster motion retained the same directional static error: neutral
from below ended roughly 2.39–2.63 mm low, while neutral from above ended only
0.07–0.09 mm low. Combined pose errors and actual starts remain separate records.

The observed neutral goal-register vectors were identical from both directions
within every condition. Converted targets matched those registers. Poor returns
retained up to 63 counts of measured joint error while sampled PWM stayed below
8.4% of its cap and internal trajectories were within two counts of goals. This
adds evidence of direction-dependent following error, not a proven mechanical
cause or gain remedy. Tiny daemon endpoint interpolation residues, below
0.000064 mm in the one-second run, cannot explain the millimeter-scale shortfall.

Source review found grouped six-motor goal writes, not six sequential head
commands. An offline ideal-50-Hz/count model of the same saved actual-start curve
predicts staggered count changes at slow speed; the ideal symmetric pure-Z curve
does not predict unequal count-change timing across motors. The model describes
references, not actual bus or physical motor response. Existing sparse register
brackets cannot measure inter-motor timing through a movement. The subsequent
[bounded trace](JOINT_TRACE.md) of computed goals, write execution and cached
feedback is now installed after ARM/runtime and disabled-only checks; physical
movement capture is pending. No faster ordinary browser mode was deployed, and
mode correction stays separate. The following October 16 sections retain history.

## October 16 measured-hold roundtrip investigation

A wider movement survey exposed accumulated body-yaw drift across measured
holds. In one small-pitch batch, admission feedback changed from −0.176° to
−0.527°, exceeding the matched experiment's unchanged 0.25° body-alignment rule.
This is separate from head arrival and from the earlier network failure.

An offline reproduction extracted the exact pinned `AnglePosition` conversion
above. Decoding raw encoder count 2044 and immediately encoding that angle gives
2043: the intermediate floating-point value is 2043.9999999999998 counts and the
conversion truncates it. Across all 4,096 single-turn counts, 558 roundtrips lose
one count. This demonstrates a numeric roundtrip defect relevant to measured
holds. The saved samples do not prove which hold writes caused the whole observed
body drift, and a one-count effect does not explain the much larger head residuals.

A private, uninstalled numeric candidate snaps only machine-precision integer
boundaries before retaining the existing truncation elsewhere. Three extracted
Rust checks pass: every single-turn encoder count, signed counts from −8192 to
+8192, and non-boundary fractional targets across that interval. An initial
candidate used too small an error scale near zero; the corrected candidate accounts
for cancellation against the full-turn offset. These are standalone numerical
checks, not a complete package build, ARM qualification or physical fix. No
conversion change, gain change or separate mode correction was installed.

The independent range survey uses a separate body-relative coordinate policy.
Each leg binds fresh measured body yaw and rotates its preplanned head orientation
and lateral translation with that heading. Exact derived matrices and body targets
are retained per leg; those legs must not be called identical-body comparisons.
The survey permits up to 20° accumulated heading change. Ordinary controls and
fixed comparisons retain the 0.25° per-command reference check. The survey's
explicit local constructor policy permits 2° per leg; browser commands cannot
select that policy. Freshness, ownership and recovery remain separately enforced.
Model checks across the permitted heading range
preserve Stewart-joint goals and the reviewed register margins. The fixed-target
experiment keeps its original stricter alignment rule.

For this independent survey, a controller arrival that leaves tolerance during
native confirmation is recorded as `arrival-not-sustained`, with measured error
and matching native evidence. It is not counted as successful sustained arrival.
A later target still needs confirmed Stop and fresh admission. Unknown writes,
other faults and missing native confirmation remain failures; no target is replayed.
## October 16 Sleep-centering comparison

The operator reports that Sleep first visibly returns to center reliably, unlike
the independent survey's neutral returns. The later attended comparison again
looked better during Sleep. The operator also described our movements as jittery,
with apparently poorly coordinated actuator response, while Pollen Wake/Sleep
look smoothly coordinated. This observation distinguishes visible motion quality
from final-pose error; it does not measure individual motor start times. Final
disabled telemetry describes the folded pose, not its earlier center.

Offline inspection matched the backend, movement router and goto implementation
hashes against the installed package's final read-only inventory. The installed
`goto_sleep` calls secondary-aim quiescence, then, when its distance from init is
above 30 magic units, moves to the identity head matrix with body yaw zero and
initial antenna positions. That segment uses a one-second minimum-jerk trajectory
inside the daemon, evaluated at a nominal 100 Hz, followed by a 0.2 s pause. Sleep
then folds over two seconds and later disables motors. Its completion does not
require the browser's combined 1°/1 mm measured arrival criterion.

The survey's neutral matrix is also identity except for its retained measured body
heading (−0.176° in an earlier batch). Its six-axis linear ramp is streamed over
HTTP from the PC, with nominal 20 ms steps, 10°/s and 5 mm/s limits. It submits the
exact endpoint and then checks fresh measured arrival. Both paths ultimately use
the same backend head-target setter, IK and motor controller. The earlier negative
and positive roll returns retained −4.38° and +4.63° roll respectively, with about
5° combined angular error. Their complete endpoints were acknowledged.

The next useful comparison should bind the exact same neutral matrix, body target,
start pose, antenna policy, capture and original gains across streamed and
daemon-local trajectories. Record measured center before any folding/Sleep, as
well as target joints, servo goal/trajectory/present positions and PWM/current.
Compare the existing slow ramp against the daemon-local minimum-jerk path; separate
path location from duration/easing in later arms if a difference appears. Keep
secondary aim sources equally quiescent. Do not treat a task UUID, timed completion
or visual centering as measured settling. The installed HTTP goto router accepts
an interpolation field but does not forward it, so a requested linear/minjerk flag
alone cannot establish different daemon interpolation in a comparison.

The final attended pair used the exact identity matrix and body target zero for
the streamed return, then another +30° roll start before final Sleep. Measured
starts differed by 0.939° combined angle and 0.349 mm, within the exploratory
matching rule. The streamed return retained 4.670° roll, 4.768° combined angular
error and 2.628 mm translation error. It failed arrival. Starts were similar,
but easing, duration, antenna targets and secondary-aim policy were not controlled
across paths; a causal comparison is not qualified.

The Sleep observer captured one native bracket before receiving HTTP 503, 292 ms
after its preceding native completion. No native bracket covered the center
dwell. Source inspection found that the observer's 250 ms register cadence
violates the native reader's shared one-second cooldown. The route translates
read exceptions to generic 503, so rate limiting fits the source and timing but
the exact underlying exception is unrecorded. Timed Sleep completion and the
operator's better-centering observation do not establish measured arrival.

The private observer has an offline correction: separate 250 ms fresh
identity/version/pose sampling from native requests spaced at least 1.25 s after
completion, respecting the previous phase's shared cooldown. A failed native read
disables further native requests while independently fresh poses can continue;
pose admission failure ends observation. Neither case cancels or replays Sleep,
clears hardware faults or changes motion admission. Ten targeted offline checks
passed, including prior cooldown, the native failure, identity/staleness rejection,
unknown Sleep and actual-controller final ordering/drain. This observer revision
has not been tested on the robot.

The same installed-matching backend supplies both inputs to the same IK and
native motor path. Our slew function uses one progress scale for all six pose
axes, and the native controller writes all six linkage-motor goals in one
synchronized packet. This does not guarantee identical physical response, and
body yaw travels through a separate command in both paths. The observation does
not establish sequential per-linkage motor writes. Plausible differences remain
PC/HTTP pacing, abrupt linear-ramp velocity changes, quantized small goal steps,
speed-dependent friction/load response and secondary aim sources.

The next focused experiment should compare matched, clearly visible poses at
nominal height in one awake session, with original gains/mode and no shell-edge
targets. Compare a common-clock PC minimum-jerk trajectory with the daemon-local
minimum-jerk goto at the same duration; keep the existing linear arm separately
to distinguish easing from delivery. Choose durations that bound the eased
trajectory's peak speed, not just its average speed. Retain exact six-axis/body
targets, measured starts, read timing, ownership/cancellation and independent
arrival evidence. The installed goto router does not forward interpolation, so
its request field cannot establish a linear daemon arm. Do not replace live
retargeting controls with long-running goto tasks without qualifying ownership
and Stop behavior.

The physical session ended with native disabled and human normal/asleep
confirmation, helper drain/exit, an unchanged original 501-file audit and released
reservation. No tuning, mode correction, installed package change or new full
backup was part of these trials. The cause of jitter and static error remains
unresolved; the delivery-path comparison now takes priority over gain changes.


## Upward following asymmetry and Wake neutrality — October 18

The complete [vertical profile A/B/A](SERVO_PROFILE_EXPERIMENT.md#feedback-recovery-installation-and-complete-vertical-aba)
showed repeatable unequal joint following during upward motion. Rising to neutral
left about 4.7–5.0 mm / 4.6–4.8° of pose error; the following upper endpoint missed
by about 6.8–7.0 mm / 6.0–6.4°. Descending to the same neutral finished within
0.09 mm / 0.54°. These are measured-model residuals relative to one frozen actual
reference; that reference was not rebased to hide the misses. Candidate servo
profiles 42/13 did not clearly improve accuracy or visual jitter.

The installed Wake animation briefly rolls 20°, then commands the identity neutral
orientation in 0.2 seconds. A lasting tilt is not its intended endpoint. Saved
post-Wake FK observations still showed roughly 2.6–2.9° roll and 1.9–2.4° pitch.
Wake is useful for a repeatable initial condition, but is not a leveling or
calibration check. Unequal joint following, mechanical offsets and model calibration
remain distinct hypotheses; these observations alone do not select a correction.

## Offline upward-following and Wake audit, October 18

The twelve saved physical A/B/A traces were reanalyzed without contacting Reachy.
Within each condition, both neutral returns have the same complete requested
matrix, body reference and six encoded head goals. Each final two-second window
contains 100 aligned feedback reads; per-joint position variation is at most one
count. The body feedback is also constant within each pair. The following are
median **encoded goal minus cached position**, in six-head joint order:

| Condition | Rise to neutral, counts | Descend to neutral, counts |
| --- | --- | --- |
| A1 original | 18, −46, 32, −4, 81, −46 | 2, −1, 3, 0, 2, 1 |
| B profiles 42/13 | 14, −51, 33, −9, 81, −54 | 2, −1, 3, 0, 2, 0 |
| A2 original | 18, −49, 33, −4, 77, −50 | 2, −1, 3, 0, 2, 1 |

Thus the large upward discrepancy persists under a constant command; it is not
just the transient lag of a moving reference. A fixed encoder zero/FK calibration
offset alone cannot explain different cached joint positions at these identical
goals. Mechanical/calibration error could still coexist. The latest traces show
host grouped writes and cached feedback, not contemporaneous servo goal-register,
internal trajectory, PWM or current measurements; historical register brackets
remain separately dated evidence.

Offline Rust-kinematics 1.0.3 replay used the exact installed model hash. Saved
Wake software joint targets reconstruct nominal neutral within 0.003° / 0.002 mm.
Head-goal quantization adds about 0.15° / 0.006 mm; recorded joint feedback
reconstructs about 3.36–3.57° / 3.00–3.63 mm of discrepancy. Across the twelve
vertical endpoints, software goal reconstruction error is below 0.003° and head
quantization below 0.193°. Recomputed measured FK differs from saved FK by at most
0.073°; changing the replay seed changes its result by less than 0.002°.
Pose/joint snapshots are non-atomic, and model replay is not external metrology.
These tested software/numerical effects are too small to explain the recorded
multi-degree shortfall. No target offset or conversion correction is justified.

Power delivery and individual actuator/linkage problems remain plausible.
Earlier sparse captures showed ordinary supply readings and low sampled PWM
despite error; they cannot exclude short voltage dips, local connector resistance
or a mechanical fault. Pollen documents a 6.8–7.6 V robot input and explains the
known higher-voltage alert in its [hardware sheet](https://github.com/pollen-robotics/reachy_mini/blob/main/docs/source/platforms/reachy_mini/hardware.md)
and [troubleshooting guide](https://github.com/pollen-robotics/reachy_mini/blob/main/docs/source/troubleshooting.md).
The alert alone does not diagnose an inadequate supply. The next
[original-settings diagnostic capture](STATIC_ERROR_TEST_PLAN.md#power-and-actuator-follow-up-after-the-vertical-aba)
retains voltage, signed output, trajectory, goals and errors together before
choosing a remedy. No installed software, motor settings or mode correction was
changed during this offline pass.

## Attended vertical speed and electrical comparison, October 18

Original-settings daemon-local movements were compared at **15, 2 and 1 second**
per movement. Each condition used the same frozen complete measured head reference,
with vertical offsets −24 mm, neutral, +10 mm and neutral; each completed generator
was followed by ten seconds of observation. Body and antenna targets were explicitly
held at the frozen reference values. This ordinary goto path is distinct from the
preceding private head-only profile lease. Its default interpolation is minimum jerk.
The reference is an actual measured pose, not externally verified level.

Factory Sleep/Wake separated conditions, with visual Wake confirmation before
targets. The two faster conditions started within 0.35 mm / 0.37° of the frozen
reference. No profile, gain, mode, current/PWM/voltage limit, calibration, installed
package or service policy changed. Existing backups were reused; there was no
installation, daemon restart or additional full backup.

The following are **held endpoint residuals**, rather than errors at the instant
the generator completed. Linear error is the complete translation-vector norm;
angular error is relative orientation error. They are not just vertical error.

| Movement duration | Upward return to neutral, mm / ° | Further upward, mm / ° | Downward return to neutral, mm / ° |
| --- | --- | --- | --- |
| 15 s | 4.73 / 4.06 | 6.88 / 6.30 | 0.17 / 0.33 |
| 2 s | 4.17 / 3.41 | 6.85 / 6.09 | 0.18 / 0.34 |
| 1 s | 3.95 / 3.33 | 6.35 / 5.10 | 0.21 / 0.35 |

The repeated 15-second downward trial finished within 0.28 mm / 0.76°; its following
upward return again missed by 4.88 mm / 4.24°. The faster downward trials finished
within 0.27 mm / 0.87°. The operator described the slow movements as staggered and
very tilted, with no strain or contact; the two-second movements were “all better.”
One-second smoothness was good, while tilt seemed similar across all conditions.
These observations support a useful speed effect on appearance, without showing
that faster movement fixes the persistent endpoint error. This was one ordered
comparison with a slow repeated pair, not a randomized speed study.

There are **13 complete, coverage-qualified traces**, including the extra slow
pair: 10,751 complete frames and 11,119 native feedback events. All thirteen final
constant-goal windows qualify. Sampled cache completion age stayed below 30 ms.
The three conditions delivered identical servo goal-register vectors at the matched
neutral and upper targets. In the last two held register brackets at those targets,
internal position-trajectory values were within three counts of the corresponding
goal registers, while several measured positions remained tens of counts away.
The lower target retained up to nine counts of goal/trajectory difference; this
smaller firmware-side discrepancy remains recorded rather than treated as zero.

For example, the last two held loop brackets at the upper target reported these
median **goal register minus measured position** values in six-head motor order:

| Duration | Held error, counts | Held PWM, raw |
| --- | --- | --- |
| 15 s | 1, −52, 40, 0, 88, −72 | 0, −61, 44, 0, 103, −84 |
| 2 s | 2, −52.5, 42, 0, 88, −68 | 1, −62, 46, 0, 103, −78 |
| 1 s | 2, −52, 42, −1, 74, −63 | 1, −61, 46, −2, 86, −72 |

Half-count medians summarize two sequential register brackets, not fractional
encoder resolution. The six head motors use original position P=300, zero I/D
and feedforward, operating mode 3, drive mode 0 and zero profile fields. The body
P remains 200. Configuration, requested target and physical feedback remain separate.

The existing native owner supplied **140 bounded loop-register brackets**, spaced
at least 1.5 seconds after the preceding completion once capture scheduling was
corrected. Each includes surrounding fresh state samples, register goals, trajectory,
position, signed PWM/current, voltage and temperature. Only one ramp bracket per
movement was captured in each faster condition; fast peaks may be missed.

All sampled motor voltages stayed at **7.3–7.5 V**. Peak sampled head PWM was
121 raw against limit 885; held PWM peaked at 103. Peak sampled input-current
magnitude was 73 raw against configured limit 1750; held current peaked at 61.
These are raw register readings, not a shaft-torque measurement. Separate awake
metadata before and after the faster conditions confirmed all seven body/head
torque-enable registers set and only the known input-voltage alert.

There is no sampled evidence of sustained supply sag, PWM clipping, current-limit
clipping or an unfinished servo trajectory explaining these held misses. This does
not exclude short supply/connector transients, friction, load, actuator defects or
coupled mechanical effects. A position-loop/load equilibrium or hysteresis remains
a stronger working hypothesis than a missing browser target; its cause is unproven.
The largest-error motor alone does not identify a defective component.

The first slow down target was acknowledged, but its observer aborted after a
register read returned HTTP 503. The client had scheduled that read inside the
existing shared cooldown. Source/timing support an admission rejection; the generic
HTTP response did not retain the native exception. Read-only inspection confirmed
the same ready owner, no active task, stable fresh joints and the completed software
target. The incomplete trace remains excluded. The schedule was corrected without
changing native budgets or gates, and a new down/return pair replaced the missing
capture after the planned movements. No uncertain target was replayed, and this
pause caused no daemon restart or extra Sleep/Wake cycle.

Final readback matched all 505 installed files, the same loaded native image and
sole serial owner, original configuration, disabled torque and no pending transaction
or inhibition. Final Sleep was visually confirmed; the reservation was released.
No feedback-cache fault or local connectivity loss was observed in the completed
captures. This finite daemon-local session does not qualify hosted streaming,
long-term network recovery or physically induced feedback-fault recovery.

The next focused experiment should keep the two-second vertical sequence and
electrical/goal/trajectory readback, then compare original P with one reviewed,
modest reversible P-only setting. Its purpose is to test whether increased position
loop response reduces the held direction-dependent error; it is not an established
fix. Preserve the exact original backup, readback and restoration procedure. A supply
or connector transient needs suitable electrical measurement to rule it out; do not
infer that from sparse telemetry or change supply/voltage limits. Mode correction
remains a separate experiment. No follow-up tuning is authorized by this record.
The earlier P-gain transaction qualifies disabled-only maintenance. A later
[P-only motion handoff candidate](P_GAIN_TRANSACTION.md#october-18-p-only-motion-handoff-isolated-arm-qualification)
now has host and isolated ARM/PTy qualification, with a separate parameter scope
and unarmed motor-15 P300/P360/P300 comparison. It remains uninstalled; attended
installation and disabled overhead checks still precede physical comparison. The profile handoff used in the earlier
A/B/A does not by itself grant P-gain writes; no physical P-gain benefit is established.
