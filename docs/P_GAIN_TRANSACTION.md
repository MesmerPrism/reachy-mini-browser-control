# Reversible P-gain transaction: qualification record

## October 26 broader head-P screen: partial closeout

Separate motor-12 and motor-13 P300/P360 comparisons captured 20 scored legs;
four final motor-13 P300 control legs were withheld after feedback faults.
Motor 12 completed ABA and showed a modest position-residual improvement at
P360 with little angular improvement. Motor 13 completed A1/B only and showed
no clear whole-head benefit. Delivered goals differed by 1–3 counts, so these
results are descriptive rather than exact matched gain estimates.

An earlier acknowledged motor-13 P360 application produced no scored targets
and was exactly restored; its ACK-to-original-readback evidence interval was
about 446 seconds. An interrupted original-P acquisition and subsequent factory
Sleep/Wake centering remain separate from the scored data. Final original
restoration, feedback acknowledgement and explicit Sleep closed the round.
Existing backups were reused; mode correction and command continuity stayed
separate. No permanent gain or CPU scheduling change was adopted. See the
[dated result](STATUS.md#broader-head-p-screen--october-26).

The subsequently qualified [paired motor-15/16 comparison](STATUS.md#combined-motors-1516-and-serial-diagnostics--october-25)
adds an explicitly opted-in `position-p-pair` transaction with only P300/P420
on those two motors. Its durable attempted marker precedes either write, and
partial/unknown application requires exact original restoration of both. Single-P
and I authority remain distinct. Five single-upward conditions and a separately
scoped twelve-leg return/direction comparison completed; paired P420 improved
upward tracking with coupled joint tradeoffs. Original settings and final Sleep
verified. No permanent gains or mode correction were adopted.

The October 25 [adaptive follow-up](STATUS.md#adaptive-pi-diagnostics--october-25)
confirmed P360 and tested separately qualified motor-15 P420/P480. Single-upward
steady errors were 85/57/85, 85/42/86 and 85/33/85 counts in their respective
P300/candidate/P300 blocks. The compiled/daemon finite candidate list now includes
420/480 initially only for awake motor 15. A separately qualified extension now
permits awake motor 16 as well, with one selected P gain per transaction and
all other gains held original. Other joints still lagged; whole-head improvement
from P420 to P480 was small. Goal differences and pre-candidate recovery receipts
remain separate evidence. Original settings and final Sleep were verified; no
permanent setting or combined P/I capability was adopted.

The next [I0/I1 trial](I_GAIN_TRANSACTION.md) has separate authority and recovery
proofs. It keeps P300 fixed; it does not broaden this P-only transaction or
combine I and P changes.

Earlier physical result: the [completed common-start and matched A/B/A](#october-19-completed-common-start-and-matched-p300p360p300)
passed all three original-P300 acquisitions and all twelve scored vertical legs.
Motor-15 held errors decreased in P360 and returned to baseline in restored P300,
at identical delivered and read-back goals. The operator saw the same tilt trend.
Original settings and normal final Sleep are verified; other joints still lagged.
This is one ordered comparison, not a permanent tuning recommendation.

The amended [communication/common-start candidate](#communication-and-common-start-isolated-arm-runtime-october-19)
previously passed 68 Python cases on ARM and 14 native PTY cases, followed by
[attended installation and disabled checks](#communication-and-common-start-disabled-deployment-october-19).

Earlier physical result: the [October 19 same-image comparison](#october-19-same-image-p300p360-comparison-and-interrupted-a2)
completed A1 P300, B motor-15 P360 and one A2 P300 leg. The selected motor's
upward following error decreased at identical delivered/readback goals, but a
feedback fault interrupted A2. Gain benefit remains provisional. Original gains,
profiles and factory Sleep are confirmed; the guarded service is ready with
motors disabled and no pending transaction. The qualified restoration-only
encoder fix remains installed. The preceding
[installation/admission attempt](#october-19-attended-installation-and-withheld-comparison)
remains separately recorded as withheld before comparison movements.
The earlier [isolated ARM/PTy qualification](#october-18-p-only-motion-handoff-isolated-arm-qualification)
is synthetic evidence and did not establish physical admission.

Earlier physical P-write result: the [October 16 disabled changed-P device test](#october-16-disabled-changed-p-roundtrip)
passed P300 → P299 → P300 with exact original P/I/D and full observation readback.
That October 16 test restored its original diagnostic software and normal service.
Earlier sections below describe their dated candidate and qualification checkpoints;
the October 19 installed state supersedes their historical uninstalled statements.

An [offline campaign candidate](#october-16-reusable-trial-candidate) now removes
the entry's one-transaction-per-process restriction after verified restoration.
That dated reusable-trial candidate remains separate from the newer handoff
candidate below.

Prepared October 15, 2026. This private native-controller candidate is uninstalled.
No robot was contacted, restarted, woken or moved. No production motor or candidate
gain has been selected. The separate operating-mode correction is unchanged.

The [static-error plan](STATIC_ERROR_TEST_PLAN.md) still requires a separately
qualified experiment. The earlier facility verifies maintenance writes with disabled
torque. Ordinary control remains inhibited while changed gains are installed;
the facility does not provide the later A/B/A motion handoff.

## October 19 completed common-start and matched P300/P360/P300

On the installed communication/common-start image, an attended run completed
original-P300 acquisition before every condition, then the full A1 P300 / B
motor-15 P360 / A2 P300 comparison. One frozen full head pose and body reference
were retained. Each acquisition used the two qualified two-second local legs,
ten-second holds, 1,025-point actual-model reviews, measured staging at least
2 mm above neutral, and five stable fresh neutral samples. Original restoration
and resumed fresh feedback preceded scoring. The final acquired residuals were
0.16–0.22 mm / 0.54–0.66°; scored post-maintenance starts were
0.16–0.25 mm / 0.54–0.65°, inside the unchanged 1 mm / 1° criterion.
The +10 mm staging destinations themselves still undershot; passing acquisition
means verified approach history and final neutral, not exact upper arrival.

Every scored condition requested −24 mm, neutral, +10 mm and neutral with the
same two-second ramps and ten-second observation holds. Six acquisition and
twelve scored legs completed, with only planned original-settings Sleep/Wake
between conditions. No daemon restart or uncertain target replay was used.
All twelve scored trace/hold checks pass: **7,320 complete frames and 7,489
feedback reads**. Corresponding six-head delivered goal counts match exactly
across A1/B/A2; three held servo-register reads per leg independently match them.
Register brackets verify the selected P and unchanged profiles, modes, gains
outside the selected P, and protected limits.

| Upward leg | A1 P300 | B motor-15 P360 | A2 P300 |
| --- | --- | --- | --- |
| Return from −24 mm: motor-15 held error | 74 counts | 59 counts | 74 counts |
| Return from −24 mm: FK position / angle error | 4.96 mm / 4.16° | 4.17 mm / 3.29° | 4.97 mm / 4.19° |
| Upper +10 mm: motor-15 held error | 86 counts | 58 counts | 86 counts |
| Upper +10 mm: FK position / angle error | 7.18 mm / 5.97° | 6.21 mm / 4.60° | 7.19 mm / 5.92° |

Other upper-target joint errors remained large. For motors 11–16, median signed
delivered-goal minus cached-position errors were:

| Condition | Motor 11 | Motor 12 | Motor 13 | Motor 14 | Motor 15 | Motor 16 |
| --- | --- | --- | --- | --- | --- | --- |
| A1 P300 | 1 | −56 | 42 | 0 | 86 | −67 |
| B P360 on motor 15 | 1 | −52 | 42 | 1 | 58 | −65 |
| A2 P300 | 0 | −56 | 45 | 0 | 86 | −67 |

The operator reported upward tilt in A1, less in B and more again in A2, with
no concerns and normal Sleep after every condition. This reversal supports a
gain-dependent following-error component on this robot under these targets. It
is a single ordered A/B/A, with small coupled changes in other joints; it does
not establish a general tuning range, justify retaining P360, resolve mechanical
or calibration contributions, or certify a smoothness improvement. Pose errors
come from daemon FK. Sampled motor voltage was 7.2–7.5 V; fast transients remain
unmeasured. Earlier protocol scores are retained separately.

The moving sequence needed no feedback-fault recovery. An early known handoff
was followed by a transient HTTP 503 before any acquisition target; read-only
inspection confirmed the same healthy lease and no write was replayed. The
private wrapper's read-only handoff wait was corrected without changing motion
scope or the installed daemon. Two local receipt/setup integration errors were
also repaired without repeating preparation or a target. Failed receipts remain
retained. This does not explain the earlier intermittent native communication
fault or establish that the bus had no recoverable errors.

Final independent checks confirm the same owner and all 505 installed package
files, loaded native image, unchanged service/configuration, exact original
gains/profiles/protected settings, disabled motors, ready service and no pending
transaction or fault/admission receipt. Sampled final cache age stayed below
24 ms. The operator confirmed asleep and settled. Existing rollback archives
were reused; only the necessary small per-transaction preimages were copied.
No full environment backup, mode correction, higher gain or website publication
was introduced.

## Communication and common-start disabled deployment, October 19

The exact ARM-qualified native extension, typing stub and daemon maintenance
module are installed. Only these three members, both existing package RECORD
files and the private native-image pin changed. Existing verified rollback wheels
were reused; exact metadata, raw RECORD bytes and the small configuration preimage
were retained instead of another full environment backup.

Current identity/version, one physical serial owner, all 505 package hashes,
disabled readiness and original P/profiles/modes were checked before mutation.
One explicit daemon stop without Sleep, then one service stop/start, preserved
the existing no-startup-Wake and no-reboot policy. Loaded native mappings matched
the installed image. No Wake, Sleep, comparison target, maintenance gain/profile
change or mode correction was requested. The operator confirmed no movement.

The preceding disabled baseline sampled about 56% of one core. Subsequent
10-second trace off/on/off windows sampled approximately 59%, 62% and 54%;
cache age remained below 25 ms with no nonadvancing samples. The sealed trace
contained 506 consecutive published feedback events and no target or lost events.
It was exported and cleared after sealing. The finite windows do not separate
incremental diagnostic cost from system variation and do not qualify moving load.

Final read-only checks retained the sole owner, exact installed package inventory,
unchanged protected configuration except its intended native-image pin, ready
service, disabled motors, no pending maintenance and no fault/admission receipt.
This run did not reproduce the earlier communication fault or validate physical
acquisition. The scoped common-start entry remains a later original-P300,
actual-model-reviewed movement stage; its new approach history cannot silently
complete or pool with the earlier interrupted A/B/A.

## Backup, application and restoration

The facility is disabled by default and exposed only on the existing native
control-loop owner. There is no browser or HTTP gain route. Preparation locks
ordinary commands and polling, fences previously admitted generations and persists
a private unresolved marker before queue admission. A dedicated maintenance queue
uses the existing worker and serial port. It opens no second connection.

Two independent preparation snapshots check all seven head/body motors: reviewed
model/firmware/ID, raw torque-off bits, position mode, return policy, registered
instructions, errors and bounded voltage/temperature observations. Input-voltage
alerts require explicit opt-in; other hardware-error bits are rejected. Proposed
power/temperature windows are guards, not qualified supply limits.

The immutable backup contains exact identity, P/I/D, neighboring configuration
and control bytes, plus observed power/errors. It is synced and compared byte for
byte before mutation. Only one preselected Stewart motor's two-byte RAM P register
at address 84 can be written. The [manufacturer's control table](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/)
defines this register and its range. Fixture values are not tuning advice.

Application is admitted once per session. Queue admission, write acknowledgement
and independent readback are distinct evidence. Missing replies, partial writes,
expiry and cancellation never automatically replay the candidate.

Explicit restoration cancels queued candidates before admission, advances the
generation and executes after in-flight serial work on the same worker. It checks
the immutable backup and neighboring state, writes only the original two P bytes
if needed, then independently verifies original P/I/D and unchanged configuration.
Successful readback and terminal recording precede unlocking ordinary control.

A missing restoration acknowledgement retains inhibition. A later explicit request
can freshly confirm original P and close without another gain write. Terminal
filesystem failures are reconciled with exact session/state records and fresh
original readback. Once a terminal record exists, motor reconciliation is
read-only: differing P remains an error. A missing pending marker is re-established
before these reads to preserve crash inhibition if reconciliation fails.

An undispatched preparation can close as having no possible gain write; this is
not verified hardware restoration. Corrupt/missing backups, unexpected neighboring
state, stopped workers and failed readbacks remain inhibited. An unresolved marker
blocks later controller initialization before port opening or initialization
writes. Restart is not rollback. Recovery from disk alone is not implemented.

## Evidence and limits

Offline tests use an inert register bus with the strict Protocol 2 parser, exact
packets, real worker queue, public owner API and Python bindings. Faults cover lost
acknowledgements, rejected/partial writes, corrupt readback, in-flight cancellation,
queue pressure, stale generations, shutdown, wrong owners, journal tampering and
terminal failures. Source reversal and package checks verify rollback artifacts.
These do not establish physical register behavior, gain benefit or safe movement.

Each queued operation has a cooperative one-second deadline. Serial flush and
filesystem sync are not proven interruptibly bounded; a caller can time out while
the worker retains ownership and inhibition. Reads are sequential and non-atomic.
Replies lack nonces, some widths overlap ordinary diagnostics, and power reads
repeat a profile. Width checks do not prove universal late-reply correlation.
At most sixteen snapshots are allowed per session; exhaustion retains inhibition
and requires separately reviewed maintenance recovery.

Unix persistence syncs files and directory entries, including new ancestors.
Windows file sync supports the tested process-crash model; power-loss durability
is not claimed. Integrity checks detect accidental corruption, not malicious
device impersonation. Process-local fencing does not replace exclusive device
coordination with other programs.

Normal queue-full admission now rejects immediately instead of blocking. A second
controller for the process maintenance root is rejected, and suspended sampling
is reported explicitly. These compatibility changes need runtime qualification.
ARM cross-builds do not verify ARM execution, the serial bus or read timing. Daemon
and browser code, admission/arrival gates and the published website are unchanged.
A future gain/motion handoff and concrete experimental value need separate review
and authorization.

## October 15 ARM runtime qualification

The exact candidate ARM64 binary loaded on the robot's Python 3.12 runtime in a
temporary overlay, without installation or daemon restart. Five private
pseudo-terminal servo cases passed 95 checks: normal backup/application/restoration,
preparation/restoration, lost candidate acknowledgement, lost restoration
acknowledgement and rejected candidate. Every fixture's full register image was
restored; lost replies caused no candidate or redundant restoration replay.
Separate inert daemon/schema tests passed 729 and 510 checks.

The production constructor and worker used only the newly generated PTY, retained
by its slave descriptor and checked by canonical path/device/inode. The emulator
rejected reboot, torque, mode, position and nonfixture writes. Native-open tracing
observed the private PTY open and no physical serial opens or network connects in
these cases. Execution used the existing private runtime as root: path confinement
and trace evidence are not an OS device sandbox. The exact imported binary hash,
private Unix journal permissions/backup bytes and final fixture bytes were checked.

Real daemon PID, installed payloads, unit/configuration and sampled disabled state
were unchanged. Validation children, scratch directories and owned staging files
were removed. No physical gain write was performed, and no Wake or movement command was sent.
The mode correction was excluded.
This qualifies compiled ARM software against an emulator, not the physical bus or
transaction timing. The daemon still runs the preceding diagnostic binary.

A disabled-only hardware plan and callable are staged privately and unarmed.
They require a separately qualified deployment and authenticated invocation inside
the existing new daemon owner; importing a helper cannot upgrade the current owner.
The first proposed transaction omits Apply, but Restore can still write original P
if it differs. That possible restoration needs explicit authorization. A strictly
zero-write close would require a new owner-enforced operation. No production motor,
gain value, hardware RPC or gain/motion handoff is supplied.

## October 15 offline maintenance entry point

A private candidate now supplies a dedicated maintenance process and authenticated
Linux Unix-socket client. It creates one backend and uses that backend's native
owner. It does not start the ordinary daemon transports, app manager, media or
Python pose loop. Browser/SDK control remains unavailable for the process's
whole lifetime, including after restoration or disarming; there is no handoff of
queued ordinary work. Normal daemon source files remain byte-identical.

The entry exposes memory-only status, explicit diagnostic inspection, bounded
arming, preparation, original-P restoration and disarming. It exposes no Apply,
different-gain, mode, Wake, Sleep or motion operation. Preparation requires an
explicit Stewart motor and P equal to freshly observed original P; the native
transaction independently rechecks its disabled-only admission. Restoration
can still write original P and requires explicit authorization. Client disconnect,
arming expiry or cancellation does not cancel admitted native work or release
ownership. Uncertain outcomes retain inhibition and never cause automatic replay.

Private directory/socket permissions, Linux peer credentials and a secret token
gate access. Process epochs and request IDs fence old requests. The client syncs
an exclusive private intent receipt before sending. Configuration pins the
native pending-journal root to the actual service environment, preserving its
startup guard across maintenance and normal processes. Diagnostics respect the
shared one-second native cooldown: metadata and loop reads retain separate
timestamps and per-read freshness checks; the sequence is explicitly non-atomic.

Fifty-one fake-owner/service and local Unix tests passed in Linux WSL. Exact Windows
package installation exercised the real daemon/backend with an inert native
constructor, with 729 daemon and 510 schema checks; exact rollback passed another
729 daemon checks and removed the added modules. These tests do not establish
combined entry/native-owner operation on ARM or the physical bus. The previously
qualified native ARM wheel is unchanged. All 430 controller tests passed after
an existing timing-sensitive fixture was made to hold later snapshots explicitly;
the production freshness rule is unchanged.

The exact private backup/deployment/rollback procedure remains unarmed. It calls
for verified current payload/configuration/environment backups on both machines,
an explicit no-Sleep backend stop before service shutdown, sole serial ownership,
offline package installation, inspection-only qualification and independently
verified restoration before any normal startup. Restart or restoring old packages
cannot resolve a pending transaction.

Review found an additional deployment limit: the unchanged native constructor
can reboot servos reporting certain errors before returning its owner. Disabling
Python reflashing does not suppress this. Strict no-reboot startup and the new
combined ARM entry remain unqualified; deployment must not silently bypass these
limits. No robot was contacted, installed, restarted, woken or moved during this
offline pass. The mode correction and website publication are unchanged.

## October 15 offline no-reboot startup policy

A new private candidate adds an explicit `maintenance_no_reboot` constructor
policy. It performs four fixed read-only profiles before creating the native
worker; this branch cannot enter the legacy reboot, ramp/retry or correction
paths. It verifies returned IDs, every raw torque bit, required position modes,
registered instructions, bounded power/temperature and the reviewed seven
head/body identities. Input-voltage alerts require explicit allowance, default
false; raw alert/error evidence remains in a frozen startup receipt. Antenna
model/firmware values are recorded without claiming their identities are admitted.
The sequential reads share a cooperative one-second deadline and are not an
atomic state snapshot or proof of interruptibly bounded OS open/close operations.

Ordinary native commands remain inhibited for this owner's entire lifetime,
including after verified P restoration. The daemon adapter passes the policy
explicitly and refuses hardware-configuration PID writes, media and wireless
startup hooks for this path. Normal startup retains its legacy default; the
adapter omits the new keywords there so it can still use the older native API.
No mode correction or movement behavior is bundled.

All **96 native tests** passed, including strict protocol/failure cases, permanent
inhibition after restoration, actual PyO3 signature and frozen-receipt checks.
The **51 Linux WSL service/Unix tests**, installed Windows adapter/package checks,
**729+510 daemon/schema checks** and **729 production-rollback checks** passed.
Windows and ARM64 wheels have verified payloads, generated stubs, architecture
and source reversal; all 327 daemon assets are preserved. These checks qualify
the offline policy candidate, not the new ARM constructor/entry runtime.

An unarmed combined ARM test now covers nine planned cases: normal-default
startup, the complete no-Apply entry transaction, serious errors, partial torque,
mixed modes, returned-ID mismatch, unacknowledged/acknowledged voltage alerts and
pending-marker rejection before native port opening. Twelve offline guard tests
passed. Execution must use only a generated private PTY, exact imported payloads,
an external watchdog and independent native-open/connect tracing. Individual
case results remain incomplete qualification until trace review, owned-child
exit and scratch cleanup are recorded. This new combined test has not run.

No robot was contacted, installed, restarted, woken or moved. Physical startup,
bus timing, antenna identity and gain/motion validation remain outstanding; the
mode correction and website publication are unchanged.

## October 15 combined ARM maintenance-entry qualification

The changed no-reboot binary and combined daemon entry now passed all nine
prepared cases on the existing ARM64/CPython 3.12 runtime using private generated
PTY servos. Both wheels were extracted into fresh, completely inventoried overlays;
the real daemon was not stopped, replaced or restarted. Normal default startup,
the authenticated inspect/arm/prepare/restore/disarm flow without Apply, all
rejection cases, explicit voltage-alert allowance and pending-before-open passed.
The candidate remains uninstalled and no production motor or P was selected.

Before execution, independent review tightened complete overlay membership,
constructor packet profiles/IDs and the external watchdog's exceptional cleanup.
The harness passed 16 offline guards; the watchdog passed 10 inert Linux tests.
An initial combined-entry attempt failed before arming because its fixture socket
had mode 0700; the real launcher explicitly uses 0600. Correcting only the fixture
to the production bind/chmod/serve sequence passed an actual-client regression
and the complete rerun. Earlier failed receipts and traces remain preserved.

Independent review checked every collected process/thread trace, attempted device
open, endpoint operation and packet CRC/profile/ID. No physical serial access or
external connection appeared. A dependency's import-time IPv6 loopback bind was
explained by its installed, RECORD-verified capability-probe source. Successful
entry connections were confined to their generated private Unix endpoints.
Pending-before-open had no additional native PTY open after its constructor
intent anchor and sent no packets. All fixture packets were reads, no P write
was attempted, and initial/final emulator register-image hashes matched. Separate
raw whole-register arrays were not archived; their equality is supported by the
emulator's recorded hashes rather than an independent raw-array comparison.

For both successful entry cases, actual native backup bytes exactly matched
prepare, restore and disarm receipts. Original/observed PID bytes, session/epoch
ordering, unique client request IDs, closure-record bytes and pending removal
were independently checked. All traced children exited cleanly, without watchdog
signals or timeout. Complete evidence was downloaded and hash-verified before
exact-inventory cleanup of this turn's owned staging and scratch. The real
daemon owner, package/configuration/runtime metadata and disabled state were
unchanged. This used root with reviewed paths and tracing, not OS device isolation.

This qualifies the exact compiled constructor/worker/entry against simulated
servos. It does not qualify physical startup/read timing, all-nine physical motor
identities, production backup/restoration or gain benefit. The next physical
stage remains a separately authorized exact-current backup and disabled-only
maintenance deployment/inspection; an original-P transaction needs its own
possible-restoration-write authority. Gain/motion handoff remains unqualified,
and the incomplete unchanged-gain baseline does not authorize tuning. The mode
correction remains separate and uninstalled; no motion or website publication
occurred in this qualification.

## October 15 disabled-only physical maintenance test

The qualified private wheels were temporarily installed through an exact
seven-file replacement after an attended, fresh identity/version/ownership check.
A complete current checkpoint reused historical content by hash and captured
only missing blobs. Non-live reconstruction verified content and restorable
metadata, then removed its scratch. External interpreter availability remains a
prerequisite; original inode/ctime and external hardlink counts are not recreated.

Physical `maintenance_no_reboot` startup succeeded with all nine torque-enable
registers zero, modes unchanged and ordinary control inhibited. Head/body identity
was verified; antenna identity remains explicitly unqualified. The existing
input-voltage alerts were explicitly allowed and retained. The operator saw no
movement. Fresh sequential metadata/loop inspection took approximately 1.07 seconds
and retained the original gains; this is not a simultaneous all-profile snapshot.

One original-value preparation attempt failed its first/confirm snapshot
comparison before the worker stored a transaction or saved a gain backup.
The receipt retained `UnresolvedLocked`, an empty backup and false candidate/
restore write-start flags. Its zero original-P field was an unset receipt value,
not a measurement of a zero motor gain. The pending marker kept control inhibited.
The generic error does not identify the differing register or power reading:
the failed snapshots were discarded. Present position/current/PWM and realtime
tick are excluded from this comparison; their normal variation is not an
established explanation. No guard was weakened and preparation was not retried.

One explicit recovery request through that same owner/epoch/session took the
native no-transaction path. Fresh status and independent bounded journal reads
confirmed `ClosedWithoutGainWrite`, both write-start flags false, no backup,
exact terminal bytes and pending-marker removal. The Python entry then rejected
the legitimate terminal state because it expects `RestoredVerified`. That wrapper
limitation was retained as a failure; no verified-restoration claim was made and
no disarm was forced. The separately reviewed no-gain closure proof supported
graceful owner exit, exact software rollback and normal service restoration.

Final checks confirmed original package bytes/configuration/runtime, original
sampled gains, normal ready/disabled state and no active move or pending journal.
Temporary wheels/preimage caches were removed; immutable reusable checkpoint
content and native terminal records remain private. No Wake, Sleep, motion,
different gain, mode correction or website publication occurred. Physical
preparation/restoration qualification remains incomplete. The next offline
candidate should retain both compared snapshots and address-level differences,
and handle native no-write closure explicitly without relaxing admission or
automatically closing uncertainty.

## October 15 snapshot diagnostics and physical follow-up

A private candidate now retains both admitted raw snapshots, projected bytes,
read intervals and all addressed differences when comparison fails. Its receipt
explicitly marks these diagnostics as not a durable gain backup. The comparison
predicate, admission rules and write policy remain unchanged. The Python entry
handles native `ClosedWithoutGainWrite` separately from `RestoredVerified`, using
an explicit recovery intent plus exact same-session native and durable journal
proof. Fresh status may reconcile a lost terminal reply; it never replays recovery.

Validation passed 99 native tests, 65 inert entry tests, 30 installed entry checks,
729 daemon plus 510 schema checks and 729 production-rollback checks. Both native
platform wheels and the daemon wheel were verified. Ten combined ARM cases passed
against generated private PTY servos, including an injected snapshot mismatch.
Independent review covered 116 complete traces and 1,013 read-only packets, raw
register images, terminal records, owned-child exit and exact scratch cleanup.
No physical serial access appeared in those traces. Root execution with reviewed
paths and tracing is not an OS device sandbox or physical bus qualification.

The attended physical trial used an exact-current checkpoint, verified by full
temporary reconstruction. Existing content was reused by hash: only one new
71-byte content blob, compressed into a 238-byte archive, was captured. The two
qualified packages were temporarily installed through the same seven-file change.
No-reboot maintenance startup and fresh inspection passed with all nine torque
registers zero, unchanged modes and no Python motion loop. The previously observed
input-voltage alert remained explicitly admitted and recorded.

One original-value preparation attempt rejected during `prepare-confirm` before
a native gain backup or gain write. Independent reconstruction of both 735-byte
projections from their raw profiles confirmed the sole failed criterion:
motor 12's four-byte Goal Position at address 116 changed from 2640 to 2641.
Motor 10's voltage changed by one decivolt and motor 16's temperature fell by one
degree; both were within the existing allowances. Selected motor 11's P remained
300 and no gain bytes changed. Different read widths were normalized correctly.
This identifies the changing field, not its cause or the cause of yaw shortfall.
Preparation was not retried and the guard was not weakened.

One explicit same-owner recovery succeeded through the corrected entry.
Fresh status and independent bounded journal reads confirmed
`ClosedWithoutGainWrite`, sequence zero, both write-start flags false, no backup,
the exact terminal record and no pending marker. The entry reported
`noGainClosureVerified=true`, `restorationVerified=false` and continued ordinary
control inhibition. Graceful owner exit, exact original software rollback and
normal disabled startup then passed. The operator confirmed that Reachy remained
asleep and settled without movement. Temporary wheels, preimages and configuration
were removed; reusable checkpoints and native terminal records were retained.

This physically validates the diagnostic capture and no-write closure path.
Successful preparation, gain restoration, changed-gain benefit and motion remain
unqualified. The next investigation should explain the one-count goal-register
change while disabled before changing any comparison rule. The separate mode
correction remains uninstalled. No Wake, Sleep, motion or publication occurred.

## October 15 disabled Goal/Present read-only capture

The existing normal daemon's explicit register API reads Goal Position and
Present Position from separate offsets in the same per-motor response. A finite
sequence of metadata, loop, eight register, loop and metadata GETs completed with
fresh identity/disabled/ownership gates, increasing native sequences, unchanged
software and no controller write requests. All 70 paired values matched, including
one-count changes on three motors. Torque and mode were separately bracketed;
this is not an atomic all-register or simultaneous all-motor sample.

Fifteen new inert Rust tests compiled exact production decoder/read/comparison
function bodies with memory-only adapters. They verified that measured-position
variation does not alter the decoded goal, a one-count goal change still rejects
preparation, and prior differently sized replies reject. CRC-valid same-ID,
same-width replies arriving after input clear remain a demonstrated protocol
freshness limit. These are function tests, not new full-worker/wheel qualification.

A private, bounded tracer was then qualified on the ARM runtime against a
generated virtual serial port. Explicit finish and caller-pipe loss each retained
the exact expected transfers, detached all dummy threads and left no stopped
tasks. Earlier harness failures remain recorded; fixes covered unsupported
dummy-only tracing policy, strict hex-encoded path parsing, owned SIGINT exit
classification and complete transfer preservation. No global tracing permission
was changed. Root execution with reviewed paths is not an OS device sandbox.

One selected-descriptor capture around the same twelve GETs then completed on
the existing disabled normal daemon, without constructing another controller or
opening its serial device. Independent review verified 16,914 syscalls, 135,093
transferred bytes and 8,450 CRC/stuffing/profile/ID-valid frames. Captured outgoing
instructions were reads only, with zero transmitted or attempted register writes.
The sole attachment notice was explicitly reconciled with the pinned tracer,
owner and thread-readiness receipts; the original conservative parser result
remains intact.

Every paired API value matched the corresponding raw packet bytes. Motor 12's
goal and measured count sequence was 2640, 2641, 2641, 2640, 2641, 2640, 2641,
2640, 2640, 2641. This reproduces the changing goal readback while the captured
owner traffic contains only reads. It does not establish a particular firmware
mechanism, response-generation age or behavior of another bus participant.
Aliases, temporary descriptor rebinding and untraced descriptors/processes were
not independently captured; the conclusion is scoped to the selected descriptor.

The tracer exited after explicit finish, all known threads were detached and
unstopped, and native cached samples plus daemon heartbeat advanced afterward.
Fresh final checks retained the same original software/owner, disabled state,
free app ownership and absent pending journal. No owned tracer or fixture process
remained active. The downloaded physical trace was hash-verified before removing
its redundant device copy; small private qualification receipts were retained.
No package backup was needed because no installed package or configuration was
changed. No motion, gain/mode change, restart, network change or publication occurred.

Preparation remains blocked by its exact comparison. A useful next diagnostic
candidate would pair measured counts inside the actual maintenance snapshots,
with their read profiles requalified and the predicate unchanged. The present
evidence does not justify a tolerance, automatic retry, goal rewrite or admission
relaxation. Successful gain preparation/restoration and smooth yaw remain unqualified;
the separate mode correction remains uninstalled.

## October 15 offline paired maintenance snapshots

A new private diagnostic candidate pairs Goal Position at address 116 with
Present Position at 132 in the actual maintenance snapshot. Both values come
from the same returned payload for each motor. The diagnostic record explicitly
states that atomicity and response-generation age are unverified; sequential
motor responses are not a simultaneous seven-motor observation.

The third read family uses address `76 - ordinal` and width `60 + ordinal` for
ordinals 0–15, keeping its exclusive end at 136. Shifted gain/control offsets
preserve the exact previous projection while adding the signed measured count.
There are still four phases, fixed motor IDs and unchanged deadlines. This avoids
naively widening the previous read into extra tail registers. Unique widths do
not authenticate response age or eliminate same-width stale replies.

The backup projection, comparison predicate, gain writer and transaction
lifecycle are byte-identical to the preceding candidate. Present is diagnostic
only; no tolerance, retry, goal rewrite or admission change was introduced.
The private maintenance entry must pin the exact new ARM binary; only that hash
constant and wheel RECORD change in the daemon package. Ordinary daemon startup,
assets and public control/version gates are unchanged.

All **106 native tests** passed, including seven new paired-snapshot regressions.
Windows and ARM64 wheels passed build, RECORD and architecture checks; source
patch reversal reproduced all 80 baseline files exactly. The final installed
Windows pair passed getter/entry checks, five pin/platform/version checks,
729 API and 510 schema checks, followed by 729 rollback API checks and exact
restoration of the previous private test environment. These use inert owners.
The initial native run's missing fixture failure and earlier pre-pin package
checks remain recorded separately.

The native maximum-difference record retained 728 differences. Through the
unchanged Python service status/encoder and an in-memory client StreamReader,
the escaped response occupied 50,094 bytes under the 131,072-byte line limit;
oversized framing was rejected. This is not real Unix transport or device
timing evidence. No robot requests or new package backups were needed.

This remains an offline candidate. New ARM virtual-servo qualification must
precede deployment, followed by a separately recorded disabled-only maintenance
capture under the unchanged rejection policy. Neither the preceding normal-owner
capture nor these offline checks qualify physical gain restoration, tuning
benefit or smooth yaw. The mode correction remains separate and uninstalled.

### October 15 completed ARM/PTY paired-snapshot qualification

The exact paired candidate completed **13 cases on the actual ARM runtime**
against generated virtual serial ports, using the native owner and maintenance
entry. Coverage includes normal default startup, unchanged-P preparation/restore,
startup identity/mode/torque/alert rejection, acknowledged voltage alerts,
pending-before-open, an injected control mismatch, and Present-only, Goal-only
and paired Goal/Present drift. The preceding failed harness attempt remains
recorded separately; its classifier was corrected to recognize the existing
ordinary idle position reads outside contiguous transaction read groups.

Present-only drift preserved the exact original backup projection and immutable
backup, then passed original-gain readback without a gain write. Goal-only and
paired drift still failed the unchanged exact comparison before backup and
closed only through explicit verified no-gain closure. Both raw snapshots and
their paired counts were retained. No Apply operation was exposed or exercised.

Independent review covered 164 process/thread traces, 1,999 native read requests
and 17,556 status frames. Request and emulator response transfers matched the
retained bytes, CRCs, stuffing, IDs, profiles and complete register images.
All serial write attempts were positive and complete; no mutating or attempted
mutating instruction appeared. The trace filter captured writes rather than
every native serial read return, so response evidence proves bytes transferred
by the emulator into the virtual port, corroborated by native parsed receipts.
Reviewed opens and connections showed no physical serial access or external
connection. Owned process, archive/inventory coverage and actual cleanup checks
passed, with the normal owner and installed software unchanged by the fixtures.

Actual ARM entry coverage reaches ordinals 0–3 on successful Prepare/Restore
paths and 0–1 on comparison rejection. All 16 ordinals were exercised only by
the separate inert native tests. Root execution with reviewed traces is not an
OS device sandbox. Nonce-free replies still lack response-generation-age proof;
same-width delayed responses remain indistinguishable. Paired fields share one
per-motor payload, not a verified atomic firmware latch or simultaneous motors.

This completes the ARM/PTY prerequisite only. It does not establish physical
startup, gain preparation/restoration, changed-gain safety or benefit, motion,
smooth yaw or mode-correction qualification. The separately attended physical
stage requires its own recorded outcome under the unchanged rejection policy.

### October 15 paired physical Prepare and restore-before rejection

After the ARM qualification, the exact candidate passed a disabled-only physical
trial through Prepare. The checkpoint referenced existing content rather than
copying full backups: 9,990 regular files were reused and one new 71-byte receipt
was captured. Full separate reconstruction verified all 9,991 regular files,
restorable metadata and internal link topology, then verified scratch cleanup.
External hardlink counts and original inode/ctime reproduction remain outside
that guarantee.

The normal backend stopped without Sleep and released its serial descriptor
before the seven-file installation and maintenance startup. All nine motors
reported torque disabled; ordinary control and the Python pose loop remained
inhibited. A single Prepare at the selected motor's unchanged original P passed
both snapshots, produced `BackedUpLocked`, and saved a native backup whose exact
793 bytes were verified and copied off-device before explicit closure.

The original-P closure then failed at `restore-before`: motor 13's Goal and
Present values both changed from 1942 to 1941 counts. The paired fields agree
within each motor response. The sole failed comparison was Goal Position; all
other comparison criteria passed. This establishes correlation in the retained
payloads, not firmware causality, atomic sampling or response-generation age.
The exact comparison remains unchanged.

Fresh same-owner status reports `UnresolvedLocked`, a durable backup, both
gain-write-start flags false and ordinary control inhibited. The original-P
closure was not replayed. The existing pre-backup no-gain closure requires no
backup and cannot close this backed-up session; a separate reviewed no-write
recovery contract is needed. The maintenance owner, pending marker and immutable
backup are retained, with the normal service stopped. Software restoration and
normal restart remain blocked until a qualified terminal path exists.

The operator confirmed Reachy stayed asleep and settled with no movement.
No Wake, Sleep, motion, changed gain, mode correction or network setting was
sent. This physically qualifies preparation and backup only; verified readback
closure, changed-gain restoration, tuning benefit and smooth yaw remain open.

A subsequent inert regression reproduces this exact Prepare-success and
restore-before-rejection path through the production transaction, snapshot,
comparison and journal bodies. It verifies the retained backup/pending state,
paired counts, twelve read-only requests and zero P writes. It does not exercise
the compiled worker or installed wheel. A separate synthetic-only journal
custodian prototype passed 15 Linux fixture tests, including interruption cuts,
replay, corruption and file-race cases. Those cuts are exceptions, not power-loss
tests. The prototype demonstrates that a namespace move requires an independently
held startup and journal-writer fence; detection after a race is insufficient.
It accepts no real session and supplies no live recovery or startup-release API.
These tests prepare recovery work; they do not close the physical session.

### October 15 no-write recovery and original-service restoration

A subsequent exact-session recovery qualified and used a distinct external
outcome: `ExternallyAdjudicatedNoGainWriteWithBackup`. The retained Prepare,
failed `restore-before` response, entry source and native journal evidence bound
both gain-write-start flags to false. The native comparison and gain APIs were
unchanged; the failed Restore was never replayed.

The recovery fences passed 17 Linux tests and the journal custodian passed 19.
The actual ARM Python runtime then passed 15 generated-filesystem recovery cases,
17 fence tests and 12 restoration admission/uncertain-outcome tests. Independent
review verified the full generated-tree inventory and single-process syscall
trace, including actual rename/fsync operations, with no device opens, network
calls or mutations outside the generated test tree. Service/process metadata and
rollback proofs in these fixtures were synthetic. Exception cuts establish
observed interruption behavior; power-loss durability remains untested.

Actual recovery first masked normal startup, gracefully stopped the exact
maintenance owner and verified its process/cgroup exit and an empty all-thread
serial-descriptor census. Root custody protected the contents of the original
journal-directory inode. Every transition checked the configured path and its
ancestor identities; namespace drift would retain the service mask. This relies
on trusted local operators, with no hostile-OS isolation claim.

Protected external history, the exact backup and a committed record were synced
before the original pending inode was moved into that history. No native
`.closed` record or `RestoredVerified` result was manufactured. The original
native backup remains in place. Exact surgical rollback restored the original
software and verified all 501 original package files, runtime, startup sources
and configuration. The original journal permissions and service-file inode were
restored before one normal-service start with startup Wake disabled.

Fresh status confirms the admitted identity/version, disabled motor control and
the same sole normal serial owner; all seven raw head torque-enable values are
zero. No Wake, Sleep, motion, gain write, mode correction or network setting was
submitted. The operator confirmed Reachy remained asleep and settled throughout
recovery and restart, with no unexpected movement. Attended recovery validation
is complete.
Verified native gain restoration, changed-gain safety, tuning benefit and smooth
yaw remain open. Immutable receipts and fixture archives are private; archived
generated device staging is cleaned separately after byte verification.

### October 15 native backed-up no-write closure candidate

A subsequent private candidate provides an in-process terminal path for this
specific rejection in future sessions. It does not replace the completed
external recovery or adopt that historical session. The explicit native
`close_backed_up_without_gain_write` operation requires the same live
maintenance owner, its original transaction and exact session, equal original
and candidate P, a durable backup, no Apply admission, exactly one Restore
admission, and typed first-`restore-before` comparison rejection. Both sticky
gain-write flags must be false. Diagnostic JSON alone supplies no authority.

The operation performs no serial I/O. It independently verifies exact pending
and backup bytes, then creates, syncs and rereads a distinct backup-bound terminal
record before removing pending and syncing the directory. The native result is
`ClosedBackedUpWithoutGainWrite`, with a separate verified flag and
`restoration_verified=false`. The original backup remains. This proves no gain
write by this transaction; it supplies no fresh motor-state or restoration proof.
All ordinary serial control, telemetry and diagnostics remain inhibited for that
maintenance owner's lifetime, including after successful closure. An explicit
authenticated entry operation also requires current epoch/session, separate
authorization and attendance, and verifies native receipts against retained disk
evidence. Disarm repeats the disk proof.

A lost response after successful native publication can be reconciled by
same-owner memory status and independent disk proof without replaying closure.
Any native journal failure remains locked and uncertain, including a failure
after pending removal. Complete-looking disk bytes alone cannot authorize
adoption, replay, restart or manual deletion. Exception injection does not qualify
process-crash or power-loss durability.

Offline qualification passed 110 native tests, 65 existing and 14 new Linux entry tests,
including admission races, sticky cancellation, journal fault cuts, corrupted or
linked backups, lost replies and uncertain outcomes. Windows and ARM wheels
passed complete RECORD/path/architecture checks, exact source reversal and
unchanged comparison/read-profile/gain-writer checks. Compiled Windows package
checks verified the new API, entry integration and existing API/schema behavior;
the reused test environment was restored to its exact prior package payloads.
No new full package backup or virtual environment was created.

Five cases then passed on the actual ARM Python runtime with the compiled owner,
authenticated Unix entry and generated virtual serial ports: normal default
startup, successful closure, lost reply, rejected second Restore and rejected
prior Apply admission. The paired one-count drift is injected in the virtual
servo only; native comparisons and policy are unchanged. Independent review
decoded all 1,278 requests and 11,171 status frames, checked exact CRCs, widths,
payloads and motor images, and verified 78 clean task exits. There were no
physical serial opens or Internet connections. Each case included one expected
IPv6 loopback bind during runtime import. All four maintenance cases sent zero
serial packets after closure intent. Successful journals showed terminal file
and directory sync before pending removal and directory sync afterward.

The real normal-daemon owner, installed software, configuration and runtime
matched the read-only baseline before and after every fixture stage; motors
reported disabled. The final read-only audit confirmed the same original owner,
disabled control and seven zero raw head torque-enable values. Full archive and
wheel-payload checks, retained socket metadata and inactive-process checks
preceded removal of about 236 MB of generated device staging. The original
backup and protected recovery history remain intact. The candidate remains uninstalled. Physical closure, original
gain readback, changed-gain safety, tuning benefit and smooth yaw remain open.
The mode correction and network settings were untouched. A future attended
disabled-only deployment must reuse verified content backups, qualify exact
installation/rollback, and record its own outcome without manufacturing a
comparison failure merely to exercise this branch.

### October 15 device follow-up and read-only maintenance probe

The exact closure candidate completed an authorized disabled-only installation
and maintenance startup, with all nine raw torque bits zero. Content-addressed
backup reused 9,990 files and captured two new objects totaling 864 bytes. Full
scratch reconstruction and cleanup verified the fresh checkpoint before the
seven-path installation. The generic surgical installer and actual candidate
pair also passed a separate 501-file scratch install/rollback; 44 inert tests
covered deployment guards, metadata, terminal proofs and all-thread ownership.

One unchanged-P Prepare failed at `prepare-confirm`, before backup or any gain
write. Independent raw-profile reconstruction identifies the sole failing
criterion: motor 11 Goal Position changed from 1869 to 1870, and Present Position
changed by the same amount in that payload. Motor 15 temperature changed from
29 to 28 within its allowed window. The receipt's zero original-P field is an
unpublished initial sentinel, not a physical P measurement; direct diagnostics
reported the selected motor's unchanged P of 300. No Prepare retry was made.

The existing explicit pre-backup closure produced `ClosedWithoutGainWrite`.
Independent disk proof, disarm, fresh terminal proof, graceful process/cgroup exit
and an empty all-thread serial census passed. The new backed-up closure was not
exercised because no backup existed; this is no physical qualification of that
branch or native original-gain readback.

The candidate stayed installed for one further read-only experiment, without
another package backup or installation. A fresh sole owner used the existing
production no-reboot constructor and native metadata, loop and paired-register
methods directly. It made 22 reads: metadata/loop before and after, six paired
reads spaced three seconds apart and twelve spaced 1.1 seconds apart. The
diagnostic cooldown, finite schema, sequence, identity, power, torque and freshness
checks remained enforced. All 20 paired samples, including the two loop samples,
matched Goal to Present for all seven head motors. Motors 11, 15 and 16 varied
by one count. Both phases showed variation; this small sequential experiment
does not establish a sampling-rate effect. P remained 200 for motor 10 and 300
for motors 11–16, with head torque disabled before and after. No gain transaction
was opened. The native owner closed naturally, with successful exit status,
empty cgroup and no serial owner before rollback.

Exact original software, configuration, runtime and normal service were then
restored. A fresh audit verified disabled control, seven zero head torque bits
and intact original backup/protected recovery history. On October 16, the
operator confirmed Reachy remained asleep and settled throughout the maintenance
test, read-only probe and restarts, with no unexpected movement. Attended visual
validation of this run is complete. No Wake, Sleep, motion, changed gain, mode
correction or network setting was submitted. A bounded read-only recorder
retained 400 successful passive SSH banner checks; HTTP failures stayed within
intentional normal-service downtime. The static workaround persisted while the
native kernel subnet route remained absent. This does not reproduce or explain
the original routing failure. The recorder is stopped and leases are released.

The next focused investigation is which fields must remain invariant for a
P-only maintenance transaction, given the observed Goal/Present variation.
The comparison policy was not relaxed in this test. Repeating identical reads
or rebuilding unrelated diagnostics is not a substitute for resolving that
specific contract and testing it on the device.

### October 16 focused P-only policy and device test

The comparison contract now separates the register being maintained from
observed motion targets. Only Goal Position bytes 116–119 are excluded from
static comparison, for all seven sampled head/body motors. Static controls
98–115 remain exact, along with identity, configuration, neighboring gain bytes,
return policy and the existing error and supply/temperature rules. Every
snapshot still requires raw torque-off and the reviewed position mode. The
P-only writer, read profiles, immutable backup projection, journal, ownership,
admission and recovery rules are unchanged. No target write or operating-mode
correction was added.

Raw Goal bytes remain in the exact backup and paired diagnostics. A successful
comparison with Goal variation publishes diagnostics using
`comparisonPolicy=p-only-static-v1`, `diagnosticOnlyRanges=[[116,4]]` and
`compareFailed=false`. Those differences do not authorize failure-only recovery.
This is neither a one-count tolerance nor a claim of frozen pose or continuous
torque-off. Protocol replies remain sequential, non-atomic and without nonces.

Qualification was deliberately focused: 50 native tests passed, including
arbitrary four-byte Goal changes, rejection of adjacent byte 115 and torque-on
rejection. The ARM wheel built and imported on the actual Python 3.12 runtime,
without constructing a controller during the import check. The actual package
pair passed a scratch seven-path install/rollback against all 501 archived
original package files. Fresh live metadata, startup prerequisites and exact
added-module absences were checked. Five existing preimages were bound to the
verified archives, then temporarily cached by the unchanged surgical installer.
No new full backup or whole-environment reconstruction was created or claimed.

Disabled-only physical maintenance startup reported all nine raw torque-enable
bits zero and no Python motion loop. One Prepare at unchanged Stewart motor P 300
reached `BackedUpLocked`. Motor Goal and paired Present varied from 1869 to 1870
counts during preparation; the new policy correctly retained that evidence
without rejecting it. The exact 793-byte native backup was verified on-device
and copied to the laptop before one original-P Restore.

Restore reached `RestoredVerified`, sequence 2, with original and observed P/I/D
bytes identical. Both candidate-write and restoration-write flags remained
false. Goal variation was recorded again in `restore-after`; static controls
remained exact and observed voltage changes stayed inside the existing window.
Independent review reconstructed the raw profiles, 735-byte backup projection,
framing/CRC, comparison differences and exact native terminal record. Terminal
status, disarm, fresh same-owner proof, graceful process/cgroup exit and an empty
all-task serial census passed before rollback.

The original 501 package files, runtime, configuration and normal service were
restored. A final independent read-only audit verified ready/disabled control,
seven raw head torque bits zero, no pending marker, sole normal serial ownership
and intact prior backup/protected recovery history. Temporary uploaded wheels,
import overlay and installation preimages were removed by exact file checks;
archives and the new native backup/terminal record remain. The robot lease is
released. On October 16, the operator confirmed Reachy remained asleep and settled
throughout the test and service transitions, with no unexpected movement. Attended
visual validation is complete. No Wake, Sleep, motion, gain write, mode correction
or network setting was submitted.

This qualifies the sampled unchanged-P transaction and original-gain readback.
It does not qualify changed-gain restoration, tuning benefit, smooth yaw,
physical backed-up no-write closure, response-generation age or power-loss
durability. It does not establish why Goal tracks Present while disabled. The
static route workaround remains present while the native kernel subnet route
is absent; the earlier network-disappearance cause remains open. The next gain
experiment needs its own bounded changed-P test and exact restoration evidence.

### October 16 disabled changed-P roundtrip

One explicitly authorized Stewart motor completed a disabled RAM P-only
transaction: **300 → 299 → 300**. The private entry adds an opt-in changed-P arm
and one-shot Apply; the original unchanged-P interface remains available.
Candidate authorization, attendance and exact owner/session are explicit. Apply
requires the native backup, state-appropriate pending history and confirmation of
its off-device copy with the actual hash. An unknown reply never authorizes Apply
replay. Original restoration remains available before Apply and after expiry or
an uncertain Apply, with fresh status required for uncertainty. Changed candidates
cannot use the backed-up no-write closure. Ordinary control remains inhibited
for the maintenance owner's lifetime, including after disarming.

Review resolved pre-Apply expiry restoration, pre-backup failure closure,
lost-reply pending proof and the outer distinction between safe original closure
and successful changed-gain qualification. Sixteen focused inert Linux tests
passed. The native image, P-only writer, read profiles, comparison policy,
admission and recovery guards were unchanged; the mode correction was excluded.
The actual package pair again passed exact seven-path scratch installation and
rollback against all 501 archived original package files, using fresh metadata.

One generated-PTY case then used the exact entry, Unix client and compiled owner
on the robot's ARM Python runtime. It dropped a real Apply reply, verified the
candidate through fresh status, rejected a second Apply and restored after a
fixture-only arm-deadline expiration. Independent trace/packet review verified
330 requests and 2,870 status frames, exactly P299 then P300 writes, full register
image restoration, zero torque and 16 clean task exits. No physical device opens
or external Internet connections were observed. The fixture bypassed physical
TTY validation only for its generated PTY; tracing was not OS device isolation
and did not qualify power-loss behavior. Initial fixture ownership/pin errors
stopped before Apply; a later outer receipt collision after the successful case
was reconciled read-only without repeating the transaction. Private failed
receipts remain intact.

Physical maintenance startup reported all nine raw torque bits zero. Exactly one
Prepare reached `BackedUpLocked`; its exact 793-byte native backup was verified
on-device and copied to the laptop before Apply. Apply reached
`CandidateVerifiedLocked`, sequence 2, with P299 and unchanged I/D. Restore reached
`RestoredVerified`, sequence 3, with both sticky write flags true. Fresh PID bytes
returned to their exact original value, and the entire fresh 735-byte observed
projection matched the original backup projection byte-for-byte. Independent
review verified the immutable backup, session/CRC, raw Apply profiles, fresh
restoration projection, exact closed record and pending absence.

The diagnostic JSON retained in Restore is historical `apply-after` evidence,
with expected P299. No new comparison diagnostic replaced it when restoration
had no diagnostic variation. It must not be labelled fresh Restore raw data;
the new observation bytes, PID and read timestamps provide restoration evidence.
Apply differences included the expected selected-P change and diagnostic-only
Goal/Present variation on another motor; static comparison criteria did not fail.

Terminal proof, disarm, graceful maintenance process/cgroup exit and serial
release passed before restoring the original 501 diagnostic package files and
normal service. Original archives were reused without another full backup or
whole-environment reconstruction. Large import overlays, uploaded wheels and
temporary preimages were removed; native journals and protected history remain.
Original gains were verified before and after a separately authorized guarded
Wake/Sleep observation. No manual head target was sent. The operator confirmed
the gain phase stayed asleep, Wake/Sleep behaved normally and Reachy remained
asleep without unexpected movement. Final telemetry was ready/disabled with
seven zero raw head torque bits and sole normal serial ownership.

Targeted network logging retained 191 successful TCP checks, 137 successful PC
HTTP reads, 54 HTTP failures confined to intentional daemon downtime, 188 robot
loopback observations and 24 ARP frames with no reported drops. No new conflict
was recorded. The workaround remained present and the native kernel subnet route
was absent before and after. Capture helpers exited; the robot lease was released.
Network and logging settings were unchanged, and scheduled polling stayed off.

This qualifies the observed disabled changed-P write/readback/restoration. It
does not qualify a gain-to-motion handoff, candidate-gain motion, tuning benefit,
smooth yaw, physical backed-up no-write closure, firmware cause, physical wire
capture or power-loss durability. A later response experiment needs its own
qualified handoff and matched target design; the failed earlier matched-direction
test remains incomplete. Mode correction and permanent network repair remain
separate investigations. The controller website was not changed or published.

### October 16 reusable-trial candidate

Software restoration is a campaign boundary, not a requirement after every
measurement. Reuse the verified original archives and keep one qualified
diagnostic installation, connection and capture across a coherent experiment.
Restore motor settings at the planned condition boundaries, on recoverable
termination and at campaign completion; restore software at completion or if the
installed build is implicated. Neither a backup nor a process restart clears an
uncertain native transaction.

The private entry candidate adds explicit `next-trial` after a normal
`RestoredVerified` terminal and explicit Disarm. It rechecks the exact current
session, owner, sequence, immutable backup hash, original P/I/D, closed journal
and pending absence. Fresh existing metadata/loop reads must confirm disabled
head torque, admitted identities/modes/errors and the original selected P.
The same owner remains pinned. Special no-write closures, active operations,
uncertainty and altered proof cannot retire a trial.

Before resetting trial state, the entry durably records retirement and changes
the request epoch. Queued requests with the old epoch are rejected, including
Prepare requests that have no native session field. A lost transition reply
requires fresh read-only status, never replay. Each subsequent trial needs new
arming, a new native session and fresh backup/readback; prior journals remain.
A failure before new native Prepare cannot inherit the retired terminal receipt.
The entry bounds a process to 32 trials; this is a protocol/resource bound, not
an experiment-duration estimate or an expiry of original-P recovery authority.

Thirty-one focused inert Linux checks passed, including the prior 16 entry
regressions, three same-owner trials, proof corruption, old-epoch and retired-
session rejection, journal failure and a dropped reply over an actual local
Unix socket. Native source and binary, gain range, write policy and ordinary
motion inhibition are unchanged. These checks do not establish physical reuse
or changed-gain response. Both the native no-reboot startup policy and Python
entry still inhibit ordinary motion; removing only the Python flag would not
provide a valid handoff.

One subsequent ARM64/CPython 3.12 case used the exact candidate entry and unchanged
compiled owner against generated PTY servos. Three transactions (changed,
unchanged, changed) completed in one maintenance process, retaining three distinct
native sessions, request epochs, backups and terminal records. Restores had
sequences 3, 2 and 3. Queued old-epoch Prepare requests were rejected.

Offline replay checked all 1,012 requests and 8,840 CRC-verified status frames
against the complete virtual register image. Exactly four P writes occurred:
299, 300, 299, 300. Every other register remained unchanged, all virtual torque
bits stayed zero and 16 tasks exited cleanly. Selected child-process tracing
recorded no physical-device opens or external Internet connections; it was not
OS device isolation. The running production owner, its 501 package files,
configuration and runtime inventory remained unchanged. No production package
was installed and no daemon restart or physical motor command was sent.
Temporary overlays and uploaded wheel copies were removed, and the reservation
was released. Physical reuse and changed-gain motion remain unqualified. Reuse
validation should accompany the next useful condition change rather than require
another isolated maintenance-only deployment.

### October 18 P-only motion handoff: offline qualification

A private candidate now gives P-only sessions their own typed authority on the
existing daemon guard, native transaction gate and serial worker. It does not
unlock the old disabled-only P writer or turn profile authority into permission
to change gains. No browser/HTTP gain route, new serial owner, startup Wake,
torque enable or mode correction was added.

Preparation requires an explicitly attended, stationary awake position hold and
the retained identity/version, health, original configuration and ownership gates.
Exactly one selected head motor may use original **P300** or experimental **P360**.
Only its two RAM P bytes at address 84 can change. I/D, feedforward, profiles,
limits, modes, body/antenna targets and other motors remain protected. These values
are the bounds of this private experiment, not general tuning recommendations.

The exact nine-motor original register image is content-addressed and verified
before mutation. Apply and even the unchanged-P motion grant require explicit
confirmation of the copied preimage's actual hash. Existing environment backups
are reused; the small fresh transaction preimage is still required. Candidate
Apply is one-shot, with independent readback. A changed P can alter the held
position, so the native handoff binds a fresh stable post-Apply hold while keeping
the original backup immutable.

An explicit P handoff grants only the existing head-only trajectory capability.
The prepared comparison restricts it to the two-second vertical envelope; ordinary
Wake/Sleep, body, antenna, raw packet and mode writers stay inhibited. Native
feedback resumes after maintenance, and the first P-only target rechecks its
measured starting pose with fresh cache data. A stale pre-Apply cache cannot serve
as that check. Subsequent legs preserve the common frozen reference and existing
actual-path review requirements; measured misses remain misses.

Revoke/reclaim fences queued targets before restoration. Fresh readback permits
restoration after an uncertain candidate write, without replaying Apply. A lost
completed native Restore result has a separate read-only reconciliation: exact
current closed session, generation, context, immutable backup, terminal proof and
fresh original registers must match before Python inhibition can clear. It neither
rewrites P nor replays a movement. A feedback fault additionally retains the
existing separate fresh-cache acknowledgement after verified originals.

After actual owner exit, the custodian requires explicit `position-p` recovery
authority and the exact pending session. It preserves current torque, opens only
the exclusive recovery owner, and can restore originals or close a proven no-write
preparation. It cannot Apply, grant motion or restart normal service. Wrong-kind,
wrong-session, corrupt-proof and unknown-result cases retain their fences.

Awake recovery still requires the recorded all-enabled torque pattern. Unexpected
disabled or mixed torque remains inhibited; no recovery path enables torque to
make its checks pass. Protocol 2 replies still lack transaction nonces, and these
sequential register snapshots do not prove atomic sampling or motor sensor age.
Power-cycle recovery and power-loss durability remain unqualified.

Offline evidence is **143 passing native tests** and **106 Python cases**. The
native set includes fifteen focused P-only transaction/fence cases. The final
combined fixture exercised the real PyO3 methods, worker, Protocol 2 packets,
Pollen trajectory and guarded head publication against generated register rows.
It completed all twelve A/B/A legs with exactly **two P writes: motor 15 to 360,
then to 300**. No profile, torque, mode or other-gain write was accepted. Every
leg's bounded same-owner loop readback matched its selected P.

All twelve saved captures pass coverage analysis: **752 complete frames and
1,222 feedback events**. The candidate condition deliberately lost the result
after actual native original restoration; the Python owner stayed inhibited until
the read-only reconciliation succeeded. Earlier component checks also covered lost
servo acknowledgements, corruption/no-effect, stale epochs, configuration/health
drift, partial preparation, process recovery and terminal persistence failures.
An integration bootstrap failure and a rejected fixture with Windows line endings
were corrected in the fixture; production journal matching was not relaxed.

The host fixture uses memory registers and synthetic IK/FK/servo response. It
does not exercise ARM ABI, Linux serial/PTY behavior, same-UID Unix transport with
the new operations, physical power, gain benefit, smoothness or power-loss durability.
No robot connection, installation, restart, Wake or physical motion occurred.
The private Python wheel and source/stub pins are prepared; **ARM native build and
isolated PTY qualification remain the next gate before deployment**.

The unarmed comparison is **A1 P300 → B motor-15 P360 → A2 P300**, changing that
one P register only. Each condition uses the same frozen complete reference and
−24 mm / neutral / +10 mm / neutral vertical sequence at two seconds per leg,
with ten-second holds and the existing bounded electrical/trajectory reads.
Original P and profiles are required for each factory Wake/Sleep; post-Apply
matched-start and actual-path checks are mandatory. Keep one owner within each
condition and restore P at condition boundaries, without reinstalling software
between legs. Fresh attended authorization is still required for the later
installation and physical comparison. No next-stage action is armed by this record.

### October 18 P-only motion handoff: isolated ARM qualification

The exact amended aarch64 CPython 3.12 candidate passed isolated ARM runtime
qualification. Its native worker opened generated PTYs only, with a private
package overlay, journal, same-UID Unix service, Pollen head-only playback and
the retained trace HTTP routes exercised in process. The physical daemon and
its serial device were not used by the fixture. IK/FK, servo response, awake
context and readiness publication remained synthetic.

The final image passed **40 focused Python cases on ARM** and all **twelve
two-second vertical A/B/A legs**. Every leg's native readback matched P300,
motor-15 P360, then P300. The comparison emitted exactly two P writes: selected
motor 15, two bytes at address 84, first 360 and then 300. All twelve complete
captures pass coverage analysis: **1,117 complete frames and 1,310 feedback
events**. This does not qualify physical arrival or the planned ten-second
terminal holds.

The same compiled worker also qualified a lost serial Apply acknowledgement,
read-only reconciliation after a completed native Restore result was lost, and
an actual native position-cache fault induced by corrupted reply checksums.
Unknown Apply was not replayed. The failed movement stayed failed, its trace
exported under inhibition, original P was restored, and later fresh feedback
required a separate explicit acknowledgement; it did not resume output.

Cross-process checks used actual owner exit and a separate restore-only owner.
They rejected a live old PID, wrong parameter kind/session, corrupt descriptor,
and unexpected all-disabled or mixed torque. Only the matching all-enabled
recorded hold admitted original restoration. Recovery rejected candidate Apply
and motion grants. Across the comparison and additional fault/recovery cases,
the peer accepted eight P writes, all alternating 360/300 on motor 15. It
accepted no torque, mode, profile, other-gain or excluded-motor goal writes.
Final virtual settings matched their originals and every fixture process exited.

Two failed attempts are retained separately. The initial combined run completed
the movement/fault cases but failed owner-exit recovery. The amended fixture
clears the retained PTY slave's exclusive-terminal flag after its owned child exits.
The first focused rerun then stopped because the constructor masked a rejected
descriptor as a generic serial-open error. A private native amendment now
preserves the underlying recovery-admission error, without relaxing any gate.
The fixture verifies the intended refusal cause and confines terminal-flag
handling to its generated PTY after confirmed owner exit. Focused recovery and
the full final comparison passed on that exact amended image. Fifteen focused
native P tests also passed on the amended source; the earlier 143-test host
result belongs to the preceding source, not a fresh full-suite run of the amendment.

Independent syscall and packet review found no physical-device opens or INET
connections in any fixture process tree. Separate read-only production checks
matched all **505 installed files**, the same sole physical serial owner,
configuration, journal and service units; motors continued reporting disabled.
No production installation, service restart, Wake, Sleep, Stop or motion request
was sent. This is not fresh visual hardware validation, a network endurance
test, electrical qualification or evidence that increased P improves following.

Package review permits exactly six changed installed members: the native image,
its stub and RECORD, the two Python maintenance/recovery modules and daemon
RECORD. All other wheel members match the retained rollback wheels. Downloaded
evidence hashes were verified before removing four exact remote staging trees,
about 355 MB, including archived abandoned virtual journals. Existing backup
archives were reused; no new full backup, publication or mode correction occurred.

The candidate remains **uninstalled**, and the physical comparison is **unarmed**.
The next stage is a separately authorized, attended exact-file installation and
disabled overhead check, followed by the prepared motor-15 P300/P360/P300 test
using two-second vertical ramps and ten-second holds. Fresh identity, original
registers, matched starting pose, ownership and recovery checks remain mandatory;
original P/profiles must be verified before factory Wake/Sleep. No physical gain
benefit or power-cycle/power-loss recovery is established by these PTY tests.

### October 19 attended installation and withheld comparison

The exact amended ARM candidate described above was installed during an attended
session. The installation changed six package members plus the private native
image pin, verified the loaded image inode/hash and all 505 installed files, and
retained the existing sole serial owner after one service stop/start. The existing
no-startup-Wake and no-shutdown-Sleep launcher policy was preserved. Existing
rollback wheels were reused; only exact small RECORD/configuration preimages and
metadata were added, rather than another environment backup.

Disabled trace off/on/off windows each collected 100 samples about 100 ms apart.
CPU use was 50.83%, 52.94% and 52.92% of one core; maximum sampled cache ages were
24.08, 23.51 and 21.93 ms. The trace contained 505 contiguous feedback events and
no target events. Original P, profiles, mode and disabled torque readbacks passed
before and after these windows. This is a short disabled overhead measurement,
not moving-performance, network-endurance or worst-case timing qualification.

The first intended original-P condition did not reach its movement stage:

1. Factory Wake completed and the operator confirmed a raised, settled head.
   One measured-hold setup target retained original P/profiles. The frozen
   comparison reference and its model paths passed dense review; no four-leg
   comparison target was sent.
2. Initial P preparation failed with `P-only transition requires fresh stationary
   hold`. No backup or gain-write attempt existed. Initial no-write closure also
   failed its check; a later explicit fresh closure succeeded on the same owner.
   No service restart or Sleep/Wake cycle was used for this recovery.
3. An optional target-pose state GET then returned HTTP 500 because maintenance
   retirement had cleared target intent and the state router asserted its
   presence. The private client now requests measured state without those optional
   flags and retains commanded intent in its own receipts. Missing target intent
   is not substituted with measured pose. This client change does not repair the
   daemon's optional-read behavior or weaken measured-state freshness checks.
4. Fresh preparation succeeded at original P300. Its 1,143-byte immutable
   preimage was downloaded and verified before explicit hash confirmation. The
   private client also corrected a pre-grant readiness check: intentional
   maintenance readiness suspension is accepted only for the exact prepared
   session, parameter kind, backup digest and inactive-motion state. Readiness and
   fresh matched-pose checks remain required after a successful handoff.
5. The actual `handoff-p` call was refused. The Python exception path called
   native revoke before retaining the native fault, leaving `ReclaimingLocked`
   and a generic unavailable response. There was no returned lease, movement job
   or candidate Apply. The underlying handoff reason is **unknown**; the earlier
   stationarity failure does not prove the cause of this later refusal.
6. Explicit original restoration closed the same session. Independent readback
   verified original P and profiles, position mode and unchanged drive mode.
   Factory Sleep then completed normally, and the operator confirmed asleep and
   settled. Final checks found disabled motors, the expected loaded image and
   505-file inventory, the same sole owner, no pending marker, no inhibition and
   no feedback-recovery requirement.

P360 was never applied, and no comparison movement or gain-benefit result exists
from this attempt. The candidate remains installed with original register
settings restored. Failed and successful admission/closure receipts, exact
preimages, terminal records and visual confirmations are retained privately.
Redundant uploaded wheel copies were removed after verification; rollback
archives and receipts remain. Mode correction and website publication stayed
outside this session.

Before another moving attempt, preserve the original exception and native status
**before** revoke, retaining cleanup outcome separately. Add bounded per-joint
stationarity/anchor observations so a real handoff refusal can be diagnosed
without repeated hardware retries. Qualify that focused change with host/PTy
failure cases while preserving all existing fences. Synthetic handoff success
must continue to be reported separately from physical admission.

### October 19 P300 block and restoration policy gap

A diagnostic-only Python amendment retains handoff faults before revoke, with
separate cleanup evidence and bounded existing-cache observations. It adds no
serial reads or admission tolerance. Fifty-four focused host cases and the same
54 ARM cases passed. The disabled runtime check sampled advancing telemetry
with maximum cache age 22.15 ms. No physical devices were opened by the fixtures.

With explicit standing attendance authorization, factory Wake and stable fresh
telemetry admitted a new attempt. These are technical checkpoints; silence is
not recorded as visual confirmation. Original-P preparation, off-device backup
confirmation, physical handoff and a matched start passed. All four two-second
vertical legs and ten-second holds completed:

| Preliminary P300 leg | Translation error | Angular error |
| --- | --- | --- |
| Down 24 mm | 0.29 mm | 0.79° |
| Return upward to neutral | 4.19 mm | 3.23° |
| Up 10 mm | 6.65 mm | 5.89° |
| Return downward to neutral | 0.30 mm | 0.46° |

Four traces qualify: 2,436 complete frames and 2,500 feedback events. Thirty-two
bounded register brackets verified original P. Sampled voltage was 7.2–7.5 V;
peak sampled PWM/current magnitudes were 106/64 raw. Sparse reads cannot exclude
brief transients. Upper-target median delivered-goal minus cached-position errors
for the six head joints were +2, −52, +38, −2, +91 and −63 counts. The following
error remains; no candidate P or gain-benefit result follows from this block.

Reclaim revoked output, but restoration refused. The body goal stayed at 2049
counts while its measured position changed from the immutable preimage's 2049
to 2050. The P-only comparison required exact excluded encoders, unlike the
profile path's already qualified restoration allowance. Additional fresh P300
restoration checks stayed refused. They cannot write a gain: only P300 is valid
in that transaction, restoration desires P300, and other values reject before
the write branch. No target or unknown candidate write was replayed.

The fix permits ±1 signed encoder count relative to the immutable original only
for restoration/closed revalidation after journaled head motion. Excluded goals,
configuration and profiles stay exact. Paired stationarity, health, ownership,
identity/version, generation and readback checks remain. Preparation, Apply,
handoff and reclaim policies are unchanged; this grants no output.

Eighteen focused native tests and five actual ARM/PTy cases passed. These cover
same-owner P300 restoration, cross-process P300/P360 restoration, refusal of two
counts or changed goals, live-owner exclusion and refusal of candidate/motion
authority during recovery. The P300 cases made zero parameter writes; the P360
fixture made the candidate/original pair. Syscall review found generated PTYs
only and no fixture INET connections. Packaging setup failures are retained as
failed evidence; they installed nothing.

The qualified native image and RECORD were installed, reusing rollback archives
and small exact RECORD/configuration metadata preimages. After the old owner
exited, an explicit restore-only custodian closed the physical P300 session and
exited. It preserved torque and granted no ordinary control. A physical power
cycle then reset torque for guarded no-reboot startup. This also expired the
deliberately temporary `/run` observer/maintenance overrides, which required
restoration before further maintenance. Post-reboot normal-service reads verified
disabled motors and original settings; no automatic Wake was used.

The first P300 block used the preceding image. A fresh matched A/B/A on the final
same image is therefore a separate experiment; the preliminary block is not
silently reused as its first condition. P360 has not been applied at this dated
preparation checkpoint. The earlier intermittent handoff refusal remains
distinct from the diagnosed closure defect. Mode correction and publication
remain separate; no new full backup was made.

### October 19 same-image P300/P360 comparison and interrupted A2

After the operator's power cycle, disabled checks and restoration of the reviewed
volatile observer/maintenance overrides, the same final native image served every
condition. A1 and B completed four daemon-local, head-only, minimum-jerk vertical
legs: down 24 mm, neutral, up 10 mm, neutral, each lasting two seconds followed by
a ten-second hold. B changed only motor 15's RAM P300 to P360. Wake and Sleep used
original gains/profiles, with verified restoration between conditions. Existing
rollback archives were reused; only exact small transaction preimages were added.

The first post-maintenance poses differed from the frozen common reference by
0.001 mm / 0.0005° in A1, 0.60 mm / 0.81° in B and 0.54 mm / 0.56° in A2.
Each admitted path had a fresh measured-start check and a 1,025-point offline
model review. The preliminary older-image P300 block was excluded.

| Completed leg | A1 P300 pose error | B motor-15 P360 pose error | Motor 15 held error, A1 → B |
| --- | --- | --- | --- |
| Down 24 mm | 0.23 mm / 0.91° | 0.28 mm / 0.81° | 3 → 2 counts |
| Upward return to neutral | 4.91 mm / 4.11° | 4.29 mm / 3.09° | 74 → 59 counts |
| Up 10 mm | 7.33 mm / 5.97° | 6.68 mm / 4.64° | 86 → 60 counts |
| Downward return to neutral | 0.27 mm / 0.50° | 0.13 mm / 0.39° | 4 → 4 counts |

Errors are measured FK pose residuals and absolute terminal median delivered-goal
minus cached-position errors, not optical measurements. At every corresponding
held target, all six delivered head goal counts matched exactly between conditions,
and bounded independent servo-register readback matched those delivered goals.
At the upper target, the six signed errors were `[1, -57, 47, 0, 86, -69]` counts
in A1 and `[1, -56, 47, 2, 60, -65]` in B. The selected joint improved while other
joints retained substantial errors. This is consistent with a position-loop/load
contribution after correct target delivery, but does not distinguish friction,
gravity, assembly/calibration, controller behavior or electrical transients.

A2 completed only its initial down leg, with 0.25 mm / 0.82° residual and a
2-count selected-joint error. After its capture had been sealed, exported and
cleared, native feedback failed while output was paused. The retained first-fault
receipt reports a motor communication error, a completed job and the same owner.
HTTP and SSH remained reachable. No return target or later A2 target was sent.
This is not evidence of the earlier laptop route/network outage.

Recovery retained the same owner and revoked output. Explicit original-P
restoration first refused an invalid head-register response. A subsequent fresh
P300 reconciliation read closed the transaction without a gain write; P300-only
validation rejects other values before its write branch. The explicit, exact
restored-session acknowledgement required fresh cached feedback and restored
readiness without replaying a target, followed by completed factory Sleep.

One fresh A2 attempt was retained separately. Its completed Wake and measured
hold settled 0.72 mm / 1.16° from the original reference. The unchanged 1° start
criterion withheld preparation, gain application and comparison targets. The
reference was not rebased. Factory Sleep then completed normally by task events;
the operator's silence was not recorded as a new visual confirmation.

The nine completed traces all qualify coverage and terminal holds: **5,489 complete
frames, 5,623 feedback events and 72 native loop-register brackets**. Sampled
cache age stayed below 25.2 ms during those completed legs; that does not erase the
subsequent feedback fault. Sampled voltage was 7.3–7.6 V, peak raw PWM/current
magnitudes were 106/58; these bounded reads cannot exclude brief supply dips.
The selected motor's upper-hold PWM/current medians were 100/57.5 in A1 and
84/45 in B, so greater P did not simply mean greater sampled output at that hold.

**The A/B/A is incomplete.** The approximately 20% and 30% selected-joint upward
error reductions are provisional A/B observations, with no restored-P300 upward
repeat or independent optical ground truth. Standing attendance authorization
covered execution; no visual smoothness ranking is inferred. No gain adoption,
mode correction, current/PWM limit change or power adjustment follows.

Final independent verification confirmed the reviewed loaded native image, all
505 package files, a sole owner, original gains/profiles and unchanged protected
settings/modes, disabled motors, ready guarded service and no pending transaction.
Thirty advancing disabled feedback samples had maximum age 22.9 ms. Logs and raw
receipts remain private. The next focused work is lower-level communication fault
retention and deliberate common-pose acquisition, then the missing original-P300
upward legs under a clearly versioned starting-pose protocol.

### Communication and common-start preparation, October 19

The uninstalled diagnostic candidate retains the original periodic position-read
error before its public-facing generic exception. A bounded cache holds the first
failure since owner start and the latest eight failures, with sequence, time,
operation, I/O kind and limited text. Successful feedback does not erase it.
The private getter only reads memory: no queue entry, serial read, clear, recovery
or command retry. Register parsing now distinguishes header, motor ID, length,
CRC, status instruction/error, stuffing/data size and header/body read failures,
retaining the expected motor and data width. All existing validation remains.
The Python owner attaches the bounded cache to private immutable first-fault and
admission receipts; API failure or receipt failure cannot remove inhibition or
restoration authority. Ordinary status does not echo raw diagnostics.

Host qualification passed **7 new native diagnostic cases**, **23 existing
register cases**, **18 existing P-motion cases**, and **58 Python cases** covering
new diagnostics/acquisition and retained admission/recovery behavior. The first
host fixture attempt lacked retained inventory metadata; a later attempt's audit
also blocked Windows asyncio's internal socketpair. Both setup failures are
retained. The final audit permits only that exact stdlib ephemeral self-pipe,
while continuing to block robot/external network connections and device opens.
ARM cross-compilation passed using the cached compiler; this is not ARM runtime
qualification, a device installation or physical evidence.

Common-start protocol 2 uses a separate, explicit **original-P300** head lease
and the existing head-only local generator. After factory Wake and a measured
hold, each condition acquires the same frozen pose with an unscored +10 mm
staging request followed by a downward return to neutral, two seconds per leg
and ten-second holds. Each leg requires fresh actual-start model clearance over
at least 1,025 samples and a second freshness/drift check before submission.
The measured staging pose must actually be at least 2 mm above neutral; a nominal
upper target alone does not authorize the return. Neutral requires five fresh,
advancing, stable samples within the unchanged 1 mm / 1° gate. Exact original
restoration and a further fresh neutral check precede comparison preparation.

The separate acquisition entry allows only a reviewed interior Wake residual
within 5 mm / 5°; this is not a wider scored starting-pose tolerance or broader
ordinary control authority. Existing native admission/path guards still apply.
Exclusive intents precede the two targets. Unknown completion, stale feedback,
changed ownership/settings, a missed neutral or uncertain restoration withholds
comparison; there is no write replay, automatic compensation or automatic Sleep.
The adapter accepts only an already qualified original-P300 existing-owner lease;
it creates no native controller, connection or gain-writing authority.

Every condition of a newly matched comparison must use this acquisition history.
Completing missing P300 legs under it is a labelled follow-up, not a retroactive
completion of the earlier A/B/A. Physical success of the acquisition remains
unproven. Mode correction and higher-P experiments remain separate.

### Meaning and limits of Position P Gain

P300/P360 denote raw **Position P Gain**, the proportional term of the servo's
internal PID position loop at register 84. The component manual gives internal
gain as raw value / 128: 300 means 2.34375, and 360 means 2.8125, a 20% increase
in the proportional coefficient. It does not directly specify torque or change
the supply, output limits, target angle or mechanical capability.
For the observed XL330-M288 model, ROBOTIS lists a register range of 0–16,383 and
an initial value of 400. That is neither a Reachy-specific recommended tuning
range nor evidence that any larger value is safe under this coupled load.
See the [ROBOTIS control table and controller description](https://emanual.robotis.com/docs/en/dxl/x/xl330-m288/#position-pid-gain80-82-84-feedforward-1st2nd-gains88-90).
Review any later small increase separately, retain original settings and compare
held error, transient overshoot/oscillation, temperature and output before adoption.
The qualified maintenance entry still admits only P300/P360; this preparation
does not add P400 or other higher values.

### Communication and common-start isolated ARM runtime, October 19

The exact native ARM extension and daemon wheel were extracted into private
overlays and imported with isolated Python. Installed packages, service files,
native-image pin and the production serial owner were not replaced. The initial
58 Python cases passed on ARM, but integration also reproduced a real mismatch
missed by the earlier adapter-only mocks: a measured 0.7 mm sideways / 1.16°
starting offset could not reach the frozen reference through the existing
strictly vertical lease. That refusal was correct; the adapter was incomplete.

The amended private `configure-common-start` operation is explicit and requires
the current authenticated, attended-marked fixture capability, owner, fresh
feedback and an original-P300 native transaction with no candidate write.
Configuration is one-time before its first target, with explicit path clearance
and a reference within the separate 5 mm / 5° acquisition envelope. It permits
exactly the frozen reference +10 mm followed by the frozen reference itself,
both at two seconds. The return additionally requires completed staging and a
measured position at least 2 mm above neutral. Other targets, a third target,
P360, changed capability and stale feedback refuse. The ordinary vertical lease,
scored 1 mm / 1° start criterion and native parameter authority are unchanged.

The first complete native integration ran both legs and closed the P300
transaction, then correctly failed its immediate fresh-cache check. Periodic
sampling pauses during maintenance, and known restoration can finish before a
new sample is published. The final adapter therefore adds a read-only wait of
at most two seconds after acknowledged original restoration. It requires the
same ready owner and a finite, fresh, advancing sample; communication exceptions
and invalid data fail immediately. Persistent staleness still withholds comparison.
Neither timeout nor eventual freshness grants a new target, lease or parameter
write. A further common-pose check remains mandatory before scoring.

The final candidate passed **68 focused Python cases on ARM** and **14 actual
native-worker PTY cases**:

- A locked, disabled-only fixture made 100 identical diagnostic-cache queries
  with zero additional serial instructions.
- Nine malformed-register cases retained distinct header, ID, length, CRC,
  instruction/status, stuffing, header-timeout and body-timeout details.
- Periodic CRC/timeout faults retained the original detail behind the unchanged
  generic feedback exception, kept bounded history, and survived later valid reads.
- A paused-output feedback fault retained its private receipt and recovery access.
  Injected restoration CRC failure stayed locked; explicit original-P300
  reconciliation and fresh-cache acknowledgement then succeeded without a gain write.
- The combined case used the actual native extension, daemon manager and Pollen
  head-only generator through both acquisition legs, paused output, original
  restoration and verified common-start completion.

The combined case's pose/IK and dense-review provider were **synthetic**. It does
not qualify the actual robot's kinematic path, measured accuracy or mechanical
following. All targets went only to generated PTYs. The peer verified six-head
packets and zero mode, torque or gain writes; all fixture processes exited.
Syscall traces admitted only generated PTYs and standard null/random devices,
with no physical serial-device opens or fixture INET connections. An initial
fixture checked the package wrapper hash instead of the compiled extension hash;
that fixture failure and both integration failures remain retained, separate from
the final passing run.

Final production reads confirmed the same sole physical owner, unchanged hashes
for all 505 installed package files and protected private configuration, ready
service, disabled motors, no running motion or pending transaction. Ten advancing
cached samples had maximum age 20.5 ms. These are technical observations, not a
new visual confirmation. No production installation/restart, Wake, Sleep, motion,
mode correction or gain change was sent. Existing rollback archives were reused;
no full environment backup or website publication was created.

Next is fresh attended admission for an exact reviewed deployment, then disabled
overhead checks and physical common-start validation before scoring a P300
follow-up. A new matched gain experiment must use the same acquisition protocol
for every condition; it cannot retroactively complete the earlier A/B/A.
