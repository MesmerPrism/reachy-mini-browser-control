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

## Physical recovery and reconnecting

Pollen's power-cycle procedure is OFF, a pause of at least five seconds, then ON.
Use the actual power control so the embedded computer restarts; Sleep/Wake alone
is not a power cycle. Observe startup, allow about a minute and recheck the current
address. After recovery, connect explicitly, verify current identity and the
admitted daemon version, then Wake explicitly when attended. Saved targets and
agent write authorization are not restored.

An October 13 attended session recovered daemon connectivity after an operator
power cycle. A later local sequence recorded healthy reads after Stop and after
Sleep before losing access. That timing does not establish a Stop/Sleep cause.
An isolated official 1.10.0 source reproduction found a maintenance-reply error;
it is not inspection of the installed Bluetooth service or proof of the network
failure's cause. See [dated hardware and offline limits](STATUS.md).

Sources: [Pollen Bluetooth recovery](https://huggingface.co/docs/reachy_mini/en/platforms/reachy_mini/reset),
[Pollen troubleshooting](https://huggingface.co/docs/reachy_mini/en/troubleshooting),
[Chrome Web Bluetooth](https://developer.chrome.com/docs/capabilities/bluetooth),
[Brave's disabled features](https://github.com/brave/brave-browser/wiki/Fingerprinting-Protections).
