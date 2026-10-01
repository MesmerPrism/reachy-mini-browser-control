import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import WirelessPanel from './WirelessPanel.jsx';
import FitText from './FitText.jsx';
import FirstSetup, { ExistingRobotGuide } from './FirstSetup.jsx';
import './style.css';
import { version } from '../package.json';

const sourceArchive = `./downloads/reachy-mini-controller-v${version}.zip`;

function currentView() {
  const hash = window.location.hash.slice(1);
  return ['setup', 'connect', 'demo', 'use', 'source', 'local'].includes(hash) ? hash : 'home';
}
function Page() {
  const [size, setSize] = useState('normal');
  const [view, setView] = useState(currentView);
  const main = useRef(null);
  useEffect(() => {
    const navigate = () => { setView(currentView()); main.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  return <div className={`page ${size}`}>
    <header><a href="#home"><FitText>Reachy Mini</FitText></a><nav aria-label="Page sections">{[['connect', 'Controls'], ['demo', 'Demo'], ['setup', 'Wi-Fi setup'], ['use', 'Help'], ['source', 'Source']].map(([id, label]) => <a key={id} href={`#${id}`} aria-current={view === id ? 'page' : undefined}><FitText>{label}</FitText></a>)}</nav></header>
    <main ref={main} tabIndex={-1}><div className="page-heading"><h1>{view === 'home' ? 'Reachy Mini in your browser' : 'Reachy Mini'}</h1>
      <details className="text-options"><summary>Text display</summary><label htmlFor="text-size">Display size and spacing</label><select id="text-size" value={size} onChange={event => setSize(event.target.value)}><option value="normal">Normal</option><option value="large">200% text</option><option value="spaced">Increased text spacing</option></select></details></div>
      <section id="home" hidden={view !== 'home'}>
        <p className="intro">Move the head and antennas, see Reachy’s measured pose, watch its camera and talk through its speaker.</p>
        <div className="start-options"><div><h2>Reachy is already on Wi-Fi</h2><p>Check the current robot, connect your account and open the controls. No network reset or setup wizard is needed.</p><a className="download primary" href="#connect">Connect to Reachy</a></div><div><h2>Reachy needs Wi-Fi</h2><p>Use guided connection checks to find a supported setup route for your Wireless Mini.</p><a className="download" href="#setup">Configure Wi-Fi</a></div></div>
        <p>Browser control currently supports Wireless daemon 1.10.0. Network setup can use other versions’ own browser pages. For Lite over USB, use the <a href="#local">local controller</a>.</p>
        <p>No robot yet? <a href="#demo">Try the simulated Reachy</a>. Move its head and see how the camera view changes in a 360° room.</p>
      </section>
      <section id="connect" hidden={view !== 'connect'}><h2>Connect to Reachy</h2><p>Already on Wi-Fi? Connect below. Need a network first? <a href="#setup">Configure Wi-Fi</a>. Leaving this view disconnects the control session.</p>{view === 'connect' && <><ExistingRobotGuide /><WirelessPanel /></>}</section>
      <section id="demo" hidden={view !== 'demo'}><h2>Try Reachy without a robot</h2><p>This simulation uses an animated schematic robot and an AI-generated room panorama. It does not connect to hardware. Turn, nod or tilt the head to explore the camera view.</p>{view === 'demo' && <WirelessPanel initialDemo />}</section>
      <section id="setup" hidden={view !== 'setup'}><h2>Set up your robot</h2>
        <p>Keep this tab on Setup while provisioning. Leaving setup disconnects Bluetooth and clears credentials; a network request already submitted to Reachy may still finish there.</p>
        <p>Exploring without hardware? <a href="#demo">Try the simulated robot and camera</a>.</p>
        {view === 'setup' && <FirstSetup />}
        <details><summary>Official setup alternative and control requirements</summary>
        <ol><li><strong>Choose your model.</strong> Browser-only control is for Wireless Mini with daemon 1.10.0. For Lite over USB, use the <a href="#local">local controller</a>. Other daemon versions are blocked until their protocol has been checked.</li>
          <li><strong>Connect Wireless to Wi-Fi.</strong> Power it on and follow the official <a href="https://huggingface.co/docs/reachy_mini/platforms/reachy_mini/get_started">first-time connection guide</a> in Reachy Mini Control. Its wizard joins the robot’s temporary access point and configures your home network. Keep your computer and robot on the same home network for the simplest connection. Guest networks or firewalls may prevent peer-to-peer media.</li>
          <li><strong>Enable remote access.</strong> In the official Control app, sign the robot in to your Hugging Face account and enable its remote/WebRTC connection. Check that the robot appears in Pollen’s robot picker. Follow the <a href="https://huggingface.co/docs/reachy_mini/SDK/javascript-sdk">official browser connection documentation</a> if it does not.</li>
          <li><strong>Create a read token.</strong> Open <a href="https://huggingface.co/settings/tokens">Hugging Face access tokens</a>, create a read token in the same account, and paste it in the form above. The token is held in this tab’s memory and sent to Pollen’s signaling service; it is never written to browser storage or our server. Clear it by disconnecting or closing the tab.</li>
          <li><strong>Select your robot.</strong> Close other controllers and stop robot apps first. Connect, check the displayed identity and version, then press Wake when you are ready. Connecting does not wake or move Reachy.</li></ol></details>
        <details><summary>Connection troubleshooting</summary><p>If no robots appear, check the account, token, robot power and remote-access setting. If a session is rejected, close the other controller. If video cannot connect, check your router/firewall and try the same network. Refreshing this page does not reconnect or replay movement. Camera and microphone permission are needed only for local webcam tracking and push to talk.</p></details>
      </section>
      <section id="use" hidden={view !== 'use'}><h2>Use the controls</h2><p>Head controls show the pose you request; the measured values and 3D view show what Reachy reports. Turn looks left or right, nod looks up or down, and tilt leans the head sideways. Start with small movements. Position and speed adjustments are separate. These are conservative software limits, not the robot’s entire mechanically possible workspace.</p>
        <p>The public view uses an original schematic model. The local controller can prepare official CAD meshes. Their hardware license is separate from this app’s MIT license.</p>
        <p>To follow your head, start the webcam, look forward, set neutral, then enable following. Images are processed locally. Following stops if tracking is lost, telemetry gets stale, you press Stop, or the tab loses focus. A camera preview alone never moves the robot.</p>
        <p>Listen plays Reachy’s microphone through this browser. Listening volume changes your computer playback, while speaker volume changes Reachy. Enable your computer microphone explicitly, then hold Push to talk. Releasing the button, leaving the tab or disconnecting disables transmission. Avoid feedback by using headphones.</p>
        <p><strong>Browser transport limits:</strong> target and Stop frames are queued, not acknowledged as applied. A fresh pose is not proof that a command was accepted. The daemon may ignore a target during another move. WebRTC session admission does not expose external app/motion ownership. Stop is a software request, not an emergency stop; use the robot’s power switch if motion does not stop.</p>
      </section>
      <section id="local" hidden={view !== 'local'}><h2>Full local controller</h2><p>Use this option for Lite, official CAD, or the existing acknowledgement and app-ownership checks. It runs a loopback bridge on your computer. Robot addresses entered in hosted Wi-Fi setup stay in your browser and are used only to contact the robot directly.</p>
        <p><a className="download" href={sourceArchive}><FitText>Download controller source ZIP</FitText></a> <a href={`${sourceArchive}.sha256`}>SHA-256</a></p>
        <ol><li>Install <a href="https://nodejs.org/">Node.js 24 LTS</a> (or 22.12+), extract the ZIP, and open a terminal in the extracted folder.</li><li>Run <code>npm ci</code>, then <code>npm run setup</code>. Enter the robot’s dashboard address, such as <code>http://reachy-mini.local:8000</code> for Wireless or <code>http://localhost:8000</code> for Lite. Setup reads and pins its identity; it does not move the robot.</li><li>Run <code>npm run build</code>, then <code>npm start</code>. Open <code>http://localhost:18750</code>. To enable webcam motion, use <code>npm run setup -- --head-follow</code> and follow the <a href="./source/docs/SETUP.md">setup guide</a>.</li></ol>
      </section>
      <section id="source" hidden={view !== 'source'}><h2>Source, license & credits</h2><p>Original controller code and schematic geometry © 2026 MesmerPrism, released under the <a href="./source/LICENSE">MIT license</a>. View the <a href="https://github.com/MesmerPrism/reachy-mini-browser-control">complete source</a> and <a href="./source/THIRD_PARTY_NOTICES.md">third-party notices</a>.</p>
        <p>Reachy Mini, its daemon, JavaScript SDK and CAD are by <a href="https://github.com/pollen-robotics/reachy_mini">Pollen Robotics</a>. Software and SDK: Apache-2.0. Hardware README: Creative Commons BY-SA-NC, with no version stated; CAD is not included in this public bundle. Head tracking uses <a href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker">Google MediaPipe</a> and Apache-2.0 face models. Rendering uses Three.js, React and Lucide; text measurement uses Cheng Lou’s <a href="https://github.com/chenglou/pretext">Pretext</a>. Newsreader typeface: Production Type, <a href="./source/licenses/Newsreader-OFL.txt">SIL Open Font License</a>. Design guidance: <a href="https://github.com/GeorgeFejer91/uncodixfy-pretext">Uncodixfy Pretext</a>.</p>
        <p>This is an independent community controller. It is not an official Pollen Robotics product. There is no analytics, recording or automatic microphone/camera capture. Authentication and signaling contact Hugging Face/Pollen; WebRTC may contact the SDK’s STUN service to establish a peer connection.</p>
        <p>The simulated camera uses an AI-generated panorama distributed with the MIT-licensed demo. See its <a href="./source/public-site/DEMO_ASSETS.md">provenance and limitations</a>. Optional <a href="./source/docs/SETUP.md#agent-diagnostics-cli">agent diagnostics</a> provide read-only JSON reports without changing robot settings.</p>
      </section>
    </main><footer><a href="https://mesmerprism.com/">Mesmer Prism</a> · <a href="./source/README.md">Documentation</a> · <a href="https://github.com/MesmerPrism/reachy-mini-browser-control/issues">Report a problem</a></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<Page />);
