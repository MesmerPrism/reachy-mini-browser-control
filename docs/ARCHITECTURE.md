# Architecture

One repository owns the app. The hosted website receives a static deployment
projection; it does not supply source authority, configuration or runtime services
for the local bridge. Optional device/Quest launch adapters can remain outside
the app and introduce no required runtime dependency.

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
status refreshes at most once per 1.5 seconds and does not admit motion. Diagnostics
retain the last slow snapshot and report manual-head per-axis error, combined
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
