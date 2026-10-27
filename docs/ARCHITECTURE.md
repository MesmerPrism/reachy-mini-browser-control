# Architecture

One repository owns the app. The hosted website receives a static deployment
projection; it does not supply source authority, configuration or runtime services
for the local bridge. Optional device/Quest launch adapters can remain outside
the app and introduce no required runtime dependency.

The [teleoperation research guide](research/README.md) records candidate planner
and execution changes separately from the implemented architecture below. Its
dated reports and offline scalar benchmark do not install a follower, select a
trajectory-library dependency or qualify a new robot transport.

The October 26 broader P screen extends private single-head P300/P360 telemetry
authorization to motors 11–16 while retaining higher-P restrictions on 15/16.
Its current campaign selects motors 12 and 13 separately. A pinned host assembly
integrates original-only recovery with actual host backup witnesses and
production status/journal readers. It preserves failed receipts, native guards,
finite budgets and the original planner, and adds no browser control authority.
The dated status records 20 captured scored legs and four withheld final-control
legs after communication faults. Known restoration and feedback acknowledgement
remain distinct from historical fault receipts. Closing a partial experiment
does not grant authority to replay unissued targets or extend its finite budget.

The later private serial comparison uses the same existing native owner and
logger with a reversible daemon CPU-affinity transaction and an independently
verified restoration timer. It adds no browser authority or servo-code change.
Its reusable recovery controller has only original Restore and feedback
acknowledgement mutation ports, durable one-shot claims and current owner/pending
checks. The concrete adapter defers ordinary register reads while native
recovery is locked, requires exact originals after closure, and checks sample
freshness before any slow post-response census can age it artificially. Unknown
candidate or motion outcomes remain parked. Live idle qualification and saved
active-recovery replays are recorded separately in the dated status.

The [matched trajectory experiment](TRAJECTORY_COMPARISON.md) adds an offline-only
preparation tool and injected execution policy outside the browser command API.
It retains capped PC progress, reproduces Pollen's pose interpolation, and records
daemon task acceptance separately from measured arrival. Its private owner binding
has synthetic tests. A later attended attempt qualified the bounded observer and
actual model path but could not re-establish its frozen starting pose after the
first outward movement. The three-arm physical comparison remains incomplete;
see its dated record rather than treating partial execution as qualification.

The later [six-axis runner](MOVEMENT_COMPARISON_MATRIX.md) adds a fourth,
[persistent bounded follower](BOUNDED_FOLLOWER.md). It carries commanded p/v/a in
a fixed body-aligned translation/rotation-vector chart, with conservative
whole-polynomial bound checks and finite duration search. It is experimental
tooling outside the browser runtime. Its owner port retains one existing
controller across a whole condition; its attended session has explicit power,
visual and axis-block stages. The demonstration CLI is synthetic only. Current
actual-path/clearance and reset-receipt providers are mandatory for hardware
integration; the private attended binding supplies them without a new serial owner
or daemon deployment. The later partial results are dated in the matrix record.

The October 25 private vertical campaign adds a separate telemetry execution
authority to the native P/I entry points and existing daemon owner. It preserves
the attended API defaults. A private configured campaign binds the reference,
model-review scope, expiry and finite preparation/leg budgets; autonomous frames
explicitly report no attendance or visual observation. Sessions cannot switch
authority, and expiry blocks new motion while retaining original-setting recovery.
The campaign permits motor-15 P300/P360 or the single-upward I0/I1 experiment,
with two-second vertical legs and existing measurement, queue and recovery gates.
It does not enable autonomous browser control or install the separate mode fix.
The shared awake P/I guard tolerates a one-count antenna measured-position span
against its immutable prepared snapshot while keeping goals/configuration exact.
A private client can reconcile original settings after a fresh, bound health
rejection without rebuilding the native owner. It never retries motion or
candidate-gain application after an uncertain result.

The later paired-P extension adds an explicit parameter-kind opt-in for ordered
motor-15/16 P300/P420 vectors. Both gains share one immutable preimage and durable
attempt marker; uncertain partial application remains locked for original-only
reconciliation. Model-review pins distinguish the single-upward interaction
comparison from its four-leg direction follow-up. These remain private experiment
capabilities outside browser control. A separately pinned on-device wrapper can
execute the existing stage programs consecutively, retaining their individual
checks and receipts while reducing PC round trips.

A default-off wrapper observes the existing sole serial port without adding bus
calls or changing parser/retry behavior. Its finite ring records IO boundaries,
bytes, timestamps and operation/generation context. The first fault window freezes
after a bounded tail while a second finite ring continues recording recent events.
Stopped export is a sequence-ordered union of at most 8,192 events, with cumulative
fault-observation counters and explicit first/recent coverage and loss metadata.
Multiple IO/operation markers can describe one failed poll. Capture-ID comparison
and authenticated stopped-snapshot paging
preserve evidence without resetting an unknown capture. Omitted bytes, overwritten
events, contention drops and approximate clock alignment remain explicit. This is
diagnostic instrumentation, not a serial recovery or motion-admission bypass.

Private UART experiments can observe kernel counters alongside existing cached
feedback and temporarily move the shared UART interrupt to one other CPU. An
independent root-owned timed restoration service is armed before the setting
write. Both requested and effective interrupt placement must match the condition;
exact originals must be verified after restoration. Cache publication gaps during
maintenance remain recorded gaps in the observer. The existing motion actor still
enforces its unchanged feedback freshness and recovery gates before targets.

Protocol 3 adds read-only centering checkpoints and explicit continuation after
qualified telemetry interruptions. A missed return remains a miss; an extended
residual needs exact actual-path review within the unchanged global chart bounds.
The same session retains interrupted rows and resumes only unissued legs after
confirmed Stop/drain and current idle/native qualification. Bounded GET waits
suspend PC output without catch-up; running daemon tasks still Stop on stale
feedback. Historical prefixes are references, not new-protocol scores. These
changes remain experiment tooling outside ordinary browser control. They were
exercised in partial attended captures, with failed/excluded rows and mismatched
achieved timing retained; that is not general physical qualification. See the
[protocol](MOVEMENT_COMPARISON_MATRIX.md#protocol-3-centering-checkpoints-and-continuation).

The focused vertical-plan factory reuses these providers and guards for a separate
four-leg experiment. Its canonical one/two-second presets apply only to
daemon-local vertical comparisons, with explicit experimental reference-speed
limits. They do not expose a faster ordinary browser control mode or change the
bounded follower. See the [API](MATRIX_RUNNER_API.md#focused-vertical-experiments).

| Surface | Responsibility |
| --- | --- |
| `src/` | Local React UI, model visualization, shared control/setup logic and telemetry guards |
| `public-site/` | Hosted entry point, Wireless SDK connection, guided setup and simulation |
| `server/` | Loopback bridge, daemon identity/version checks, motion arbitration and media guards |
| `test/` | Offline protocol, state, recovery, setup and export fixtures |
| `tools/` | Local setup, read-only diagnostics, portable builds and reviewed source export |
| `docs/` | Public setup, architecture and dated compatibility/verification notes |
| `licenses/` | Bundled dependency license notices |
| `local/` | Ignored configuration, private receipts, build projections and optional CAD caches |

The local UI talks to the Node bridge on loopback. The bridge checks the configured
robot identity and daemon version before admitting control. It coordinates writes,
rejects invalid targets and keeps uncertain outcomes behind recovery locks. Local
head controls require prior operator approval. Stop drains pending writes and uses
fresh measured positions for a hold.

Mandatory snapshot reads share one in-flight batch and drain every endpoint even
when one fails. Read timing includes response headers and JSON-body completion;
the 500 ms freshness gate still measures from the batch's start. Optional media
status refreshes at most once per 1.5 seconds and does not admit motion.

Motion workers use one sequential status monitor with at least 100 ms between
attempt starts. A slow read is followed without an additional idle interval;
concurrent browser/guard reads still share the same mandatory batch. Owner cleanup
stops further monitor scheduling. This increases maximum monitor polling from
4 to 10 attempts per second. A bounded disabled-device comparison retained fresh
reads without overlapping mandatory batches, at higher GET traffic and with a
small observed change in daemon loop frequency and peak intervals. One subsequent
instrumented yaw trial retained freshness under monitor, observer and native
diagnostic load but still failed measured settling. These bounded trials do not
qualify wider moving/browser/media load; see [disabled polling](HEAD_RESPONSE.md#disabled-polling-load-qualification)
and [yaw capture limits](HEAD_RESPONSE.md#new-polling-yaw-capture).
Stale faults retain cached start-age/read duration and pending-read start-age separately. The
500 ms gate, recovery fencing and measured arrival requirements remain unchanged.

Diagnostics retain the last slow snapshot and report manual-head per-axis error, combined
angle/translation error, and whether the read began after the acknowledged write.
Optional daemon state timestamps and native head-joint values are retained with
their HTTP read times for diagnosis. They do not assume synchronized clocks or
establish sensor freshness merely because an HTTP read completed.
Head arrival requires the existing combined 1° / 1 mm tolerances and a post-write
read; diagnostics do not cause target replay or calibration compensation.
Limited manual ramps send their exact bounded endpoint, including any final
remainder below 0.01° or 0.01 mm, before entering settling. A retained manual-write
receipt distinguishes pending, acknowledged, failed and unknown outcomes and records the
sent six-axis pose, matrix, body yaw in radians, epoch, sequence and duration.
Faults retain that receipt before recovery clears the goal; a subsequent measured
hold does not overwrite the failed destination's evidence. An acknowledged goal
still requires fresh measured arrival and does not authorize another write.

For controlled comparisons, `head-target` accepts an optional `bodyYawReference`
in radians. It must be finite and within 0.25° of fresh measured body yaw at
admission, refresh and worker execution. It binds the exact body target across
separate head commands without replacing measured feedback. Omission preserves
the usual measured-body baseline. Stop/recovery still hold measured state;
the reference does not change their behavior or the head arrival tolerances.
An explicit local diagnostic owner may select an immutable constructor tolerance
up to 2° for this reference. The default remains 0.25°; browser commands cannot
select or change the constructor policy. The private body-relative range survey
uses 2° during each leg and records that policy in its frozen plan. Freshness,
finite targets, endpoint matching and recovery remain separately enforced.

The hosted app connects through the pinned official JavaScript SDK. Its adapter
validates identity/version and measured state, but bridge-specific Stop/recovery
guarantees do not automatically apply to the SDK transport. Shared telemetry guards
reject incomplete or stale state before it can refresh a control baseline.

Guided setup is a separate capability surface: explicit Bluetooth probes, bounded
direct requests to a chosen local host, and robot-owned browser handoffs. Network
submission and optional updating require explicit input. Lost responses remain
uncertain; submissions are never replayed. Network setup success does not admit
a new daemon version for motion control.

The hosted reconnection guide is an observation and navigation surface. It creates
validated local status links, selects bounded facts from manually copied JSON and
checks browser Bluetooth availability only after explicit input. Capability checks
do not open a chooser or contact a robot. Privileged maintenance stays in Pollen's
official console/app; the guide offers attended physical recovery and preserves
the distinction between uncertain restart replies and freshly verified connectivity.
It adds no reconnect replay, automatic Wake, admission exception or required
integration with another project.

Its second-device comparison separates a device/browser access problem from a
failure shared across devices, without claiming a timeout diagnoses OS routing.
The guide explains the observed NetworkManager local-route failure and the
limits of daemon restart, a network-specific workaround and an offline candidate
fix. It does not execute SSH, change routes, disable conflict detection or install
packages. A future privileged maintenance helper would need its own authenticated,
explicitly authorized capability and rollback contract; it is not part of this
release. The experimental OS patch is not bundled with the MIT controller.

`npm run build` produces the local UI in `dist/`. `npm run build:pages` produces
static hosted assets in `local/pages`, with relative URLs by default and an optional
deployment `--base`. Neither command publishes or fetches private CAD. The original
schematic is the default model; private official CAD preparation is a separate
opt-in command.

`tools/Export-Public.mjs` constructs source downloads from a reviewed allowlist,
checks privacy and emits hashes. Release manifests record the clean Git HEAD as
`sourceRevision` and the reviewed source inventory hash as `sourceTreeSha256`.
Reusing a release version with different bytes fails before replacement.
The manifest binds canonical repository paths and static `sitePath` projections;
CI files use `github/workflows/` on the website because Pages reserves `.github/`.
ZIP paths retain the normal `.github/` layout.
It excludes Git history, configuration, private
evidence, dependency installations and generated CAD. See [contributing](../CONTRIBUTING.md)
and [status](STATUS.md) for review and verification boundaries.

Spatial gestures share pure screen/angle mapping between local and hosted views.
The page agent console translates a bounded grammar into the existing adapter;
its WebMCP tools and explicitly armed, session-scoped writes add no separate robot
transport. WebXR owns presentation and relative rotation mapping; the parent
retains connection, epoch, authorization and Stop authority. Every XR stream is
bound to the control context that admitted it. These optional interfaces do not
require a Quest installation or Rusty Morphospace service.

The hosted target staging helper bounds head and antenna sending to 15 seconds
after deliberate input. Loop iterations do not renew that deadline. Only a later
telemetry receipt can satisfy the unchanged explicit-axis comparison; this is
measured convergence, not a daemon acknowledgement or physical arrival proof.
Expiry discards unsent intent without automatic Stop, hold or command replay.
Connection and telemetry guards retain authority over every send.

`controller-diagnostics.mjs` projects a bounded read-only summary from the current
adapter snapshot. The page disclosure, agent command and WebMCP diagnostic tool
perform no network reads or writes. They omit identifiers, endpoints, raw errors
and credentials. Hosted receipt freshness, session-only ownership and queued-only
targets remain distinct from the local bridge's recovery contract and from demo
simulation. Sensor age and unavailable evidence are reported as unknown.
The local native state read also requests optional measured joints. The daemon
1.10 response timestamp is labelled as response construction, never sensor age.
Targets are excluded from measured feedback. Read [head response](HEAD_RESPONSE.md)
for deferred inverse kinematics and native target-state serialization limits.

The optional private native/daemon [joint trace](JOINT_TRACE.md) observes the
existing owner, grouped head writes and cached reads. After ARM/runtime and
disabled-only qualification, eight attended vertical traces were collected;
six have complete coverage. A later recorder fix removes exclusive append
contention using distinct preallocated slots. It is now installed in the private
device candidate and has passed disabled feedback-only overhead checks; loss
under concurrent physical movement producers remains unqualified.
It cannot authorize motion or create another serial controller. Its recorder
does no per-frame file I/O or extra bus polling; post-barrier export and the pure
public analyzer preserve explicit coverage exclusions. It is not a page feature
or a required browser runtime dependency. The separately prepared
[servo-profile experiment](SERVO_PROFILE_EXPERIMENT.md) has a native
entry for disabled-only maintenance on that same worker. It fences commands by
generation, persists pending state before admission, reuses exact preimages and
requires ACK plus independent readback. Pending state inhibits construction
before port opening. Unknown outcomes retain inhibition until explicit fresh
restoration or qualified no-write closure. The recorder fix is retained; no new
browser or HTTP API is added. The ARM release build and isolated PTY profile and
recorder fixtures passed, with no physical device opens or production changes
at that checkpoint. The subsequent candidate attaches a default-off private
Unix-socket maintenance service to the existing daemon owner, fences ordinary
and delayed requests, and adds explicit cross-process recovery under an OS lease.
Its bound v2 journal and immutable preimage admit restoration only; normal startup
stays inhibited by pending state, and the custodian never enters ordinary control.
The changed candidate now passes isolated ARM runtime qualification of the actual
startup hooks, backend constructor, private service and producer/custodian transition
on generated PTYs. Media/kinematics initialization and ordinary publisher/listener
execution are inert fixture surfaces. Fourteen rejected processes stop before
serial opening; partial-write restoration and no-write closure pass. Process-tree
syscall and production-file/sole-owner audits show no physical access or production
change in that isolated test. Later attended disabled-only physical qualification
completed six head profile writes and six exact restoration writes, unchanged
closure and read-only cross-process closure. All nine final torque/profile
readbacks, the installed package inventory and sole owner were verified.
This does not qualify motion with changed profiles.

Physical qualification added exact model checks for body/head versus antenna
motors, and a bounded stationarity test accepting at most one raw velocity unit
with Moving=0, disabled torque and stable encoders/configuration across two
fresh snapshots at least 200 ms apart. Native Python close releases the GIL
while joining the worker; host and ARM regressions reproduce the earlier
deadlock and verify closure. A temporary runtime startup adapter explicitly
selects no gain initialization, no startup Wake and no shutdown Sleep because
the unchanged CLI supplies a default gain configuration. It is private test
infrastructure, not a persistent launcher change or public installation feature.
A later candidate implements the awake handoff described
in the [profile contract](SERVO_PROFILE_EXPERIMENT.md#awake-handoff-offline-contract).
Its separate awake journal keeps ordinary commands inhibited while granting a
session/generation-bound head-only output path. The private experiment uses the
existing daemon-local trajectory and publisher, suppresses unchanged body/antenna
outputs, and revokes queued targets before maintenance resumes. It does not
enable a new browser control mode. The amended candidate passed isolated ARM PTY
qualification of awake recovery and pause/recorder boundaries, then was installed.
Two subsequent Python-only fixes retain epochs across bounded publisher-lock waits
and project bounded measured FK rotations while keeping requested poses strict.
See the [device checkpoint](SERVO_PROFILE_EXPERIMENT.md#awake-handoff-installation-and-admission-fixes).
Attended changed-profile movement qualification is still required.
Existing motion and recovery guards retain authority. Mode correction is separate.

The first physical original-profile vertical leg passed trace coverage; its return
failed and exposed two continuation gaps. Pollen goto/play_move reconstructs
omitted body/antenna targets from measured starts, which can conflict with the
lease's held values. Readiness-dependent observer routes can also block sealing
after a fault. An offline-qualified Python candidate now adapts `GotoMove` to
emit only head samples while retaining Pollen's head interpolation. Private
trace stop/snapshot/clear resolve the current live backend/native owner without
requiring readiness, retaining loopback/token and exact capture-handle checks.
Trace start and all motion admission remain gated. First-failure codes survive
revocation without returning raw exception text. The exact candidate subsequently
passed isolated ARM/PTy qualification of repeated head-only legs, the slow return,
inhibited export and explicit original restoration on one simulated owner. The
production owner/packages/journal remained unchanged. This candidate is still
uninstalled; attended physical comparison qualification remains pending.
A separately qualified restoration-only native correction
allows one-count excluded encoder noise after journaled head motion, with excluded
goals/configuration exact and no new output authority. It cleared the physical
transaction; final factory Sleep and disabled maintenance startup were confirmed.
See the [physical recovery record](SERVO_PROFILE_EXPERIMENT.md#first-physical-leg-and-restoration-only-recovery).

Phone input is a separate simulation-only motion owner. The inert orientation
source starts only after a user action, converts device/screen coordinates to the
XR convention, and keeps original browser timestamps. The follow guard requires
held input, a fresh measured baseline, matching epoch and demo admission. It
returns rotation only and never sends commands. The parent synchronously fences
competing input through the captured phone control context; loss drops staged
intent before the existing software Stop path.

Manual offer/answer codes establish a local WebRTC data channel between a phone
sender and one demo tab. No backend, robot credential or robot connection is
available to the sender. The receiver explicitly approves input and uses bounded
challenges, sequences and conservative age limits. Approval generations are
separate from periodic freshness challenges, so Stop/reapproval requires a new
held gesture. Context replacement and reconnect never replay input. Each pose
carries a distinct gesture sequence and immutable press reference;
reference calibration cannot renew current-packet freshness. Lost releases
retire the previous hold before a fresh gesture may acquire input ownership.
The transition discards frames while Stop is pending and rejects expired handoffs.
These modules do not expose or relax the loopback bridge. See [phone controls](PHONE_CONTROL.md).
