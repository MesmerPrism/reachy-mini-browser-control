# Teleoperation research and decisions

Reviewed for documentation integration on **2026-10-16**. This guide connects two
user-supplied ChatGPT Pro reports to project evidence and pending decisions.
It is a research map, not an implementation specification or hardware approval.
[STATUS](../STATUS.md) owns dated verification results;
[ARCHITECTURE](../ARCHITECTURE.md) owns implemented behavior.

The working direction is a persistent planner that follows fresh intent while
retaining commanded position, velocity and acceleration. An original
[bounded carried-quintic prototype](../BOUNDED_FOLLOWER.md) now implements this
offline as condition D; production algorithm and execution location remain
undecided. First compare reference shaping and
execution location separately. Better-looking motion would not, by itself,
resolve the measured static error or establish safe interruption behavior.

## Reading paths

| Need | Start here |
| --- | --- |
| Understand the smoothness problem and likely causes | [Engineering report, evidence ledger and hypothesis matrix](2026-10-16-teleoperation-engineering.md#2-evidence-ledger) |
| Prepare the next discriminating experiment | [Engineering report, E0–E4](2026-10-16-teleoperation-engineering.md#7-a-small-high-information-experiment-campaign) and the decision gates below |
| Design continuous retargeting | [Retargeting report, mathematical design](2026-10-16-continuous-retargeting.md#e-mathematical-design) and [execution contract](2026-10-16-continuous-retargeting.md#f-execution-and-data-protocol) |
| Compare algorithms, licenses and limitations | [Retargeting candidate table](2026-10-16-continuous-retargeting.md#d-candidate-comparison) and [annotated sources](2026-10-16-continuous-retargeting.md#annotated-primary-source-catalog) |
| Reproduce the scalar examples | [Offline benchmark and recorded results](retargeting-benchmark/README.md) |
| Investigate the network disappearance | [Recovery findings](../RECOVERY.md#repeated-network-failures-october-13-findings), then [research networking appendix](2026-10-16-teleoperation-engineering.md#11-focused-networking-appendix) |

The full dated records are
[TEL-2026-10-16: teleoperation engineering](2026-10-16-teleoperation-engineering.md)
and [OTG-2026-10-16: continuous retargeting](2026-10-16-continuous-retargeting.md).
Their original source IDs remain local to each report: `TEL:S01` and `OTG:P4`,
for example, identify references inside different catalogs.

The [matched trajectory comparison](../TRAJECTORY_COMPARISON.md) now prepares
A/B/C with common targets, an offline Pollen-math oracle and a guarded private
binding. Its later attended attempt qualified the bounded observer but could not
complete a matched triplet. The [six-axis successor](../MOVEMENT_COMPARISON_MATRIX.md)
has four conditions, synthetic execution and explicit operator reset checkpoints;
the new follower/wider runner have no physical qualification. Neither result
establishes a smoothness benefit.

## Evidence vocabulary

| Label | Meaning here |
| --- | --- |
| Project observation | Dated project capture or operator observation, with its documented limitations. Historical evidence does not establish current robot state. |
| Project source review | Inspection or an isolated offline reproduction of identified code. It does not establish full-stack runtime or physical behavior. |
| External research finding | A report author's source interpretation, literature result or third-party developer account. Follow its primary citation and access limits before relying on it. |
| Scalar reproduction | Mathematical comparator/idealized protocol fixtures executed offline. No Reachy daemon, IK, serial link or trajectory-library runtime is involved. |
| Proposal | A candidate design, parameter or test; neither implemented nor device-qualified merely by appearing here. |

“Verified source” and “executed” inside the dated reports refer to the **research
author's** work. Importing a report does not independently validate all its claims.
Issue states, feature lists, release dates and branch URLs describe the report's
cutoff; they must be checked again when choosing a dependency or patch.

## Project evidence map

| Topic | Project record | Consequence for using the reports |
| --- | --- | --- |
| Visible unevenness and Sleep contrast | [Sleep-centering comparison](../HEAD_RESPONSE.md#october-16-sleep-centering-comparison) | Operator observations motivate a comparison. Sleep-center measured arrival remains unqualified because its observer missed the dwell. |
| Survey accuracy and contact | [Dated status](../STATUS.md), [range survey](../STATIC_ERROR_TEST_PLAN.md#october-16-wider-range-survey) | Request coverage is not usable-range certification. Seven of 99 attempts met the full arrival rule; all seven were vertical. Exclude the pressure-induced forward tilt and known contact poses from clean motion-quality tests. |
| Joint delivery and remaining following error | [Motor audit](../HEAD_RESPONSE.md#motor-conversion-and-delivery-audit), [servo-loop comparison](../HEAD_RESPONSE.md#moving-servo-loop-comparison) | Sampled goal/trajectory/present gaps remain a separate actuator-response problem. Sparse low PWM does not prove continuous nonsaturation or a firmware law. |
| Polling, cache age and native read load | [Polling qualification](../HEAD_RESPONSE.md#disabled-polling-load-qualification), [Sleep observer limits](../HEAD_RESPONSE.md#october-16-sleep-centering-comparison) | Preserve batch-start freshness semantics. Corrected native-observer pacing is offline-qualified, not yet hardware-qualified. |
| Fixed target from both directions | [Static-error plan](../STATIC_ERROR_TEST_PLAN.md), [matched-approach attempt](../HEAD_RESPONSE.md#unchanged-gain-matched-approach-attempt) | A requested opposite waypoint is insufficient; both approach sides must actually be measured. The incomplete pair does not establish hysteresis. |
| P-gain and mode experiments | [P-gain transaction](../P_GAIN_TRANSACTION.md) | A disabled changed-P roundtrip/restoration is not a qualified changed-gain motion benefit or enabled handoff. Keep mode correction separate. |
| Android phone and relay | [Phone control](../PHONE_CONTROL.md) | Current phone following/pairing is simulation-only. Both direct and relayed physical following need separate qualification. |
| Missing local subnet route | [Recovery](../RECOVERY.md#repeated-network-failures-october-13-findings) | Historical routing intervention is strong causal evidence for that incident. The original conflict trigger and general prevention remain unresolved. |

## Findings worth carrying forward

These IDs are stable handles for future implementation notes and results.

| ID | Finding and evidence status | Boundary / next question |
| --- | --- | --- |
| TRJ-C01 | **Project observation:** streamed motion looked uneven while Pollen Wake/Sleep looked smooth. | Aim policy, easing, duration, starting state and observation differed. The contrast does not isolate a cause. See `TEL:L1` and `OTG:B7`. |
| TRJ-C02 | **Project source review:** ordinary `GotoMove` uses common scalar easing and rigid-pose interpolation, including scalar-yaw handling. The separate general `minimum_jerk` utility is not its implementation. | Repeated rest-to-rest moves do not preserve arbitrary moving-state derivatives. See `OTG:B1` and `OTG:E3`. |
| TRJ-C03 | **Project source review:** playback, backend updates, native queue service and physical actuator response are different stages. A six-linkage-motor group write exists. | Nominal 100 Hz playback does not establish 100 Hz applied samples or simultaneous physical onset. Queue age in the reported physical trials remains unmeasured. See `OTG:B6`. |
| TRJ-C04 | **Project source review / scalar reproduction:** carrying commanded p/v/a can preserve C2 continuity; this alone does not bound jerk, overshoot or joint dynamics. | Qualify full segments, changing-axis rotations, IK and braking paths. Scalar benchmark peaks are not robot limits. See `OTG:E3–E7` and `OTG:G`. |
| TRJ-C05 | **Project source review:** pinned playback uses wall-clock time and lacks an explicit final endpoint evaluation. | Test endpoint and cancellation semantics separately. This does not explain the measured degree-scale static residual by itself. See `OTG:B3`. |
| TRJ-C06 | **Source cross-check:** pinned backend Sleep quiesces tracking, wobbling and speech offsets. | Match these policies in an awake comparison; their existence is not proof they interfered with earlier tests. See `OTG:B7`. |
| TRJ-C07 | **Isolated project reproduction:** same-thread asyncio coroutines can both enter the reentrant thread-lock pattern. | This is not a full daemon ownership failure reproduction or a diagnosed jitter cause. Preserve legitimate nested playback when evaluating owner tokens. See `OTG:B4`. |
| TRJ-C08 | **External research finding:** the reviewed SDK/WebRTC motion channel is reliable/ordered; its lossy pose channel is outbound telemetry. | Changing transport does not create latest-only motion semantics, expiry or application acknowledgement. Recheck the exact SDK/daemon before an adapter change. See `TEL:C4`, `TEL:§9`. |
| TRJ-C09 | **Scalar reproduction:** restarted quintics, carried quintics, constrained duration searches and filters have materially different lag/constraint tradeoffs. | The supplied package is reproducible, but none of these comparators executes Ruckig, rsruckig or Reachy. See the [benchmark record](retargeting-benchmark/README.md). |
| TRJ-C10 | **Project observation:** static joint error and the historical missing-route failure exist independently of visible reference irregularity. | Keep actuator, dynamic shaping, measurement load and connectivity outcomes separate. A smooth animation cannot close all four investigations. |

On 2026-10-16, integration review checked the existing five-file,
installed-matching interpolation/playback audit and its inert scalar/lock results.
It also checked the public pinned
[backend Sleep implementation](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/src/reachy_mini/daemon/backend/abstract.py),
and the Ruckig primary sources below. This was a selected cross-check, not a
re-audit of every source in either report. The private installed baseline includes
diagnostic modifications; the upstream pin alone does not identify all deployed bytes.

## Open decisions and experiment gates

| Decision | Working position | Evidence that decides it |
| --- | --- | --- |
| TRJ-D01 — trajectory state | Evaluate one persistent, transport-neutral planner with commanded p/v/a; keep the current capped ramp as a reference. | Offline continuity, finite-value, failure, source-age, late-ack and omitted-channel checks, then E1/E2. No new planner is installed by these docs. |
| TRJ-D02 — execution location | Start the replay/comparison work beside the Node bridge. Robot-local execution is conditional. | E1: PC linear (A), PC eased (B), local equivalent easing (C). B improving A supports shaping; C improving B under matched math/timing supports local execution. |
| TRJ-D03 — numerical engine | Ruckig Community state-to-state is a candidate; a smaller acceleration-limited governor remains an alternative. Neither is selected. | Pinned-library adversarial tests, failure containment, measured Windows/ARM cost and equal-limit response/lag comparisons. The scalar benchmark is not this qualification. |
| TRJ-D04 — orientation and bounds | Evaluate a compact fixed rotation-vector chart with explicit frame conventions before generalizing. | Check physical angular derivatives, chart boundaries, continuous IK/FK, joint excursions and stopping envelopes. Euler/component limits are not physical angular/joint guarantees. |
| TRJ-D05 — last-mile ownership | Preserve existing project guards. An atomic target snapshot, owner token and epoch-aware mailbox are possible daemon/native extensions. | Passive stage/queue-age evidence and release/retirement tests. Client coalescing cannot retract work already enqueued downstream. |
| TRJ-D06 — static accuracy | Continue unchanged-gain matched-target diagnosis separately. | E3: genuine measured opposite-side starts, complete identical six-axis destinations and target-stable motor brackets. Do not combine gain/mode/profile changes with the timing comparison. |

The focused report strongly recommends a persistent constrained planner; the
broader report recommends choosing the implementation after the matched
comparison. These are compatible as **a candidate interface now, deployment and
algorithm decisions after evidence**. Neither establishes a fundamental browser
blocker or guarantees that smoothing removes this robot's static error.

### Library boundaries

The versioned [Ruckig README](https://github.com/pantor/ruckig/blob/v0.19.4/README.md)
distinguishes local state-to-state generation from Pro predictive Tracking and
cloud-based Community waypoint calculation. Do not accidentally turn a local-only
planner into a service dependency. Disabled numerical axes also do not relinquish
robot-channel ownership.

The author's [maintenance statement](https://docs.ruckig.com/benchmark.html) and
[issue 255](https://github.com/pantor/ruckig/issues/255), checked on 2026-10-16,
identify Community numerical robustness concerns. Include those cases and nearby
inputs in qualification; do not infer a tested fix from an issue reference.
No Ruckig version was installed or executed during this documentation intake.
The Rust port has independent behavior and must be qualified separately; it does
not inherit upstream Pro guarantees. Source/license details and alternatives
remain in `OTG:C` and its annotated catalog.

### Next comparison, without another range sweep

Use the engineering report's existing experiment IDs so results can refer back
to a precise question. Each row is pending; these documents authorize no device work.

| ID | Question | Minimum useful record and interpretation |
| --- | --- | --- |
| E0 | Is the observer measuring the intended stages without excessive read load? | Check native cooldown inherited from prior reads; no hidden retry. Corrected raw reads are spaced at least 1.25 s after completion, separately from cached pose reads. Qualify this before interpreting a new center dwell. |
| E1 | Does easing help, and does execution location help further? | Match full measured start, complete target, body/antenna/aim policy, geometry and observation load across A/B/C. Record actual duration/phase as outcomes; eased and linear paths of equal duration have different peak speeds. Add a single duration/phase control only if needed. |
| E2 | Can the candidate follow changing intent and stop pursuing it on release/loss? | Offline adversarial sequences first; then separately admitted bounded reversals/release/loss. Retain source age through relays, bounded storage, explicit re-engagement and unknown-outcome barriers. Stock acceptance cannot prove downstream retirement. |
| E3 | Is static residual direction/history dependent? | Establish actual starts on both sides of the same target. Keep gains unchanged and raw diagnostics sparse. An interrupted second side leaves the pair incomplete. |
| E4 | Does instrumentation or normal media load alter motion? | Compare minimal telemetry, sparse diagnostics and normal camera/audio separately. Do not add competing aims to a load-only condition. |
| N1 | What removes the native subnet route? | Separate parked network capture with bounded event-triggered retention, native/workaround route distinction and real-duplicate protection. Repeated unchanged polling and daemon restarts do not identify the original trigger. |

Predeclare visual continuity/velocity ripple, lag, overshoot, full-pose arrival,
freshness faults and post-release travel as separate outcomes. Retain the current
1°/1 mm arrival rule and its legacy Euler-difference angular metric; add a named
SO(3) geodesic metric separately rather than rewriting old results. Distinguish
transport acceptance, stored target, IK output, native enqueue, bus write and
measured arrival. FK is not independent optical pose evidence.

Keep the existing 500 ms telemetry gate, identity/version, ownership, command
epoch and recovery rules. Report lease, planning-rate, buffer, acceleration/jerk
and geometry numbers in the reports as proposed parameters, not admitted limits.
Reuse verified backups and one owner across ordinary conditions where admissible;
restoration belongs at actual configuration boundaries and final closure.

## Provenance and access limits

The inputs were two full reports, their two pasted chat summaries, and the
retargeting research ZIP supplied by the user. The summaries add navigation, not
independent evidence; their temporary chat download links are not published.
Exact originals and an intake/hash manifest are retained under ignored `local/`.
Public report headers record original-report SHA-256 hashes. The ZIP's seven
listed file hashes passed, and its `REPORT.md` exactly matched the standalone
retargeting report. Checksums establish byte consistency, not truth or authorship.

The public editions preserve findings, formulas, source IDs and source catalogs,
adding context, a contents list and GitHub-compatible mathematics. Adjacent source
citations are separated so Markdown does not link one source label to another
source's URL. The engineering
report's `B:line-range` references point to a private supplied brief; it is not
redistributed and its line numbers cannot be resolved against current public docs.
Use the project evidence map above. A private receipt or benchmark output is not
silently converted into a new public hardware claim.

The [benchmark record](retargeting-benchmark/README.md) preserves the reviewed
original comparator code, requirements and compact recorded metrics. The large
sample trace remains in the private original ZIP and is regenerated by the script.
The local Windows rerun passed all built-in assertions and reproduced all 36
metric rows and the full 10,338-sample trace within absolute/relative tolerances
of 1e-9; the largest absolute numeric difference was about 1.42e-13. Timing fields
were excluded from that comparison. These are scalar/idealized-fixture results,
not library or robot qualification. Rerun timings are not the supplied Linux
timings or an ARM/controller performance claim.

Primary citations are retained with each report. Mutable branches, issue state,
manufacturer hardware revisions, library features and licensing need a fresh
check before reuse. Reports mention inaccessible/full-text-limited sources and
uninspected components; those access limits remain part of the record. No upstream
code, CAD, firmware, credentials, robot identity or private network details are
vendored with this documentation.

## Maintaining this record

1. Update this guide's decision rows when evidence changes, with date, version,
   experiment ID and a link to the resulting public summary. Preserve failed and
   incomplete comparisons as such; keep raw receipts private.
2. Keep dated reports as historical records. Add a clearly dated editorial
   correction for an error; do not silently rewrite their results or make a
   mutable source's new behavior appear to have been known at the original cutoff.
3. Promote implemented behavior into ARCHITECTURE and validated results into
   STATUS/HEAD_RESPONSE only after the corresponding checks. Proposal pseudocode
   does not become an operational runner by being copied out of a report.
4. Before selecting a dependency, pin the actual artifact, inspect its license and
   feature boundaries, and run the relevant numerical/platform tests. Original
   MIT project licensing does not relicense upstream Apache/LGPL/commercial code
   or third-party assets.
5. Add any new public research files deliberately to the reviewed export inventory.
   Check links, privacy and source ZIP inclusion; keep bulky regenerable outputs
   and machine-specific evidence under ignored `local/`.
