# Reachy Mini browser control

A standalone browser app for Reachy Mini camera, audio, antenna and head controls,
emotes, and measured state. It uses Reachy's existing daemon and JavaScript SDK.
This independent prototype includes an original schematic viewer and a simulation.

Source home: [MesmerPrism/reachy-mini-browser-control](https://github.com/MesmerPrism/reachy-mini-browser-control).
Software license: [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md)
for dependency and asset licenses.

## Try the browser app

Open [mesmerprism.com/reachy-mini](https://mesmerprism.com/reachy-mini/) or the
[hardware-free demo](https://mesmerprism.com/reachy-mini/#demo). The hosted app
controls Wireless through the official SDK without a local Node bridge. Camera
and microphone features require browser permissions. The read token remains in
memory during the connection; it is not saved in browser storage or downloads.

Control currently admits daemon **1.10.0**. A robot observed on **1.11.0** remains
blocked: offline candidate fixtures do not establish hardware compatibility.
Guided network setup and control have separate version checks. Read the dated
[status and verification limits](docs/STATUS.md) before connecting hardware.

Guided setup offers explicit Bluetooth capability probes, a checked local Wi-Fi
API route, and robot-owned Settings/dashboard links. Unsupported Bluetooth,
unknown versions and browser access restrictions retain the robot-owned fallback.
Setup sends no motion or Wake commands. Its optional software updater requires
explicit readiness and submission; the complete fresh access-point workflow and
in-page update path still need attended hardware validation. See [setup](docs/SETUP.md).

The demo uses a synthetic panorama and simulated feedback. It is approximate
visualization, not calibrated sensing or physics. The real camera never substitutes
the panorama. See [demo asset provenance](public-site/DEMO_ASSETS.md).

Desktop controls prioritize the camera and head gestures beside a small measured
3D model. Drag the camera image to turn and nod with the same mapping as the look
pad. A separate **Shift head** pad moves sideways and vertically; forward/back
uses a small slider. Antennas have compact sliders inside the model panel, with
precise inputs and optional 3D dragging under its disclosure. Ordinary model
dragging orbits the view. Smaller screens
stack the panels. Audio, tracking, emotes, agent commands and WebXR remain available
in expandable controls on the same page.

## Run locally

Use Node **24** (CI baseline; Vite also supports Node 22.12+). Clone this repository
or extract the reviewed source ZIP linked from the hosted page:

```sh
npm ci
npm run build
npm run demo
```

Open **http://localhost:18750** for simulation. For the guarded local robot bridge:

```sh
npm run setup
npm start
```

Setup performs read-only status discovery, requires daemon **1.10.0**, and saves
your daemon origin and hardware identity in ignored `local/config.json` after
confirmation. The bridge binds to loopback. Head movement is disabled by default;
`npm run setup -- --head-follow` records operator approval for attended head controls.
See [local setup and limits](docs/SETUP.md).

Robot actions require explicit user input. There is no startup movement or command
replay on reconnect. Requested targets and measured state are distinct. Local
Stop drains in-flight writes before holding fresh measured positions; hosted SDK
transport has different capabilities. **Stop is software control, not a hardware
emergency stop.** Closing the page does not automatically put the robot to sleep.

## Develop and build

```sh
npm test
npm run build
npm run build:pages
npm run build:pages -- --base /reachy-mini-browser-control/
```

Tests use offline fixtures and do not operate a robot. Both build commands prepare
verified Google webcam assets: the pinned face model downloads on first use and
the WASM runtime is copied from installed dependencies. They do not fetch private
CAD. Later builds can reuse the verified local model. Local builds
use the original schematic by default. `build:pages` writes the standalone hosted
projection to ignored `local/pages`, with relative asset URLs by default;
`--base` selects a deployment path. Building does not publish the app.
The website is a deployment target, not a runtime dependency.

Optional `npm run prepare:cad` downloads pinned official CAD for private staging.
To opt into that prepared model locally, build with `VITE_REACHY_MODEL=private-cad`.
Those hardware assets have separate, unresolved redistribution terms and are
excluded from public downloads. Review [third-party notices](THIRD_PARTY_NOTICES.md)
before sharing generated models. Keep configuration, credentials, robot identities,
network details and private evidence out of commits and public archives.

Compact head/antenna gestures, the in-page agent console and experimental WebXR
headset view share the same Controls page. Read [interaction and automation details](docs/SETUP.md#spatial-controls-page-console-and-webxr).

For read-only diagnostics, `npm run agent -- --help` lists bounded status,
offline guidance and publication-integrity commands. See [CLI details](docs/SETUP.md#agent-diagnostics-cli).
For project structure and changes, read [architecture](docs/ARCHITECTURE.md) and
[contributing](CONTRIBUTING.md).
