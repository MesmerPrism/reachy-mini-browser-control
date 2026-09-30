# Daemon 1.11 candidate compatibility

The public controller still admits daemon **1.10.0** by default. Tests construct
an isolated 1.11 candidate adapter; passing them does not widen that gate or
establish hardware compatibility. No robot, account, microphone, camera, updater
or central service is used by this suite.

## Exact sources

- Daemon 1.10 tag: `7f54717586369155900eeeb43fd4bbbb62064f22`.
- Daemon 1.11 tag: `22dae6da569d888f15a73aef8fcbbe16ee95f66c`.
- Installed npm SDK 1.8.0 gitHead: `96f1c2e2950ac83871799db37968b6a6fb0bae34`.

Primary authorities: [tag comparison](https://github.com/pollen-robotics/reachy_mini/compare/7f54717586369155900eeeb43fd4bbbb62064f22...22dae6da569d888f15a73aef8fcbbe16ee95f66c),
[1.11 protocol](https://github.com/pollen-robotics/reachy_mini/blob/22dae6da569d888f15a73aef8fcbbe16ee95f66c/src/reachy_mini/io/protocol.py),
[1.11 dispatcher](https://github.com/pollen-robotics/reachy_mini/blob/22dae6da569d888f15a73aef8fcbbe16ee95f66c/src/reachy_mini/daemon/backend/abstract.py),
[SDK 1.8 source](https://github.com/pollen-robotics/reachy_mini/blob/96f1c2e2950ac83871799db37968b6a6fb0bae34/ts/lib/reachy-mini.ts).

`test/fixtures/daemon-1.11-wire.mjs` contains independently written synthetic
values with these wire shapes. It contains no captured identifiers or robot
traffic. Its command validator checks the adapter's used subset, rather than
claiming to implement every upstream Pydantic constraint.

## Checks and changes

`test/daemon-1.11-compatibility.test.mjs` imports the actual installed SDK. Its
offline subclass replaces authentication and session establishment; the real
SDK JSON command writer, state decoder, reply handling and teardown execute.
The tests cover exact identity/version replies, rejection of absent identity
and other versions, failed session establishment, optional IMU/DoA fields,
row-major pose and metre/radian units, partial targets, emotes, queued Stop,
wake/sleep completion, volume replies and activity/rotation gates.

The SDK 1.8 decoder merges truthy pose fields and ignores pose sequence numbers.
The real-parser fixtures reproduced two unsafe baseline behaviors: a null pose
refreshed a retained pose, and an older unordered frame rewound measured state.
`src/wireless-telemetry.mjs` now wraps the private `_handleRobotMessage` ingress
before its merge. This hook is audited only for SDK **1.8.0**; the suite checks
the installed package version. It requires complete control fields in the
`StateSnapshot` envelope. Nullable, incomplete or nonrigid snapshots clear the
SDK state mirror and the adapter's measured/smoothing baseline and advance the
control epoch. Fresh complete state is required again before a command.

Sequenced pose frames reject invalid, duplicate or backwards sequence numbers
without refreshing telemetry. Unsequenced complete poll replies cannot refresh
or rewind a sequenced stream during its 750 ms freshness window. When the stream
stalls, a complete poll may restore state. Other message kinds, including legacy
standalone pose messages and command replies, retain SDK behavior. IMU/DoA may
be absent or null. Synthetic adapters without the private hook continue to use
their existing validated state-event path.

The hook is installed before session establishment and restored during close;
retained SDK state is cleared, and late calls to the detached wrapper do nothing.
This guard sends no commands and introduces no network, polling or reconnect.
Both default 1.10 sessions and candidate 1.11 sessions use it. The daemon gate
and npm dependency remain unchanged.

The combined identity/version reply wait now has a 5-second deadline. Timeout
closes the SDK and removes adapter listeners; late replies cannot admit control.
The test-only shorter deadline uses the bounded constructor timeout option.

Validation on 2026-09-30: **31 tests passed** across the candidate suite,
`test/wireless-control.test.mjs` and `test/wireless-audio.test.mjs`; 16 are new
candidate tests. These establish offline wire handling, not actual WebRTC.
An earlier concurrent `npm test` run passed 256 of 258 tests while the new
updater had not yet entered the public export allowlist. That integration gap
was repaired; the complete September 30 checkpoint subsequently passed all
273 tests. New runtime modules still require explicit inventory review before
export. See [current status](STATUS.md) for the maintained validation boundary.

## Remaining admission gaps

- SDK 1.8 has no `subscribePose` method. Our optional subscription returns false
  without sending a command; tests verify this path. The audited daemon opens
  its separate unordered pose channel only on explicit `subscribe_pose`, so our
  normal SDK1.8 session does not request it. If a future SDK enables subscription,
  audit data-channel routing separately: SDK1.8's `ondatachannel` does not
  distinguish pose and reliable command channels.
- No browser SDP/ICE, H.264 decoder, old-image encoder fallback or TURN relay
  negotiation is exercised. 1.11 changes video pipeline allocation and TURN
  defaults; exact browser/robot integration remains necessary.
- Central registration, HTTPS/redirect/proxy rules, same-account robot selection,
  competing app/session ownership and authentic identity are not established by
  synthetic replies.
- Speaker playback, microphone receive, explicit push-to-talk and physical Stop
  behavior remain untested on the candidate stack. Recorded move availability
  also depends on the robot's cached external dataset.
- Daemon rotation implementation changes from SciPy to NumPy. Wire conventions
  match; physical signs, limits, trajectory completion and measured rendering
  require explicit controlled checks before expanding support.

Do not substitute a newer npm SDK merely to match the daemon. Its automatic
reconnection, OAuth state, reply ledger, pose ordering and peer-connection audio
extension differ substantially and require their own review.
