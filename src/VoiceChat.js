import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SIGNALING_SERVER_URL = 'http://66.42.60.90:3001';
const ROOM_ID = 'test-room';

function VoiceChat() {
  const [userId] = useState(() => Math.floor(Math.random() * 1000000).toString());
  const [peers, setPeers] = useState({});
  const socketRef = useRef();
  const localStreamRef = useRef();
  const peersRef = useRef({});
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        localStreamRef.current = stream;

        // Nếu đang mute thì tắt track luôn
        if (muted) {
          stream.getAudioTracks().forEach(track => (track.enabled = false));
        }

        socketRef.current = io(SIGNALING_SERVER_URL);

        socketRef.current.emit('join-room', ROOM_ID, userId);

        socketRef.current.on('all-users', users => {
          users.forEach(otherUserId => {
            const peerConnection = createPeerConnection(otherUserId, socketRef.current, userId, localStreamRef.current);
            peersRef.current[otherUserId] = peerConnection;
            setPeers(prev => ({ ...prev, [otherUserId]: peerConnection }));
          });
        });

        socketRef.current.on('user-joined', otherUserId => {
          const peerConnection = createPeerConnection(otherUserId, socketRef.current, userId, localStreamRef.current);
          peersRef.current[otherUserId] = peerConnection;
          setPeers(prev => ({ ...prev, [otherUserId]: peerConnection }));
        });

        socketRef.current.on('signal', async (fromUserId, message) => {
          const peerConnection = peersRef.current[fromUserId];
          if (!peerConnection) return;

          if (message.sdp) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
            if (message.sdp.type === 'offer') {
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              socketRef.current.emit('signal', fromUserId, { sdp: peerConnection.localDescription });
            }
          } else if (message.candidate) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            } catch (e) {
              console.error('Error adding ICE candidate', e);
            }
          }
        });

        socketRef.current.on('user-left', leftUserId => {
          if (peersRef.current[leftUserId]) {
            peersRef.current[leftUserId].close();
            delete peersRef.current[leftUserId];
            setPeers(prev => {
              const newPeers = { ...prev };
              delete newPeers[leftUserId];
              return newPeers;
            });
          }
        });
      })
      .catch(err => {
        console.error('Could not get user media', err);
      });

    return () => {
      Object.values(peersRef.current).forEach(pc => pc.close());
      socketRef.current?.disconnect();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [userId]);

  // Bật/tắt mic
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = muted; // nếu hiện đang muted=true thì bật lại mic (enabled = true)
    });
    setMuted(!muted);
  };

  function createPeerConnection(otherUserId, socket, userId, localStream) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('signal', otherUserId, { candidate: event.candidate });
      }
    };

    peerConnection.ontrack = event => {
      const remoteAudio = document.getElementById(`audio-${otherUserId}`);
      if (remoteAudio) {
        remoteAudio.srcObject = event.streams[0];
      }
    };

    if (userId > otherUserId) {
      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
          socket.emit('signal', otherUserId, { sdp: peerConnection.localDescription });
        });
    }

    return peerConnection;
  }

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-6 space-y-6">
      <div className="w-full max-w-4xl space-y-4">
        <h1 className="text-3xl font-bold text-center">Voice Chat</h1>

        <div className="bg-white rounded p-4 shadow space-y-2">
          <p><strong>Phòng:</strong> {ROOM_ID}</p>
          <p><strong>ID của bạn:</strong> {userId}</p>

          <button
            className={`px-4 py-2 rounded ${muted ? 'bg-red-500' : 'bg-green-500'} text-white hover:opacity-90`}
            onClick={toggleMute}
          >
            {muted ? 'Unmute Mic' : 'Mute Mic'}
          </button>

          {/* Phát audio local (muted tránh dội tiếng) */}
          <audio autoPlay muted />
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h2 className="text-xl font-semibold mb-2">Người tham gia khác:</h2>

          {Object.keys(peers).length === 0 ? (
            <p className="text-gray-500">Chưa có ai trong phòng</p>
          ) : (
            Object.keys(peers).map(peerId => (
              <div key={peerId} className="mb-3 border-b pb-2">
                <p><strong>Peer ID:</strong> {peerId}</p>
                <audio id={`audio-${peerId}`} autoPlay controls className="mt-1" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default VoiceChat;
