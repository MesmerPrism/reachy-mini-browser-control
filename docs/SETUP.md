# Setup

Use Node **24** for the local app and CLI. Clone
[the standalone repository](https://github.com/MesmerPrism/reachy-mini-browser-control)
or extract its reviewed source ZIP. No external planning checkout or robot is
needed for the [demo](https://mesmerprism.com/reachy-mini/#demo).

## Connect an already initialized Wireless

Open [browser controls](https://mesmerprism.com/reachy-mini/#connect). The
“Connecting an already configured Reachy” guide is for a robot that already
joined Wi-Fi; factory provisioning is a separate route. A new network or a
different robot does not require a reset or firmware update.

1. Put this computer and the intended robot on the same Wi-Fi. Check the robot's
   current hostname or private IP in its app or your router; do not reuse a
   previous robot's identity or assume its old address belongs to this robot.
2. Open the robot dashboard and daemon status using the page's hostname helper.
   The helper only builds links and never scans or connects automatically. If
   `reachy-mini.local` does not resolve, use the robot's current private IP.
   Optional pasted status is user-reported evidence, not a live identity check.
3. Inspect errors and daemon state in the robot's own dashboard. If the daemon
   is stopped, start it there only when you intend to use it. Our page never
   starts or wakes a robot on connection. Unsupported daemon versions remain
   blocked; do not change firmware to bypass the admission check.
4. Use the robot-owned Hugging Face sign-in and remote/WebRTC options. The robot
   needs internet. Create a read token for the same account, review its scopes,
   then paste it into the controls. The token remains in tab memory and is
   cleared on disconnect or closing the tab.
5. Close competing controllers and robot apps. Select the intended robot,
   compare identity and version, and check fresh measured state before Wake or
   any movement.

A local dashboard connection and the SDK remote-control connection are separate.
The hosted HTTPS page cannot bypass mixed-content, cross-origin or Local Network
Access protections for a local HTTP daemon. If your browser offers permission,
grant it only for the intended robot. If access is blocked, open the robot's own
page in a separate tab or use the guarded local bridge below. Do not disable
browser security. Guest-network isolation, firewall rules and a competing session
can also prevent control or media. Webcam and microphone permission are requested
only for the features that use them.

## Local guarded bridge

Wireless runs its daemon on the robot; Lite uses USB and its supplied power
adapter, with a daemon on the computer. Consult the official
[Wireless guide](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started),
[Lite guide](https://huggingface.co/docs/reachy_mini/platforms/reachy_mini_lite/get_started)
and [REST API guide](https://huggingface.co/docs/reachy_mini/API/rest-api).

```sh
npm ci
npm run build
npm run setup
npm start
```

Enter your daemon's plain HTTP origin when prompted. Wireless commonly uses
`http://reachy-mini.local:8000`; Lite commonly uses `http://localhost:8000`.
Use the address appropriate to your network. No hardware identity is bundled.

Setup requests only `GET /api/daemon/status`, checks hardware identity and requires
daemon **1.10.0**. Other versions fail without saving. Setup never changes Wi-Fi
or daemon settings, wakes the robot or sends motion. Do not change firmware merely
to bypass the check. See [current status](STATUS.md).

After confirmation it writes ignored `local/config.json`. Existing configuration
is preserved unless you type `REPLACE` or pass `--replace`; retain custom settings
before replacing it. Setup never clears `local/unknown-outcome.json`.
Open **http://localhost:18750** after starting. The bridge binds to loopback;
do not expose it directly to the internet. Coordinate exclusive robot or port use
with other local operators.

### Approve attended head controls

Head movement is disabled by default. To approve manual controls and webcam following:

```sh
npm run setup -- --head-follow
```

Existing configuration still requires explicit replacement. This enables **±20°
turn / ±15° nod**, records operator approval and keeps physical axis verification
false. Manual tilt is ±15° and position axes ±10 mm. These are application limits,
not certified hardware bounds. Check direction and clearance while attended.
Webcam movement requires the UI's explicit hold control.

Robot writes require explicit input. Commands never replay after reconnect.
Local Stop drains in-flight writes before holding fresh measured positions;
uncertain outcomes or a foreign controller can lock movement until recovery.
Stop is software control, not a hardware emergency stop. Closing the page does
not automatically put the robot to sleep.

### Noninteractive setup

```sh
npm run setup -- --url http://reachy-mini.local:8000 --head-follow --yes
npm run setup -- --help
```

`--yes` requires `--url`. Add `--replace` only to replace existing configuration.
Credentials, URL paths, queries and fragments are rejected. Output does not
print the detected hardware identity.

## Hosted network setup

Open [guided setup](https://mesmerprism.com/reachy-mini/#setup), choose Bluetooth
or Wi-Fi and keep the tab loaded during network changes. Neither route changes
the computer's Wi-Fi automatically. Control uses a separate SDK connection,
requires daemon **1.10.0**, and does not inherit the local bridge's Stop guarantees.

Bluetooth probes PING, Wi-Fi status and encrypted provisioning in sequence.
Only an exact unsupported-command reply establishes command absence; timeouts
and malformed replies remain inconclusive. PIN and credential submission appear
only after checks pass and require explicit input. The observed factory service
lacked the required commands. Daemon version alone does not establish Bluetooth
capabilities. Use the chooser's named device entry to identify the intended robot.
Stock encryption protects passive observation but does not authenticate against
active Bluetooth impersonation; use an isolated temporary network for initial setup.

Direct Wi-Fi checks a chosen private/local host through its local HTTP API.
A supporting browser may request Local Network Access permission. Requests do
not scan addresses or use redirects, cookies, browser storage or a cloud relay.
The route admits audited Wireless daemon **1.2.11**. Newer source restricts website
origins; matching API routes alone cannot establish hosted-site compatibility.
Unknown versions, blocked access and unsupported Bluetooth retain the robot-owned
Settings/dashboard alternative. Do not disable browser protections.

Keep the motion daemon OFF during network changes. Use a temporary hotspot
password: the legacy API places it in a local HTTP query that may appear in
robot/browser diagnostic logs. The page clears credentials and never saves them.
Existing saved profiles may reuse their saved password instead of replacing it.
These forms configure personal Wi-Fi, not eduroam/802.1X.

An acknowledgement does not prove joining. After a network transition, join the
target network on the computer, enter Reachy's current address and check status.
Only the intended SSID in WLAN mode confirms the result. A lost response stays
unconfirmed and blocks another submission, including a switch to Bluetooth,
while this setup instance remains open. Nothing resends automatically. Leaving
setup clears local credentials; a submitted robot request can still finish.
Reloading discards in-memory evidence, so observe the robot before submitting again.

Hugging Face registration is a separate robot-owned browser handoff offered for
checked versions. Review scopes yourself. Internet access, account authorization
and remote-control compatibility remain separate checks. Read
[status](STATUS.md) for the observed Wi-Fi results and fresh access-point gaps.

### Optional browser software update

For an observed Wireless daemon **1.2.11**, the wizard can check and start the
robot's stable updater. Keep motion stopped, review the offered version,
acknowledge readiness and click Start software update once. Keep power and network
available; the robot downloads official packages. Setup sends no motion or Wake
commands, and never starts an update automatically. This in-page update path
has **not** been hardware verified.

The legacy installer selects the current stable package at installation time,
not our controller's audited version. An uncertain response blocks a second
update submission in the open tab. Progress checks and version verification are
explicit read-only actions. Reloading discards the receipt; observe the robot
before attempting another update.

A Completed label or closed connection is not verification: the legacy wrapper
does not check installer exit codes and job records do not survive restart.
Inspect fresh healthy daemon status matching the offered version. Pasted status
is labeled user-reported. An unexpected version remains unconfirmed; unsupported
control versions stay blocked. Use robot-owned Settings or official recovery
instructions after failure, without automatically repeating an uncertain update.

Reviewed upstream interfaces:
[Wi-Fi router](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/daemon/app/routers/wifi_config.py),
[update router](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/daemon/app/routers/update.py),
[installer](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/utils/wireless_version/update.py)
and [subprocess wrapper](https://github.com/pollen-robotics/reachy_mini/blob/e25d28a52f657354716b693ca6d557fe3595702a/src/reachy_mini/utils/wireless_version/utils.py).
See Chrome's [Local Network Access documentation](https://developer.chrome.com/blog/local-network-access).

## Agent diagnostics CLI

The optional Node CLI makes read-only status and publication-integrity checks.
It has no robot mutation commands:

```sh
npm run agent -- --help
npm run agent -- status --host reachy-mini.local
npm run agent -- guidance --status-file local/daemon-status.json
npm run agent -- validate-export
npm run agent -- verify-site --url https://mesmerprism.com/reachy-mini/
```

Call `node tools/Agent-Diagnostics.mjs` directly for JSON-only stdout. Exit 0 means
completed; exit 2 means failed with a sanitized code. `guidance --stdin` accepts
status JSON from a pipe. Reports omit hardware identity, network names, addresses,
raw errors and credentials.

`status` makes one bounded GET to the selected private/local host, without
redirects, scanning or configuration reads/writes. Legacy status can be a
successful diagnostic result even when control is unsupported. Version guidance
does not prove Bluetooth capability.

`validate-export` audits the public source inventory without exporting.
`verify-site` checks declared build/source files and the ZIP against manifest
sizes and SHA-256 hashes. For a local projection use
`verify-site --site-dir local/pages`. This checks publication consistency,
not independent authenticity, rendered behavior or robot health. Hosted build
manifests also inventory the copied MediaPipe runtime and webcam model resources.

## Models and builds

Ordinary local and hosted builds use the original schematic. Optional
`npm run prepare:cad` retrieves pinned official CAD for private staging; set
`VITE_REACHY_MODEL=private-cad` when building the local UI to opt in. Configuration,
downloaded caches and generated CAD remain ignored and excluded from downloads.
Review [third-party notices](../THIRD_PARTY_NOTICES.md) before redistribution.

## Spatial controls, page console and WebXR

The look-direction pad combines turn and nod. Click or drag the head glyph to
set tilt. Antennas now share the 3D panel: enable **Move antennas in 3D**, then drag
a solid antenna. Ordinary dragging orbits the view. From an edge-on view, a relative
horizontal drag changes the angle. Teal wireframe outlines show requested antenna
positions; solid geometry continues to show measured feedback. Compact Left/Right
numeric inputs work without entering the 3D movement mode. Head gesture arrow keys
adjust one degree (five with Shift); Home centers the selected gesture. Fields accept drafts;
press Enter or leave the field to apply, and Escape to discard. Position and
speed settings are available under the advanced disclosure. Desktop camera, model
and head controls share one row; smaller screens stack them. Audio, tracking, emotes
and WebXR are expandable sections on that same page. Solid head handles show
requested targets; dashed markers and labelled values show measured feedback.
Directions are Reachy's own. Body yaw is measured only and stays unchanged.

Open **Agent console** in the Controls or Demo view. `help`, `status` and
`capabilities` are read-only. After explicitly arming writes for that connection,
use `head yaw=2 pitch=-2`, `antennas left=10 right=-10`, `wake`, `sleep` or `stop`.
Head angles are degrees; x/y/z use millimetres. Omitted axes keep measured values.
This bounded grammar cannot execute computer-shell commands, sign in, change
firmware or change networks. Motion uses the existing conservative controller
limits. Stop is a software request with the transport's existing limitations.

Automation can call `window.reachyAgent.run('status')` and
`window.reachyAgent.help()`. Call `window.reachyAgent.arm()` before a write, then
`await window.reachyAgent.run('head yaw=2')`. No cursor interaction is required.
Arming requires a visible, ready connection and does not connect, wake or move
Reachy. Call `window.reachyAgent.disarm()` to revoke agent writes and discard unsent
targets; use `run('stop')` for the separate software Stop request.
Explicit Stop remains callable on the active connection when stale telemetry
revokes movement authorization; it does not require arming.
Writes remain off until explicitly armed in the visible tab,
and are disabled when the connection changes, following owns the controls or the
tab is hidden. Optional WebMCP exposes read-only `reachy_help`, `reachy_status`
and `reachy_capabilities`, plus `reachy_arm`, `reachy_disarm` and
`reachy_command({command: 'head yaw=2'})`. Agents should read status, arm explicitly,
issue one bounded command and inspect measured feedback; a queued response does
not confirm arrival. Re-arm after Wake or other actions revoke the write session.
The console works when that experimental
browser API is absent. Tool registrations use lifecycle-bound abort signals as in
[Chrome's imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api).

The **Headset view** uses the same page and connection. Open the HTTPS page in a
WebXR headset browser, then choose Enter VR. Camera media uses the existing feed;
entering VR does not capture a new webcam, wake Reachy or start following.
Following requires explicit enablement, fresh bounded measured head angles and a
held controller trigger. Its relative turn/nod/tilt mapping preserves position,
antennas and body yaw. Release, Stop, stale tracking, a changed connection or a
lost control gate disarms following; it never restarts itself. Physical headset
mapping and camera behavior remain unverified. See
[WebXR session requirements](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession).
