# Persistent bounded follower — offline implementation

Implemented on **2026-10-16** as condition D of the
[six-axis comparison](MOVEMENT_COMPARISON_MATRIX.md). No robot was contacted or
moved while implementing or validating it. This is an original, dependency-free
quintic planner, informed by the [retargeting report](research/2026-10-16-continuous-retargeting.md).
It is not Ruckig/rsruckig and is not installed in the ordinary browser controller.

The later [October 17 attended comparison](MOVEMENT_COMPARISON_MATRIX.md#october-17-selected-continuation-and-vertical-findings)
completed 23 of 24 condition-D movements; the final return was withheld before
dispatch during start-pose review. The operator preferred its visual smoothness
over the earlier PC paths, especially vertically. Static tracking error remained,
and nominal 15 s vertical ramps took about 22 s. This partial evidence does not
qualify ordinary browser/phone following or establish a matched comparative rank.

## What persists and what is bounded

[BoundedFollower](../src/bounded-follower.mjs) retains commanded position, velocity
and acceleration. A fresh target replaces the desired destination, preserving
that current motion state. Omitted named coordinates preserve their previous
desired targets. Retargeting does not restart from encoder measurements or zero
the current velocity/acceleration. Each candidate quintic finishes at the new
destination with zero velocity and acceleration; a new input can replace it
before that endpoint. The next segment matches position/velocity/acceleration
at the join. Jerk can change discontinuously while remaining bounded.

For each coordinate, with duration `T`, normalized time `u`, displacement `d`,
initial velocity `v` and acceleration `a`, coefficients are:

```text
c0 = p
c1 = v T
c2 = a T² / 2
c3 = 10d − 6vT − 1.5aT²
c4 = −15d + 8vT + 1.5aT²
c5 = 6d − 3vT − 0.5aT²
```

The implementation converts the position and first three derivative polynomials
to Bernstein form, subdivides each into 32 intervals, and checks their convex
hulls against workspace and vector-norm derivative bounds. This checks the
whole mathematical segment, rather than just its endpoints or a dense sample.
It is a conservative sufficient check in float64, **not interval arithmetic or a
formal numerical certificate**. A finite geometric duration search can extend
the requested minimum duration; it is neither time-optimal nor a complete
feasibility solver. Failure inhibits output; it never clips the finished curve
or reuses a previously successful trajectory as a fallback.

The [fixed pose chart](../tools/follower-pose.mjs) represents translation in metres
and orientation as a rotation vector in radians, relative to one fixed neutral
orientation/body heading. The chart is not recentered on every packet. Quaternion
sign is normalized before taking the logarithm; rotations outside its 60° norm
scope are rejected. The body/antenna channels retain the cohort's explicit
constant targets. This six-axis planner does not own those actuators independently.

| Vector group | Speed bound | Acceleration bound | Jerk bound |
| --- | ---: | ---: | ---: |
| Translation chart | 5 mm/s | 8 mm/s² | 40 mm/s³ |
| Rotation-vector chart | 10°/s | 12°/s² | 40°/s³ |

These are experimental reference parameters, not manufacturer actuator limits.
Orientation derivatives are **rotation-vector derivatives**, not a certification
of physical angular acceleration/jerk, IK joint derivatives, native bus timing or
actuator response. Numerical IK feasibility is not shell clearance. Actual paths
still require the existing-owner model/clearance review before dispatch.

The command workspace includes the matrix targets plus a 2°/2 mm drift/return
allowance: yaw ±32°, pitch ±20°, roll ±22°, X −13/+12 mm, Y ±24 mm and Z −26/+12 mm.
The actual-start admission also limits non-primary axes to 7°/6 mm. These are
candidate diagnostic scopes, not a certified Cartesian box or permission for
arbitrary combined poses. Excursion destinations remain the smaller fixed CSV
targets; actual-start/full-path review is mandatory, and may withhold a segment.

## Execution and failure behavior

Engagement takes an explicit epoch and finite initial state. Retargeting requires
a strictly increasing intent sequence and source age at most 500 ms. Finite-value,
workspace, ordering, freshness or solve failure inhibits further advancement.
An epoch change or explicit invalidation requires a new engagement. Steps cannot
advance more than 20 ms of command phase; delayed calls cannot catch up in a burst.
The PC executor also caps phase to actual elapsed monotonic time so an early timer
wakeup cannot advance a full 20 ms trajectory step.

These bounded reference derivatives are in planned phase time. Serialized HTTP,
scheduling delays and native queues can still distort physical timing. The
follower does not supply robot-side deadlines, priority queue cancellation,
physical braking or an emergency stop. On invalidation the existing controller's
Stop/recovery procedure remains responsible for the robot. There is no raw-target
fallback. Live phone/WebXR input, deadman behavior and input-expiry braking are
not enabled by this library or by the point-to-point matrix.

Within condition D the runner engages once, carries commanded state across all
24 segments, and retains the same owner through observation windows. It does not
replace the target with measured feedback after each accuracy miss. One common
measured Stop/hold closes each condition, after its final scored window. The
next condition starts a new follower engagement after its explicit reset checks.

For nominal rest-to-rest single-axis matrix segments, D can produce the same
quintic as B. This is expected. Offline reversal/irregular-retarget tests exercise
the persistent-state advantage; the fixed matrix alone cannot demonstrate all
continuous-following behavior. With off-axis measured starts, D's fixed-chart
interpolation can differ from Pollen's scalar-yaw/residual path; record that
difference instead of attributing everything to the time law.

## Run and integration boundaries

```sh
node tools/Prepare-Movement-Matrix.mjs
npm run compare:offline
node --test test/bounded-follower.test.mjs test/movement-matrix.test.mjs test/matrix-session.test.mjs
```

The CLI accepts **only `--demo`** and uses a synthetic port. It discovers no
robot configuration, credentials or endpoints. Preparation references and hashes
existing backup receipts without copying full archives. Generated plans/results
stay under ignored `local/`; a synthetic path approval is never hardware proof.

[MatrixRunner](../tools/movement-matrix.mjs) uses an injected port.
[MatrixOwnerPort](../tools/matrix-owner-port.mjs) adapts the existing guarded
`RobotControl` owner, retaining its identity/version, 500 ms batch-start freshness,
0.25° body-reference, epoch, one-write, Stop-drain and unknown-outcome rules.
Current authority/context, actual path review, axis readiness and reset receipt
providers must be supplied explicitly. The live port rejects nominal-only
clearance evidence; no adapter or second serial reader is created by these tools.

[MatrixSession](../tools/matrix-session.mjs) stages explicit attended Wake,
visual readiness, four-segment axis blocks and explicit Sleep/visual confirmation.
Between conditions it waits for the operator-controlled Sleep/Wake sequence and
checks the resulting receipts. It never sends power commands from `runAxis`.
Read-only confirmation failures stay retryable without replaying Wake/Sleep;
Stop retires pending intent and remains available separately. Final Sleep is an
explicit session action, outside the trajectory executor.

Raw target/observation/native events belong in the caller's durable private
journal. The matrix retains compact summaries instead of duplicating every
frame. Native evidence windows retire only after condition drain; sequence,
cooldown and static-setting guards persist. There is no routine service restart,
deployment, gain write, mode correction or automatic rollback between conditions.
