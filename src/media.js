// Pinned Reachy media_server.py offers SENDRECV audio; video is receive-only.
// No microphone capture occurs here. The empty audio sender is filled only by
// an explicit microphone/PTT action in useReachyMedia.
export function startReachyMedia({ token, video, audio, enableAudio = false, onState = () => {}, onError = () => {}, onAudioAvailable = () => {}, onVideoLive = () => {} }) {
  let socket, peer, sessionId, closed = false, timer;
  let audioSender, readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  ready.catch(() => {});
  const ice = [], tracks = [];
  const close = () => {
    if (closed) return;
    if (sessionId && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({type:'endSession',sessionId}));
    closed = true; clearTimeout(timer); readyReject(new Error('Media session closed.'));
    socket?.close(); peer?.close();
    tracks.forEach(track => track.stop());
    if (video?.srcObject) { video.srcObject = null; }
    if (audio) { audio.pause(); audio.srcObject = null; audio.muted = true; }
    onAudioAvailable(false); onVideoLive(false);
    onState('off');
  };
  const fail = message => { if (!closed) { onError(message); close(); } };
  const send = message => { if (!closed && socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); };
  onState('connecting');
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/signal?token=${encodeURIComponent(token)}`);
  timer = setTimeout(() => fail('Media connection timed out. Try again when robot media is available.'), 12000);
  socket.onerror = () => fail('Camera signaling connection failed.');
  socket.onclose = () => { if (!closed) fail('Camera connection closed.'); };
  let messageChain = Promise.resolve();
  const receive = async message => {
    if (closed) return;
    if (message.type === 'welcome') {
      send({ type: 'setPeerStatus', roles: ['listener'], meta: { name: 'desktop-control' } });
      send({ type: 'list' });
    } else if (message.type === 'list') {
      const matches = (message.producers || []).filter(p => p.meta?.name === 'reachymini');
      if (matches.length !== 1) { fail(matches.length ? 'Multiple Reachy cameras found; camera connection was not started.' : 'Reachy camera producer is unavailable.'); return; }
      send({ type: 'startSession', peerId: matches[0].id });
    } else if (message.type === 'sessionStarted') {
      sessionId = message.sessionId;
      peer = new RTCPeerConnection();
      peer.ondatachannel = event => event.channel.close();
      peer.onicecandidate = event => { if (event.candidate) send({ type: 'peer', sessionId, ice: event.candidate.toJSON() }); };
      peer.ontrack = event => {
        if (closed) { event.track.stop(); return; }
        tracks.push(event.track);
        if (event.track.kind === 'audio') {
          if (audio) audio.srcObject = new MediaStream([event.track]);
          if (enableAudio) onAudioAvailable(true); return;
        }
        if (event.track.kind !== 'video' || !video) return;
        // Keep video audio-free even when the remote stream contains both kinds.
        video.srcObject = new MediaStream([event.track]); video.muted = true;
        video.play().then(() => { if (!closed) onVideoLive(true); }).catch(() => fail('Camera playback could not start.'));
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') { clearTimeout(timer); onState('live'); readyResolve(); }
        if (['failed', 'disconnected'].includes(peer.connectionState)) fail('Media stream disconnected.');
      };
    } else if (message.type === 'peer' && message.sessionId === sessionId && peer) {
      if (message.sdp) {
        if (message.sdp.type !== 'offer') throw new Error('Unexpected camera session description.');
        await peer.setRemoteDescription(message.sdp);
        if (closed) return;
        audioSender = null;
        peer.getTransceivers().forEach(t => {
          const kind = t.receiver?.track?.kind;
          t.direction = kind === 'audio' && enableAudio ? 'sendrecv' : 'recvonly';
          if (kind === 'audio' && enableAudio) audioSender = t.sender;
        });
        for (const candidate of ice.splice(0)) await peer.addIceCandidate(candidate);
        const answer = await peer.createAnswer(); await peer.setLocalDescription(answer);
        send({ type: 'peer', sessionId, sdp: { type: peer.localDescription.type, sdp: peer.localDescription.sdp } });
      }
      if (message.ice) { if (peer.remoteDescription) await peer.addIceCandidate(message.ice); else ice.push(message.ice); }
    } else if (message.type === 'endSession') fail('Camera session ended.');
    else if (message.type === 'error') fail(message.details || message.error || 'Camera signaling failed.');
  };
  socket.onmessage = event => { messageChain = messageChain.then(() => receive(JSON.parse(event.data))).catch(e => fail(e.message || 'Camera negotiation failed.')); };
  return { close, ready, async setMicrophoneTrack(track) {
    await ready;
    if (closed) throw new Error('Media session is closed.');
    if (!audioSender) { if (track) throw new Error('Robot did not offer bidirectional audio.'); return; }
    await audioSender.replaceTrack(track);
  } };
}

export function startCamera(options) { return startReachyMedia(options).close; }
