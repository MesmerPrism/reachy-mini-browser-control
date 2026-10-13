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

The recovery fixture used ONCE defense and an externally retained address with a
short probe timeout; it did not reproduce the unexplained field conflict under
normal DHCP ALWAYS defense or run a complete DHCP transaction. The candidate also
changes retries from USED, which still need repeated-retry coverage.

The validation recorded **10 passing Linux cases and four known upstream skips**,
using x86-64 Linux with eBPF disabled. It did not validate the robot's ARM platform,
its kernel/driver path, complete DHCP decline/new-lease behavior, all address/link
lifecycle paths or the original event's trigger. The candidate patch **has not
been installed on the robot**. The lasting repair needs review and validation in
the robot's networking package or OS image; changing the browser page does not
repair NetworkManager. The patch and reproduction artifacts are not part of this
controller's source download or MIT license grant.

### Maintenance and support

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

Sources: [Pollen Bluetooth recovery](https://huggingface.co/docs/reachy_mini/en/platforms/reachy_mini/reset),
[Pollen troubleshooting](https://huggingface.co/docs/reachy_mini/en/troubleshooting),
[NetworkManager recovery implementation](https://github.com/NetworkManager/NetworkManager/blob/1.52.1/src/core/nm-l3cfg.c),
[Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth),
[Brave's disabled features](https://github.com/brave/brave-browser/wiki/Fingerprinting-Protections).
