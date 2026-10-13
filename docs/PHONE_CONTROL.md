# Android phone motion in the demo

Phone turn, nod and tilt can control the simulated head. These inputs are enabled
only in Demo and cannot control a physical robot. Translation stays on the touch
controls; body yaw and antennas are preserved. No app installation, Bluetooth,
robot token or robot software change is required.

## On the phone itself

Open the HTTPS [Demo](https://mesmerprism.com/reachy-mini/#demo), expand **Phone
motion · demo** and select **On this phone**. Android Chrome is the initial target;
actual browser, hardware and motion permission support are checked at runtime.

1. Enable phone sensors. Permission is requested only after this action.
2. Hold the phone upright and choose **Set phone neutral**.
3. Enable motion following, then hold the large button to turn, nod and tilt.
4. Release to end following and stop simulation requests. Each new hold captures
   the current phone and measured simulated pose, avoiding an old-reference jump.

Screen rotation invalidates neutral. Hidden tabs, blur, invalid or stale readings
revoke input. A quiet sensor that supplies no new readings cannot be restamped to
keep following alive. Re-enable sensors/following as indicated. Manual controls,
webcam following, agent writes and XR cannot compete while phone input owns the
head. Global Stop requires explicit re-enablement.

## Phone to a PC demo

Keep both devices on the same Wi-Fi and their pages visible. On the PC, open Demo
→ Phone motion → **Pair a phone to this demo**. On the phone, open the
[phone controller](https://mesmerprism.com/reachy-mini/#phone).

1. Create a PC connection code and copy it to the phone page.
2. Connect there, then copy the phone reply code back to the PC.
3. Finish pairing on the PC and explicitly enable the paired phone.
4. On the phone, enable sensors, set neutral, enable following and hold its button.

Codes are private, single-use setup data and expire after two minutes. They stay
in tab memory and are cleared after connection/disconnection. Use your own method
to transfer them between devices; no account or signaling server is supplied.
Do not put the codes in public chat, screenshots, reports or issue comments.
They contain connection information and a temporary pairing secret.

The paired transport uses a WebRTC data channel with local candidates only and
no external STUN/TURN service. Guest Wi-Fi isolation, firewalls or incompatible
browser network behavior can prevent pairing. There is no relay fallback or
automatic retry. Disconnect and create a new pairing when needed. Small device
clock differences are tolerated during setup; pose freshness uses the PC's clock
and short-lived challenges, rather than assuming synchronized phone timestamps.
Every pose repeats the orientation captured at the current button press. Losing
the first packet cannot discard the initial turn; the older press reference has
no authority to make the latest input fresh. New gestures retire prior holds,
including when a release packet is lost. A pending Stop discards incoming frames
until it finishes, with a short deadline and no stored-frame replay.

Pairing itself does not enable following. Input release clears unsent targets.
Stale input revokes PC approval; Stop/reapproval cannot resume an old held input.
Both sides require deliberate engagement after loss or a new authorization.
No power, authentication, general command or robot connection capability is
exposed by the phone controller. The existing local bridge remains loopback-only.

## Evidence and limits

Synthetic sensor tests and browser simulation verify mapping, permission handling,
ownership, stale input and pairing lifecycle. Browser peer-to-peer tests on one
machine do not establish reliable Android sensor cadence or phone-to-PC LAN
behavior. Those require checks on an actual phone. No physical robot validation
is implied; the current yaw settling limitation remains unresolved.

Phone sensors report browser delivery/sample timestamps, not verified physical
sensor age. Relative orientation can drift and may require recentering. Phone
acceleration is not used to infer physical head translation.

References: [Chrome sensor APIs](https://developer.chrome.com/docs/capabilities/web-apis/generic-sensor),
[orientation events](https://www.w3.org/TR/orientation-event/),
[WebRTC](https://www.w3.org/TR/webrtc/).
