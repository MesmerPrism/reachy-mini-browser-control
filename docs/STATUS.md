# Status — 2026-09-30

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
| Live hosted verification | The live HTTPS check timed out. Current live deployment consistency was not established by that attempt. |

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
