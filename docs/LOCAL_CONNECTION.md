# Direct local browser connection

The hosted Connect page offers **Local network** and **Account access**.
Local network connects directly to the selected robot's existing GStreamer
WebSocket signaller on port 8443, then carries video, audio and control over
WebRTC. It requires no Hugging Face account, laptop bridge, robot install or
download. The robot and browser must be mutually reachable on the local network.

The adapter replaces only the SDK 1.8.0 rendezvous transport. Its real WebRTC
negotiation, command writer and reply decoder remain in use. WirelessControl
retains exact daemon 1.10.0/1.11.0 admission, optional checked identity binding,
complete/fresh telemetry, bounded targets and queued-only acknowledgements.
No automatic Wake, retry, reconnection, discovery scan or startup target is sent.
An expired or failed connection requires an explicit new connection. Switching
tabs pauses controls and media without intentionally closing a healthy session.
Unsent targets are discarded; return requires fresh telemetry and new input.
Leaving the page or pressing Disconnect closes the session.
Submitted daemon emotes and Wake/Sleep can finish while controls are paused;
tab switching does not cancel them or prove physical motion has stopped.

The selected address must be a private IPv4 literal or `.local` hostname, with
no supplied scheme, port, path or credentials. Local signaling is bounded and
malformed frames close the session. WebRTC errors also clear local admission.
Local ICE does not use the SDK's default external STUN service. LAN access does
not authenticate an owner through Hugging Face; use it on a trusted network.

Browser local-network permission, mixed-content handling and network isolation
still apply. Support differs by browser. HTTP REST CORS and the local WebSocket
handshake are separate: a blocked optional HTTP check does not prove that local
WebRTC is blocked. No robot CORS configuration or browser security setting is
weakened. Account access remains an explicit alternative.

On October 30 the usual physical 1.10.0 robot passed a stationary local preview
connection: live identity/version, fresh measured pose, asleep motor state,
camera negotiation and explicit disconnect. Wake remained separate and no motor
command was sent. The deployed HTTPS page was also tested in the in-app browser:
that browser blocked local WebSockets before the handshake, and the page kept
control disabled with an explicit error. The user subsequently reported a
successful normal-Brave HTTPS connection, Wake and physical head/antenna control,
followed by head-limit and tab-disconnect bugs. Version 0.3.10 addresses the
reproduced browser causes; physical verification of those corrections remains
separate. The different 1.11.0 robot previously negotiated local identity
but had unstable/slow links; stable local operation on it remains unqualified.

Offline tests use the actual pinned SDK for local discovery and lifecycle,
malformed frames, failed sends, deadlines and failed SDP handling. They do not
replace physical robot, network, browser or movement qualification.
