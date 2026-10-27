# Matrix runner ports and attended lifecycle

This is a library integration contract, not a robot launch command.
[The matrix](MOVEMENT_COMPARISON_MATRIX.md) and
[follower](BOUNDED_FOLLOWER.md) describe the experiment and numerical limits.
The shipped CLI is synthetic only; no robot configuration is discovered.

```js
// No adapter is created by these constructors.
const port = new MatrixOwnerPort({
  owner: existingGuardedOwner,
  pathReview: reviewThisExactActualPath,
  axisReady: waitForCurrentAxisReady,
  resetReview: verifyOperatorPerformedReset,
  continuationReview: qualifyCurrentIdleNativeAndContext,
});
const runner = new MatrixRunner({ plan: frozenReviewedPlan, io: port });
const session = new MatrixSession({
  runner, control: existingGuardedOwner.control,
  observer: existingPacedObserverProvider,
  authority: currentAttendedAuthorization,
  journal: durablePrivateJournal,
});
```

`existingGuardedOwner` is the binding used for the earlier trajectory comparison:
it owns one existing `RobotControl`, its admitted adapter, native capture,
authority/context providers, and a durable journal. The port validates the real
controller type. An offline port accepts only a demo adapter; the synthetic CLI
cannot admit a nonsynthetic plan. A future public deployment must supply these
providers, rather than importing this checkout's private credentials/receipts.

## Focused vertical experiments

`makeVerticalPlan(neutral, rows, {arm, profile, cohort, csvSha256, synthetic})`
creates a separate canonical `reachy.vertical-comparison.v1` plan containing four
legs: −24 mm, neutral, +10 mm, neutral. It accepts `daemon-minjerk` or
`bounded-follower`, retains the original full-pose/body/antenna reference and
protocol-3 admission, and binds its parent matrix hash. It does not import old
results or pretend that omitted axes were executed. `complete` refers only to
the four-leg experiment; its summary explicitly records `fullMatrix:false`.

The optional `animationDurationSeconds:2` or `:1` is **daemon-local only**. It
freezes each leg at that duration and an experimental translation reference-speed
ceiling of 25 or 50 mm/s respectively. Actual-start speed/model/clearance checks
still apply; the other limits and measured-arrival rules remain unchanged. These
presets do not alter ordinary controls, the six-axis matrix or the follower's
5 mm/s policy. No factory or runner constructor discovers hardware or sends Wake.
The dated [vertical results](MOVEMENT_COMPARISON_MATRIX.md#october-17-vertical-speed-and-direction-experiment)
describe the attended qualification and its limits.

The bounded [joint delivery trace](JOINT_TRACE.md) is now installed after ARM
runtime and disabled-only device qualification.
Its observer lifecycle is separate from motion ownership and from the matrix
runner. Start/stop controls recording only; neither a capture nor qualified
trace coverage authorizes or proves movement. A fresh prepared baseline and
physical joint-write overhead qualification remain before combining it with
another attended run.

## Providers

- `pathReview(path, hash)` receives the exact actual-start trajectory descriptor,
  fixed targets, duration, chart/curve proof and 65 preview points. It must verify
  the complete relevant curve, current installed model/joint bounds and contact
  constraints; the preview alone is not a continuous IK/collision proof. Return
  `{approved:true, pathSha256:hash, scope:'actual-start-full-path', modelSha256,
  clearanceReviewRef, offlineOnly:false}` only for current reviewed evidence.
  Hash mismatch, missing evidence or refusal withholds the target. No provider
  opens another native serial controller.
  Protocol 3 also includes `path.centering`: frozen axis bounds, initial measured
  pose, prior-return reference and `checkpointId`. Return that exact
  `centeringCheckpointId`; an extended residual additionally requires
  `residualEnvelopeApproved:true`. Review the complete actual and commanded
  paths against those bounds and current clearance. Old review providers that
  omit this acknowledgement withhold protocol 3 targets.
- `axisReady(cue)` waits for the current observer's block readiness and returns
  `true`. Bind it to the cue's leg ID/axis/round, not a stale prior click. It runs
  once before the four preannounced segments on that axis.
- `resetReview(checkpoint)` **verifies** an operator-performed Sleep/Wake; it does
  not initiate power actions. It returns exact checkpoint ID, acknowledgement
  receipt references, `operatorConfirmedAwake:true`, `gainsChanged:false` and
  `modeCorrectionIncluded:false`. The port adds a fresh idle/awake status check.
  Current observer qualification and settings are rechecked on owner claim.
- `observer.qualify('disabled'|'awake')` uses the existing admitted controller and
  paced native capture. Verify identity/version/mode, metadata and original loop
  settings; retain its completion-based cooldown across phases.
- `authority()` returns current `{authorized:true, attended:true}` for the session.
  The guarded owner's stronger current exclusivity/context policy also remains
  mandatory. This API does not waive admission, arming or recovery requirements.
- `continuationReview(interruptedRow)` performs **read-only** current native,
  software and aim qualification after the owner is released. Return
  `{verified:true, originalSoftwareVerified:true, aimPolicyMatches:true,
  configurationMatches:true, observerQualified:true, reviewRef,
  gainsChanged:false, modeCorrectionIncluded:false}`. The port independently
  checks fresh idle state, no pending workers/recovery/unknown-write barriers,
  empty owned/foreign task lists and the exact confirmed Stop epoch before and
  after this provider. Missing or failed qualification never authorizes motion.
  Retain native sequence, completion-based cooldown and static-setting checks;
  only an explicitly reviewed diagnostic latency failure may be reset.

## Operator-driven sequence

1. `await session.prepare()` performs read-only disabled qualification.
2. `await session.power('wake', {operatorConfirmed:true})` is an explicit attended
   power request. No constructor, preparation or matrix loop performs this call.
3. After seeing normal Wake, call
   `await session.confirmAwake({observedAwakeAndSettled:true})`.
4. For each axis, call `await session.runAxis({operatorReady:true})`. It runs four
   segments under the retained owner, with one actual-start review per segment.
   Static misses remain data; real guard/unknown-outcome failures park.
5. At `waiting-reset-sleep`, explicitly call Sleep, confirm normal disabled Sleep,
   then explicitly Wake and confirm readiness again. `runner.confirmReset` checks
   the matching checkpoint receipts; it does not redefine neutral. The session
   returns to `waiting-axis` for the next condition.
6. At `waiting-final-sleep`, explicitly Sleep and confirm normal disabled Sleep.
   The session then closes. Retain final audit, visual and drained-owner receipts.

`confirmAsleep({observedAsleepAndSettled:true})` checks the paced disabled observer
and fresh state. Read-only observer/status failures leave the relevant visual
confirmation stage retryable. They never issue another power request.
`session.stop()` remains separate, retires pending generation, and never sleeps
or resumes automatically. An unknown write stays behind the controller's existing
barrier; no coordinator method clears it or retries the destination.
An already-disabled parked session can close through read-only Sleep confirmation
without sending an extra Sleep request; it cannot resume the unfinished matrix.

For direct injected use, `runner.runNext({approvedPlanSha256:runner.hash})`
accepts only the next unissued segment. At a reset checkpoint, it refuses another
segment until the exact reset confirmation is accepted. Reusing a confirmation,
changing policy/targets, or running concurrently is refused.

## Protocol 3 pauses and historical continuation

Select `makeMatrixPlan(..., {protocolVersion:3, profile:'slow', ...})` explicitly.
Omitting the version preserves canonical protocol 2 hashes. The current offline
preparation/CLI chooses protocol 3; neither path creates a hardware adapter.

After a classified interrupted trial:

```js
await session.continueAfterInterruption({
  operatorConfirmed: true,
  id: runner.plan.legs[runner.index].id,
  approvedPlanSha256: runner.hash,
});
// If stage is waiting-remainder, run only the remaining unissued axis legs.
await session.runRemainder({operatorReady:true});
```

Review sends no targets or power commands. It keeps the failed row and consumes
it once after current admission. A final-leg interruption leads to the ordinary
between-condition or final Sleep stage; it does not automatically run another
condition. Stop during review or read-refresh fences subsequent dispatch and
state advancement. Unknown/failed writes, settings faults and unconfirmed Stop
cannot use this path. Generic legacy error text is insufficient: the new executor
retains structured failure and dispatch-outcome evidence.

`runner.restoreHistoricalPrefix({approvedPlanSha256, sourcePlan, sourceResults,
receipt})` is a **pure preparation** operation on a new idle runner. The receipt
binds canonical `sourcePlanSha256`, `sourceResultsSha256` (via `planHash`),
`prefixLength`, a private evidence `reference`, `closedAsleep:true`,
`coordinatorExited:true` and `sleepVisualConfirmed:true`. The prefix must end at
an axis boundary and retain closed interrupted rows. Geometry, neutral, duration,
profile and reset policy must match. Historical slots retain original IDs/hash
and outcomes under `source`; they are not scored as new-protocol completions or
matched samples. The original source objects remain unchanged. Current disabled
qualification, explicit Wake and visual admission are still required afterwards.
An imported whole-condition boundary also needs its exact reset receipts.

Results expose `completed`, `interrupted`, `historical`, `unissued`, `exhausted`
and `complete` separately. A queue can be exhausted while `complete` stays false.
Protocol changes must remain visible in comparative reports.

`runner.restoreClosedSession({approvedPlanSha256, sourcePlan, sourceResults,
receipt})` separately prepares a **new** runner after a terminal uncertain streamed
target, or a zero-dispatch trial with confirmed Stop. It requires the identical
canonical plan and exact result hash, ordered rows, and private references
for the old uncertainty, inspected reconnect and acknowledged Sleep. The receipt
must set `closedAsleep`, `coordinatorExited`, `sleepAcknowledged`,
`sleepVisualConfirmed`, `disabledNativeVerified`, `originalSoftwareVerified`,
`priorWritesDrained`, `operatorStationaryConfirmed`,
`oldUncertaintyReceiptRetained` to true (`storedTargetExactlyMatches` is also
required for a terminal unknown target), and bind
`sourcePlanSha256`, `sourceResultsSha256`, `prefixLength`, `reference`,
`sleepReceiptRef` and `uncertaintyReceiptRef`. The private binding must verify
these facts; supplying booleans is not hardware admission.

This operation neither clears the old controller nor resolves its HTTP outcome.
It copies prior rows with their original failures and attaches a closure reference
to the failed row. That row stays interrupted, its target is never replayed, and
the next index is strictly the next unissued leg in the same condition. A new
disabled qualification, explicit Wake and visual check remain mandatory. A resume
inside an axis enters `waiting-remainder`; its fresh reset and unmatched start
must remain visible in analysis. A condition boundary also requires the exact
acknowledged `sleepCommandReceipt`. The new session retains that real receipt and
requires explicit Wake, visual/observer qualification and reset confirmation.
This does not qualify unknown daemon-task handles. Offline tests cover these
paths; see dated hardware receipts for actual use.

`runner.selectFinalAxis({approvedPlanSha256, arm, axis, operatorConfirmed:true,
reference})` selects the final complete axis of an otherwise idle remaining
condition. It preserves the canonical targets/hash, records earlier unissued
legs as `excluded`, freezes a separate selection manifest, and binds any reset
checkpoint to the selected axis. Excluded legs have no commands, scores or
arrival claims. `summary().excluded` is separate from interruptions and unissued
legs; an exhausted selected queue is not a complete four-condition matrix.
Current use is the explicitly requested daemon-local vertical-only comparison.

`restoreStoppedSession` is a separate pure import for a retired controller whose
accepted daemon task is known and has drained, with a **later explicit confirmed
Stop**. It binds the source hashes, task UUID, Stop receipt/epoch and timestamps,
current attendance, original software/settings and absence of a new unknown
write. Original failure fields stay unchanged, and only the next unissued leg in
the same condition can follow. It supplies no current hardware admission.
`session.prepareRetainedAwake()` performs read-only awake admission and enters
`waiting-held-visual`; `confirmRetainedAwake({observedAwakeAndSettled:true})`
requires current visual and observer qualification. Neither method sends Wake or
Sleep. A private owner must retain accepted UUIDs through pre-acceptance or
not-yet-listed cached snapshots; only observed membership followed by a later
absence establishes task completion. Unknown handles are never adopted.

## Evidence and storage

Journal raw target intents/outcomes, cached pose observations and native brackets
under ignored `local/`. Use one bounded file set per whole condition rather than
one ever-growing session log or a software backup per iteration. The port logs
compact leg summaries while the raw events remain authoritative. Matrix summary
memory is bounded by its fixed segment count. Native observation arrays retire
after condition drain, preserving read sequence, next-eligible time and static
settings. This avoids a long four-round run exhausting the retained-bracket cap.

`runner.recordVisualRating` takes a recorded segment ID, `watched`, separate
0–4 `scores` for `interior/transitions/coordination`, confidence, contact and notes.
Unwatched scores must all be null; a second rating cannot overwrite the first.
A pressure concern parks and Stops the current owner, with no automatic Sleep.
Accuracy, matched-start validity, SO(3) geodesic error and the legacy Euler-norm
angular error remain distinct fields.

Physical use still requires new attended authorization, current hardware/context
checks and actual-path qualification. No packages, gains, modes or protection
settings are installed or modified by this offline implementation.
