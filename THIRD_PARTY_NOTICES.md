# Third-party notices

The controller's original application code is Copyright (c) 2026 MesmerPrism,
licensed under [MIT](LICENSE). That license does not relicense dependencies,
machine-learning models, motion datasets, robot hardware designs or trademarks.
The downloadable source package contains application source, its lockfile,
tests, setup tools and the license texts listed below. It contains no installed
dependencies, generated model meshes, robot configuration, recordings or SDK
binaries. `npm ci` installs dependencies under their own licenses.

## Software dependencies

| Component | Source / license | Retained text |
|---|---|---|
| React Scheduler (browser runtime) | [Meta / React](https://github.com/facebook/react), MIT | [Scheduler](licenses/React-Scheduler.txt) |
| Hugging Face Hub and Tasks helpers (SDK runtime dependencies) | [Hugging Face JavaScript](https://github.com/huggingface/huggingface.js), MIT | [Hub](licenses/Hugging-Face-Hub.txt), [Tasks](licenses/Hugging-Face-Tasks.txt) |
| React and React DOM | [Meta / React](https://github.com/facebook/react), MIT | [React](licenses/React.txt), [React DOM](licenses/React-DOM.txt) |
| Lucide React | [Lucide](https://github.com/lucide-icons/lucide), ISC; portions from Cole Bemis / Feather retain MIT attribution | [Lucide](licenses/Lucide.txt) |
| Three.js | [Three.js authors](https://github.com/mrdoob/three.js), MIT | [Three.js](licenses/Three.txt) |
| Pretext | [Pretext contributors](https://github.com/chenglou/pretext), MIT | [Pretext](licenses/Pretext.txt) |
| ws | [ws contributors](https://github.com/websockets/ws), MIT | [ws](licenses/ws.txt) |
| Vite | [Vite contributors](https://github.com/vitejs/vite), MIT with bundled dependency notices | [Vite and bundled notices](licenses/Vite.txt) |
| MediaPipe Tasks Vision | [Google / MediaPipe authors](https://github.com/google-ai-edge/mediapipe), Apache 2.0 | [MediaPipe](licenses/MediaPipe-Apache-2.0.txt) |
| Reachy Mini JavaScript SDK 1.8.0 | [Pollen Robotics](https://github.com/pollen-robotics/reachy_mini/tree/main/ts), Apache 2.0 | [JavaScript SDK](licenses/Reachy-Mini-JavaScript-SDK.txt) |

Exact installed versions and dependency integrity values are in
`package-lock.json`. Transitive packages retain the licenses in their installed
distributions; their notices must also be retained when redistributing a built
application. The source ZIP does not bundle those installed distributions.

The hosted page bundles reviewed, unmodified Newsreader Latin and Latin Extended
WOFF2 fonts by Production Type / the Newsreader Project Authors, under SIL Open
Font License 1.1. The binaries are included in the source repository and ZIP;
their [Newsreader OFL](licenses/Newsreader-OFL.txt) notice is retained separately
from the application's MIT license. The SDK's optional host-shell MUI/Emotion
packages are installed dependencies but are not imported into this page's
browser runtime; their own distribution notices remain with those packages.

## Webcam face model

`tools/Prepare-HeadAssets.mjs` downloads Google's pinned Face Landmarker float16
bundle version 1 and verifies SHA256
`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.
The model binary and MediaPipe WASM runtime are acquired during local setup,
not included in the downloadable source ZIP.

Google's [Face Landmarker guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker)
identifies the bundled BlazeFace short-range, FaceMesh V2 and Blendshape models.
Their official model cards each state Apache License 2.0:
[BlazeFace](https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20%28Short%20Range%29.pdf),
[FaceMesh V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf),
[Blendshape V2](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf).
The retained [Apache text](licenses/MediaPipe-Apache-2.0.txt) applies separately
from the controller's MIT license. Face landmarks do not establish identity.

## Reachy Mini source and motion assets

Pollen Robotics' [Reachy Mini SDK / daemon source](https://github.com/pollen-robotics/reachy_mini/tree/7f54717586369155900eeeb43fd4bbbb62064f22)
is credited for the daemon API, WebRTC signaling and bidirectional media
contracts, pose conventions, kinematics reference and model conversion inputs.
The application is an independent consumer of these documented interfaces;
the source ZIP installs the SDK through its lockfile rather than bundling the
installed SDK package. Retain the upstream
[Apache 2.0 license](licenses/Reachy-Mini-Apache-2.0.txt) for any separately
acquired SDK code or adapted upstream samples.

Emotes are discovered from the daemon's installed
[Pollen Robotics emotion dataset](https://huggingface.co/datasets/pollen-robotics/reachy-mini-emotions-library).
Neither motion nor sound files are included in this package. Those assets
retain their upstream terms; the application's MIT license grants no new
rights over them.

## Robot model meshes are excluded

The upstream Reachy Mini README distinguishes its Apache-licensed software from
[hardware design files described as Creative Commons BY-SA-NC](https://github.com/pollen-robotics/reachy_mini/blob/7f54717586369155900eeeb43fd4bbbb62064f22/README.md#license).
The exact Creative Commons version, per-file scope and vendor-part notices
have not been resolved for every selected geometry file. Software licensing
does not establish mesh redistribution rights.

Accordingly, the public source package includes the original converter and
validator code, but excludes source CAD/STL/URDF/MJCF data, downloaded source
caches, generated GLBs, generated asset manifests and hardware notice snapshots.
Building model assets downloads upstream geometry separately for local use.
Review the upstream hardware terms before using or redistributing those assets,
and resolve the per-file rights before publicly distributing generated meshes.

The hosted controller's schematic 3D view uses original primitive geometry
under the controller's MIT license. Its proportions and pivots are approximate;
it includes no upstream CAD/STL geometry or converted hardware mesh.

## Inspiration and names

The camera-and-gesture operator layout was inspired by
[OriHime](https://orihime.orylab.com/features.html). No OriHime software, artwork,
model assets or trademarks are licensed by this package. Reachy Mini, Pollen
Robotics, Google, MediaPipe, OriHime and other product names belong to their
respective owners. This independent controller does not imply their endorsement.
