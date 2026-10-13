# Status — 2026-10-13

This is an independent prototype. The following separates observed hardware
results from offline evidence; it is not a general compatibility certification.

| Area | Current evidence and limit |
| --- | --- |
| Motion/media control | Default admission remains daemon **1.10.0** for local bridge and hosted control. |
| Daemon 1.11 candidate | Synthetic fixtures exercise the installed SDK parser/writer and adapter guards. They do **not** admit 1.11 or verify live transport, camera/audio or motion. |
| Previously attended update | A robot previously on **1.2.11** was confirmed updated to **1.11.0**. This observation does not verify the app's in-page update path or widen control admission. |
| Wi-Fi setup | Prior attended real scans, credential submission and a network switch were confirmed. A complete fresh factory access-point path remains unverified. |
| Bluetooth setup | The observed factory Bluetooth service lacked the provisioning commands the wizard needs. Capabilities are probed explicitly; daemon version alone cannot prove them. |
| In-page updater | Implemented with readiness, single-submission and uncertain-outcome guards; not hardware verified. |
| Simulation and CLI | Hardware-free demo and read-only diagnostics are available. |
| Fresh root review | **273 offline tests passed** and **119 local publication artifact files were verified** before this housekeeping pass. These are dated receipts, not a claim that every later revision has run the same checks. |
| Standalone housekeeping | **278 tests passed**, local and portable hosted production builds passed. A relocated browser demo rendered and its head control responded. The production webcam worker initialized its real model without capture; no robot, camera or microphone was used. |
| Static source projection | A live check found that Pages reserves `.github/`. The source manifest now binds a `github/` website projection while the repository and ZIP retain canonical CI paths. Version **0.1.2** preserves the earlier 0.1.1 archive identity. |
| Previous hosted verification | The 0.1.2 deployment was verified against 139 build/source/archive files. A later website commit affected Fleet only. This is a dated publication receipt. |

The October 1 interface pass adds compact spatial head/antenna gestures, a bounded
page console and an integrated experimental WebXR view. Offline tests cover the
new gesture, command grammar and XR mapping/gate behavior. Browser simulation
checks include keyboard gestures, requested/measured feedback, negative numeric
input, read-only console output and explicit simulated writes. The production
page and local bridge also render without a framework error overlay.

A different initialized Wireless robot was observed on daemon **1.10.0**, healthy
and asleep, with remote access and media available and no current app lock.
Read-only daemon/ownership/measured-state checks passed through the local bridge.
Attended local-page tests completed Wake, small left/right antenna movements,
Stop and Sleep. Both antenna targets reached measured feedback. Small head-turn
tests encountered stale telemetry and recovered by holding measured pose; they
do not establish reliable head control on this connection. The robot was confirmed
asleep after testing. No firmware, Wi-Fi or new camera/microphone capture was tested.
The final interface revision passed **297 offline tests**, both production builds
and the **133-file** public source audit. Browser checks verified explicit console
write enablement and actual read-only WebMCP status discovery and invocation.
Hosted authenticated WebRTC and physical WebXR still require their account/device
validation. The desktop browser viewport override did not change its
layout size, so mobile rendering is not claimed as verified.

The **0.2.1** agent-interface follow-up passed **303 offline tests** and both
production builds. WebMCP discovery and direct status, arm, bounded head command,
measured readback, Stop and disarm calls passed in browser simulation without
cursor interaction. Motion and power commands require explicit arming; Stop
remains callable on the active connection after movement authorization is revoked.
These tool tests do not add physical hardware validation.

The **0.3.0** workspace pass keeps camera, measured 3D and head controls visible
together on a 1280×800 desktop viewport. Antenna gestures and numeric inputs are
integrated into the model panel. Browser simulation verified ordinary orbit without
antenna movement, explicit 3D drag with measured readback, Stop revoking drag mode,
and numeric input outside drag mode. A 390×844 viewport stacked the panels without
horizontal overflow. **305 offline tests** and both production builds passed.
The source inventory includes **135 reviewed files**. This pass adds no physical
robot, camera/audio capture or headset validation.

The **0.3.1** revision prioritizes camera and gesture controls over a narrow 3D
panel. Compact antenna sliders return, a visible sideways/vertical translation
pad and forward/back slider complement look/tilt gestures, and dragging the camera
uses the same turn/nod mapping as the look pad without a visual overlay. Browser
simulation verified camera-to-head requested/measured feedback, position input,
antenna slider input and mobile reflow without horizontal overflow. **306 offline
tests** and both production builds passed. No new physical validation is claimed.

The **October 13 offline continuation** fixes a held Look direction or Tilt drag
resuming after Stop. These controls now share camera/translation gesture
cancellation: a changed control context, disabled gate, hidden page, lost focus,
lost pointer capture or rejected submission requires a new press. Tilt retains
its relative glyph drag and all controls retain their existing target mapping.
**312 offline tests** and both production builds passed; the public source audit
still covers **135 reviewed files**. Chromium simulation checked Stop and focus
loss for all four gesture surfaces in both local and hosted builds, fresh drags,
keyboard and precision inputs, and the hosted agent arm/write/readback/Stop/disarm
flow. The 1280×800 desktop layout and 390×844 mobile reflow passed without app
console errors. These are local build checks, not a new deployment or hardware
validation.

The same-day boundary follow-up fixes partial Wireless requests being rejected
when an omitted measured axis crosses its limit only through floating-point
roundoff (for example, −15.000000000000002° tilt). The adapter permits a small
machine-precision allowance on omitted measurements and preserves their values.
Explicit head and antenna targets retain strict limits; material measured
overshoot remains blocked. **315 offline tests** and both production builds
passed, including positive/negative boundaries on all six head axes and both
antennas, strict explicit overshoot rejection, and preservation of measured state.

An **October 13 attended hardware session** freshly matched a daemon **1.10.0**
robot and confirmed free ownership, no running moves, and healthy initial
telemetry. Wake, small left/right antenna movements, software Stop and Sleep
completed with fresh measured confirmation. An earlier power-action confirmation
read timed out; controller-page visibility changes also interrupted power actions.
The subsequent power/antenna checks passed with that page suspended.

Small yaw and pitch requests produced measured movement within the bridge's
existing 1° / 1 mm arrival criterion. A roll request remained active with about
1.07° combined angular error and was stopped at the attended test deadline.
Its traced snapshot reads stayed below 53 ms, so this particular failure did not
establish stale telemetry as its cause. These observations do not establish
reliable six-axis head control or precision below the existing arrival tolerance.
Translation checks were not completed. Camera/audio checks were blocked by
media-status timeouts and later loss of robot reachability; no live video or
audio stream was verified. After operator power-button recovery, a further Wake
attempt was rejected by the existing 500 ms snapshot-freshness gate. Final fresh
identity/version, motor-mode and ownership reads confirmed the robot asleep and
idle; media reported available again, without establishing a working stream.
Physical WebXR, hosted authenticated WebRTC, factory
onboarding and the updater remain outstanding. Private receipts retain the
individual requests, readbacks, timing and operator observations.

The **October 13 offline telemetry/settling follow-up** reduces optional media
polling to once per 1.5 seconds and drains failed mandatory snapshot batches before
another coalesced batch can start. Mandatory identity, ownership, pose and running
motion reads remain live; the 500 ms freshness gate and motion limits are unchanged.
Timing now separates response headers from JSON-body completion and retains the
last slow snapshot after healthy reads resume. Head diagnostics expose signed
per-axis errors and combined settling error, including post-write read freshness.
**321 offline tests**, both production builds and the **135-file** source audit
passed. An offline replay of the saved roll plateau reproduced its combined-error
failure, no destination replay and one guarded measured hold. This improves read
coordination and evidence for the next attended session; it does not establish
the cause of the physical connectivity loss or correct physical roll calibration.
No robot requests or hardware tests were performed in this follow-up.

A subsequent **October 13 attended diagnostics retest** used the updated bridge
with the retained ±2° / ±2 mm pilot limits. Fresh identity/version and ownership
reads confirmed daemon **1.10.0**, asleep and idle. Explicit Wake completed before
any head target. One small roll request settled with **0.91° combined angular
error** and **0.52 mm combined translation error**, within the unchanged arrival
criterion. The following small yaw request plateaued with **1.31° combined
angular error**, almost entirely yaw, and **0.34 mm translation error**. Its
10-second settling deadline triggered the recovery guard; the attended sequence
halted, and Stop and Sleep completed. Fresh final reads confirmed disabled motor
mode, asleep, idle and ready with no recovery lock.

The retest recorded **72 snapshots at 15–118 ms** (median 26 ms), with no mandatory
request errors or slow snapshots. This yaw failure occurred under fresh telemetry;
the run does not resolve the earlier intermittent delays or establish a physical
calibration cause. One roll arrival does not establish reliable head control or
sub-degree precision. Pitch and translation tests were not reached. Media status
was available, but no camera/audio stream was tested. The temporary bridge stopped
and both resource reservations were released; private receipts retain the complete
per-route timing, six-axis settling errors and final state.

The subsequent **October 13 offline yaw investigation** found 52 post-write
settling samples in that retest. Measured yaw remained effectively unchanged
during the final five seconds, with about 1.30° yaw error and healthy HTTP reads.
Saved read completion times do not establish the age of the robot's underlying
sensor sample. Pose reconstruction preserved the requested absolute yaw and
omitted pose fields; replay still failed the existing combined arrival criterion.
The physical residual's cause remains unresolved.

A separate ramp bug could end transmission with a remaining error below 0.01°
or 0.01 mm, such as sending 0.100° for a 0.105° request. Limited ramps now send
the exact bounded endpoint before settling. This small correction does not
explain the attended yaw residual. Diagnostics now retain the last manual target
matrix, six-axis values, preserved body yaw, epoch, sequence and write duration,
distinguishing pending, acknowledged, failed and unknown outcomes. Settling
faults retain that evidence through measured recovery without replaying the
destination. An acknowledgement remains distinct from physical arrival.
Optional daemon timestamps and native head-joint readings are also retained for
the next diagnosis, without assuming synchronized clocks or changing admission.

**327 offline tests**, both production builds and the **135-file** source/ZIP
audit passed. A private replay of the saved yaw plateau confirmed an acknowledged
exact endpoint, unchanged settling rejection, and one guarded measured recovery
hold. No robot requests or hardware tests were performed in this investigation;
motion limits, freshness, ownership and recovery gates remain unchanged.

A later **October 13 attended yaw-retest recovery attempt** did not reach Wake
or a head target. Bluetooth freshly matched the robot identity and accepted PIN
authentication, then one explicitly authorized daemon-restart request returned a
GATT protocol error. The operator observed brief Wake/Sleep motion. Restart
completion remains unconfirmed: subsequent daemon HTTP and SSH checks failed,
and a fresh uncached Bluetooth identity read also timed out. The request was not
replayed; no current daemon version, motor state or ownership was established.
The temporary robot reservation was released; no bridge or port was started.

An isolated offline reproduction of the official **1.10.0 Bluetooth source**
found that the generic maintenance-command branch runs its script but returns
no reply string, causing the reply encoder to raise after execution. Both mocked
successful and failed script exits reproduced that error, so a GATT error alone
cannot establish whether a restart succeeded. This is a possible explanation for
the observed reply failure, not verification of the installed Bluetooth service
or the cause of HTTP/SSH loss. No robot software was changed. The yaw retest
remains pending recovery and fresh admission checks, followed by explicit Wake.

The following **October 13 attended yaw retest** recovered connectivity after an
operator power cycle. Eight fresh identity/version/ownership snapshots passed
at 23–78 ms on daemon **1.10.0**. The daemon initially reported disabled motors;
explicit Wake completed before either yaw target. A small negative yaw target
settled at **0.28° combined angular error** and **0.27 mm translation error**.
The subsequent positive target failed the unchanged settling deadline. The fault
retained the exact acknowledged endpoint, post-write reads and **1.38° combined
angular error** with **0.38 mm translation error** at the deadline. Native daemon
timestamps advanced; optional native head joints were not present in the response.
Reliable yaw control remains unverified.

Measured recovery, software Stop and Sleep completed, followed by a fresh asleep,
idle and ready snapshot. A later independent status read failed again. Another
explicitly authorized Bluetooth daemon-restart trial accepted PIN authentication
and returned an uncertain protocol-error outcome; the operator observed brief
Wake/Sleep motion. No target was replayed. Read-only monitoring subsequently found
an IPv6 SSH greeting while IPv4 connections timed out, showing that complete
robot/network loss cannot be inferred from the HTTP failure. The Stop/Sleep cause
remains unresolved: healthy reads followed the earlier Stop and the final Sleep.
Hosted control, camera/audio, pitch and translation were not tested in this run.

The hosted **0.3.2 reconnection guide** provides current-address/status checks,
bounded copied-status summaries, an explicit browser Bluetooth capability check,
official maintenance handoffs and attended physical power-cycle instructions.
It explains Brave and other unsupported-browser fallbacks and uncertain restart
replies. The guide sends no robot commands, opens no chooser during capability
inspection and adds no automatic Wake, reconnect replay or admission exception.
This page workflow still requires its own attended recovery validation.

For this release, **332 offline tests**, the local production build and the
hosted production build passed on Node 24. Rendered browser checks covered the
guide's status branches, unsupported/available/unavailable Bluetooth, denied
and timed-out capability checks, unsafe hosts and malformed copied status.
The hosted demo loaded its camera and model and completed a simulated measured
head target, Stop and disarm. Desktop and 390 px mobile layouts had no horizontal
overflow or console errors. The reviewed public inventory contains **141 source
files**. These are offline and simulation results; hosted authenticated robot,
media and recovery tests remain outstanding.

The daemon 1.11 candidate requires attended browser/robot transport, telemetry,
camera/audio, identity and safe control checks before a separately reviewed gate
change. Offline success alone is insufficient. Read [candidate compatibility](DAEMON_1_11_COMPATIBILITY.md)
for the scoped synthetic evidence.

Setup, Wi-Fi changes, remote account authorization and control are separate checks.
A successful update job or submission acknowledgement is not confirmation of the
result; inspect fresh robot status. Unsupported versions retain robot-owned
Settings and official recovery routes. Never change firmware merely to bypass
a control gate.

Public source is prepared from a sanitized standalone history. Original private
authoring history and investigation/validation/outreach receipts remain local and
are excluded from public export. No robot addresses, identities, credentials or
private machine paths are required to build or contribute.
