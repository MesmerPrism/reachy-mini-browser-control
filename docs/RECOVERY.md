# Reconnect a Reachy Mini

Open the hosted [reconnection guide](https://mesmerprism.com/reachy-mini/#recover)
when an initialized Wireless Mini stops responding. The guide is available from
Controls and Demo. Its browser capability check neither opens a Bluetooth chooser
nor sends robot commands. Robot addresses and copied status stay in the tab;
there is no automatic network scan, restart, Wake or command replay.

## Check what is reachable

Use the current address from the router's connected-device list or Reachy Mini
Control. Open the daemon's `/api/daemon/status` page directly. A saved address,
raised head, breathing sound or Bluetooth address report is not proof that the
daemon currently answers. Check from a second device on the same Wi-Fi when
possible. A timeout can reflect the daemon, network isolation, browser access
restrictions or the path used; it does not identify the cause by itself.

If the hostname fails, use the router's **current numeric address** for comparison.
Use the same address on the second device, on the same Wi-Fi, without mobile-data
or VPN routing for that check. If only one device fails, investigate its Wi-Fi,
name resolution and browser local-network permission first. If both fail, check
the live router connection entry and choose a recovery option. Neither result
by itself proves the specific routing fault described below.

If local status answers while hosted control fails, inspect the robot's account,
remote-access setting and other sessions. Local HTTP and hosted WebRTC are
different paths. Keep browser security enabled; use the robot's own tab or the
local controller when cross-origin or Local Network Access policy prevents a
hosted read. A copied status summary does not verify identity or admit motion.

## Bluetooth recovery

Web Bluetooth availability varies by browser, operating system, adapter and policy.
Desktop Chrome or Edge and Chrome on Android are the usual supported routes.
Brave commonly blocks the API on desktop. Safari, Firefox and iPhone browsers
usually do not expose it. Inspect actual capability rather than assuming support
from the browser's name. The controller's WebRTC motion path does not require
Web Bluetooth.

Use Pollen's [Bluetooth console](https://pollen-robotics.github.io/reachy_mini/)
or the desktop app's **First time WiFi setup → Try the Bluetooth Console** path.
Stay beside the selected robot, authenticate with its printed serial-number PIN
and explicitly choose daemon restart once. The guide keeps PIN entry and restart
submission in the official tool. It does not implement another privileged robot
transport or infer that encrypted Wi-Fi provisioning is required for maintenance.

A failed or lost reply can follow an executed restart. Observe the robot and
check current daemon status before deciding on another action. Never automatically
retry a submitted maintenance command. Wi-Fi reset, software reset and firmware
updating are separate operations, not reconnection defaults.

A daemon restart can execute successfully without repairing the robot's OS
networking. In the investigated local-route failure below, it did not restore
external IPv4 access. Repeated daemon restarts are not a repair for that condition.
Use attended physical recovery or seek network diagnostics if status remains
unreachable after the deliberate restart.

## Physical recovery and reconnecting

Pollen's power-cycle procedure is OFF, a pause of at least five seconds, then ON.
Use the actual power control so the embedded computer restarts; Sleep/Wake alone
is not a power cycle. Observe startup and recheck the current address. Startup can
take longer than a minute; a delayed reply is not a reason to restart repeatedly.
After recovery, connect explicitly, verify current identity and the
admitted daemon version, then Wake explicitly when attended. Saved targets and
agent write authorization are not restored.

An October 13 attended session recovered daemon connectivity after an operator
power cycle. A later local sequence recorded healthy reads after Stop and after
Sleep before losing access. That timing does not establish a Stop/Sleep cause.
An isolated official 1.10.0 source reproduction found a maintenance-reply error;
it is not inspection of the installed Bluetooth service or proof of the network
failure's cause. Later installed-service logs established that a submitted restart
did execute without repairing the separate routing failure. This does not turn
every failed maintenance reply into confirmed success. See [dated hardware and offline limits](STATUS.md).

## Repeated network failures: October 13 findings

The investigated robot kept its Wi-Fi association and assigned IPv4 address while
losing the automatically generated route to the local subnet. Its daemon answered
on loopback and its gateway remained reachable. NetworkManager **1.52.1-1+rpt4**
logged a conflict event; later detailed logging showed the address-conflict state
was not ready. Traffic to a same-subnet client was directed through the gateway.
A bounded route trial restored external daemon status, and removing the trial
route reproduced the access failure. These observations establish a local IPv4
routing failure; they do not establish the source of the original conflict.

The original event included an all-zero sender hardware address, but its packet
was not captured. `ACD_CONFLICT` does not by itself prove a real duplicate-address
source. A later passive capture saw no recurrence. Healthy reads after Stop and
Sleep leave their causal relationship to the conflict unresolved. This browser
guide cannot read the robot's route table or NetworkManager state, and a copied
daemon status does not contain enough information to diagnose this fault.

### Workaround and lasting repair

One extra on-link route was saved in the existing Wi-Fi profile after diagnosis,
with an exact rollback and external connectivity checks. It survived one verified
robot reboot; the unmodified stock NetworkManager package remained installed.
Reapplying the profile also restored the native route, so the temporary route A/B
trial provides stronger causal evidence than the workaround's installation alone.
This is a **network-specific workaround**, not a general setup instruction. It
does not fix the retained conflict state and can preserve access during a genuine
address conflict. An operator must verify the active profile and subnet, exclude
a real duplicate, preserve existing settings and retain a rollback path. Review
it when the network changes. Do not copy another robot's route, disable address
conflict detection or treat connectivity as proof of a healthy network state.

A candidate change to NetworkManager's recovery logic was tested separately in
isolated Linux network namespaces. With a retained IPv4 address, the unchanged
engine stayed in conflict with the generated route absent. The candidate forced
a fresh probe: it restored the native route when no duplicate answered and kept
that route absent when a live duplicate answered. An additional test demonstrated
that an explicit static route can remain during a conflict, illustrating the
workaround's limitation.

The original validation recorded **10 passing Linux cases and four known upstream
skips**, using x86-64 Linux with eBPF disabled. Six later edge cases covered a zero
probe timeout, repeated USED retries, pending address/configuration removal and
link lifecycle. Two separate real DHCP transactions covered ordinary acquisition
and duplicate-address decline followed by a replacement lease. These are separate
runs, not one complete suite or reproduction of the original field event.

The retained-address recovery fixture used ONCE defense and an externally retained
address. A separate live-duplicate link-reset check accepted the duplicate on both
unmodified and candidate source: another retained-address shortcut remains outside
the patch. This is an unresolved protection gap, not a passing recovery test.
The robot's ARM platform, kernel/driver path, eBPF, full lease renewal/expiry and
the original conflict trigger remain unverified. The candidate patch **has not
been installed on the robot** and is not ready for production. The lasting repair needs review and validation in
the robot's networking package or OS image; changing the browser page does not
repair NetworkManager. The patch and reproduction artifacts are not part of this
controller's source download or MIT license grant.

A later connection attempt used an old address that no longer answered; a freshly
verified new address restored access while both native and workaround routes
remained present. That was an address change, not evidence of another missing
route. A short capture spanning a guarded yaw pilot and separate Stop/Sleep
observation windows recorded healthy daemon reads and no new conflict. It does
not establish why the earlier conflict happened or guarantee prevention.

### October 15 bounded network follow-up

Two finite 180-second observation windows bracketed isolated ARM software fixtures
while the installed real daemon remained unchanged and its motors stayed disabled.
Each window completed 36 identity-matched PC status GETs and 36 robot-loopback
GETs without failure. Captured address events were IPv6 lifetime refreshes; no
IPv4 route-loss event or new conflict appeared in the selected logs. Initial and
final boot identity matched, and direct routing to the PC used the explicit
workaround. Subsequent raw-table review corrected the initial route counter:
it counted a local-table broadcast record as a native subnet route. The reviewed
initial/final main tables have the static workaround, with no native unicast
subnet route. Raw receipts are retained alongside the correction.

The first window nevertheless included a 1.109-second PC read while loopback
reads remained short; the second PC maximum was 281 ms. These sampled availability
results do not qualify the controller's 500 ms freshness gate or diagnose the
latency outlier. No network settings, log levels, services or robot motion were
changed. Both finite observers exited and their evidence was retained privately;
scheduled polling was not re-enabled.

This did not reproduce the earlier fault, capture its ARP trigger, test a fresh
duplicate-address event or establish Wake/Sleep/reboot causality. Controlled
transition captures, narrow packet evidence and isolated duplicate/link/DHCP
renewal-expiry tests remain useful separate investigations. The stock networking
package and network-specific workaround are unchanged; the candidate repair
remains uninstalled.

A later disabled-only maintenance test added a finite 180-second OS capture and
36 successful PC TCP checks of the SSH port. Normal daemon HTTP was intentionally
unavailable while that service was stopped; this is not network disappearance.
The capture retained the workaround and observed only IPv6 lifetime refreshes.
It ended before normal startup completed; separate fresh checks subsequently
confirmed the restored daemon's identity, ready/disabled state and route table.
The native subnet route remained absent in these snapshots. This supports the
workaround's usefulness, without identifying when or why the native route was
lost. Scheduled polling remains off and no network settings were changed.

### Maintenance and support

An October 16 disabled P-gain maintenance cycle and later original-gain Wake/Sleep
observation completed with targeted logging. All 191 PC TCP checks succeeded;
54 HTTP failures were confined to the intentionally stopped daemon interval.
No new conflict was recorded. The static workaround remained present while the
native kernel subnet route was absent in both initial and final snapshots.
Network and logging settings were unchanged; capture helpers exited and recurring
polling stayed off. This adds a bounded transition observation, not reproduction
of the original fault, proof of prevention or evidence that Stop caused it.
See the [dated gain and transition result](P_GAIN_TRANSACTION.md#october-16-disabled-changed-p-roundtrip).

The October 15 snapshot-diagnostics follow-up obtained a qualified no-action
baseline with 37 successful PC status/SSH-port checks and 37 successful loopback
status reads. It covered more than 180 seconds after the collector's readiness
handshake, with zero packet-capture drops and confirmed observer exit. The static
workaround and direct client route were present throughout; the native main-table
subnet route was already absent. No new IPv4 loss or conflict trigger was captured.
An earlier baseline missed its explicit finish handshake and remains unqualified;
one of its PC HTTP reads timed out while SSH and loopback stayed available.

The subsequent transition recorder failed on a Windows local progress-file
replacement error. Its partial result does not qualify the maintenance cycle's
network effects. Hardware completion checks and original-software restoration
were obtained independently; lifecycle actions were not replayed for recording.
The private recorder's replacement/cleanup logic was corrected and passed 28
offline checks plus 12 actual Windows sharing-collision checks without robot
requests. This does not retroactively qualify the interrupted capture.
Finite capture periods are sampling bounds, not estimates of action completion
or proof that an intermittent fault is fixed. No network settings were changed
and scheduled polling remains off.

For an experienced operator with an already trusted maintenance connection,
use Pollen's [development workflow](https://huggingface.co/docs/reachy_mini/en/platforms/reachy_mini/development_workflow)
to inspect the robot. Compare Wi-Fi association, assigned addresses, the route
to the affected client, loopback daemon health and NetworkManager conflict/retry
logs. Check for a real address conflict before considering a workaround. Avoid
dumping saved Wi-Fi profiles: they can contain credentials. If the normal IPv4
path is broken, that same path cannot carry the repair; use an existing trusted
alternative or attended physical recovery.

The hosted guide has no privileged network repair service. An optional future
local or robot maintenance helper would need authenticated access, explicit
operator action, current profile/subnet checks, backups and exact rollback.
It must not automatically Wake or replay controller writes. Bluetooth maintenance
is limited to the capabilities the robot actually exposes; daemon restart does
not imply a route-repair capability. No such helper is included in this release.

For a support report, keep a redacted summary of:

- Browser/OS and daemon version, only if freshly known.
- Hostname versus current-address results and the second-device result.
- The last successful read, recent action sequence and timing, and whether a
  deliberate daemon restart or physical power cycle changed access.
- OS networking observations, if obtained through a trusted maintenance path;
  separate missing routes and conflict-state evidence from guesses about cause.

Keep raw status, logs, addresses, Wi-Fi names, hardware identities, profile details,
PINs, passwords and tokens private. Share the redacted summary with
[Reachy's maintainers](https://github.com/pollen-robotics/reachy_mini/issues).

An intentional maintenance stop also makes daemon HTTP unavailable. Verify
service state through an existing trusted maintenance connection before treating
that as a network recurrence. On October 15, an exact-session no-write recovery
restored original software and normal service after a backed-up gain transaction
failed its pre-write comparison. It required protected evidence, explicit
operator authority, a persistent startup mask, verified owner exit and journal
custody. The original pending record and backup were retained in protected
history; no native gain-restoration claim was made. See the
[maintenance recovery result](P_GAIN_TRANSACTION.md#october-15-no-write-recovery-and-original-service-restoration).
This private recovery does not add a public control-page bypass. Pending
transactions still require their applicable reviewed recovery procedure; manual
deletion or automatic restart would discard necessary guards and evidence.

Sources: [Pollen Bluetooth recovery](https://huggingface.co/docs/reachy_mini/en/platforms/reachy_mini/reset),
[Pollen troubleshooting](https://huggingface.co/docs/reachy_mini/en/troubleshooting),
[NetworkManager recovery implementation](https://github.com/NetworkManager/NetworkManager/blob/1.52.1/src/core/nm-l3cfg.c),
[Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth),
[Brave's disabled features](https://github.com/brave/brave-browser/wiki/Fingerprinting-Protections).
