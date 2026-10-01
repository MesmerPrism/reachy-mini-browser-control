# Status — 2026-10-01

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
