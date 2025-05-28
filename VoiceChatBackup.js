import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SIGNALING_SERVER_URL = 'wss://hieulaptop.duckdns.org:3001';
const ROOM_ID = 'test-room';

function VoiceChat() {
  const [userId] = useState(() => Math.floor(Math.random() * 1000000).toString());

  const [username, setUsername] = useState(() => {
    const stored = localStorage.getItem('username');
    if (stored) return stored;

    const tg = window.Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    return tgUser?.username || tgUser?.first_name || 'Unknown_' + userId.toString();
  });

  const [usernames, setUsernames] = useState({});
  const [peers, setPeers] = useState({});
  const socketRef = useRef();
  const localStreamRef = useRef();
  const peersRef = useRef({});
  const allUsersRef = useRef([]);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        localStreamRef.current = stream;

        if (muted) {
          stream.getAudioTracks().forEach(track => (track.enabled = false));
        }

        socketRef.current = io(SIGNALING_SERVER_URL);
        socketRef.current.emit('join-room', ROOM_ID, userId, username);

        socketRef.current.on('all-users', users => {
          allUsersRef.current = users;
          createMissingConnections(users);
        });

        socketRef.current.on('usernames-update', nameMap => {
          setUsernames(nameMap);
        });

        socketRef.current.on('username-updated', (id, newName) => {
          setUsernames(prev => ({ ...prev, [id]: newName }));
        });

        socketRef.current.on('user-joined', otherUserId => {
          if (!allUsersRef.current.includes(otherUserId)) {
            allUsersRef.current.push(otherUserId);
          }
          createMissingConnections(allUsersRef.current);
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
          allUsersRef.current = allUsersRef.current.filter(id => id !== leftUserId);
        });

        socketRef.current.on('signal', async (fromUserId, message) => {
          let peerConnection = peersRef.current[fromUserId];
          if (!peerConnection) {
            peerConnection = createPeerConnection(fromUserId);
            peersRef.current[fromUserId] = peerConnection;
            setPeers(prev => ({ ...prev, [fromUserId]: peerConnection }));
          }

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

        const interval = setInterval(() => {
          createMissingConnections(allUsersRef.current);
        }, 10000);

        return () => {
          clearInterval(interval);
          Object.values(peersRef.current).forEach(pc => pc.close());
          socketRef.current?.disconnect();
          localStreamRef.current?.getTracks().forEach(t => t.stop());
        };
      })
      .catch(err => {
        console.error('Could not get user media', err);
      });
  }, [userId]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = muted;
    });
    setMuted(!muted);
  };

  const handleUsernameChange = () => {
    localStorage.setItem('username', username);
    socketRef.current?.emit('update-username', userId, username);
  };

  function createPeerConnection(otherUserId) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    localStreamRef.current.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socketRef.current.emit('signal', otherUserId, { candidate: event.candidate });
      }
    };

    peerConnection.ontrack = event => {
      const remoteAudio = document.getElementById(`audio-${otherUserId}`);
      if (remoteAudio) {
        remoteAudio.srcObject = event.streams[0];
      }
    };

    if (userId < otherUserId) {
      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit('signal', otherUserId, { sdp: peerConnection.localDescription });
        });
    }

    return peerConnection;
  }

  function createMissingConnections(userList) {
    userList.forEach(otherUserId => {
      if (otherUserId === userId) return;
      if (!peersRef.current[otherUserId]) {
        const peerConnection = createPeerConnection(otherUserId);
        peersRef.current[otherUserId] = peerConnection;
        setPeers(prev => ({ ...prev, [otherUserId]: peerConnection }));
      }
    });
  }

return (
  <div className="min-h-screen bg-pink-50 flex flex-col items-center p-6 space-y-6">
    <div className="w-full max-w-4xl space-y-4">
      <h1 className="text-3xl font-bold text-center">Voice Chat</h1>

      <div className="bg-white rounded p-4 shadow space-y-4">
        <p><strong>Phòng:</strong> VIP</p>
        <p><strong>ID của bạn:</strong> {userId}</p>

        <div className="flex items-center space-x-2">
          <input
            className="border rounded p-2 flex-grow"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleUsernameChange}
          >
            Lưu tên
          </button>
        </div>

        <button
          className={`px-4 py-2 rounded ${muted ? 'bg-red-500' : 'bg-green-500'} text-white hover:opacity-90`}
          onClick={toggleMute}
        >
          {muted ? 'Unmute Mic' : 'Mute Mic'}
        </button>

        <audio autoPlay muted />
      </div>

      <div className="bg-white rounded p-4 shadow">
        <h2 className="text-xl font-semibold mb-2">Người tham gia khác:</h2>

        {/* Người dùng hiện tại */}
        <div className="mb-3 border-b pb-2">
          <div className="relative bg-gray-200 rounded-full h-10 flex items-center px-4 w-[360px]">
            <span className="text-sm font-semibold text-gray-700">
              {username} (you)
            </span>
          </div>
        </div>

        {/* Các peer khác */}
        {Object.keys(peers).length === 0 ? (
          <p className="text-gray-500">Chưa có ai trong phòng</p>
        ) : (
          Object.keys(peers).map(peerId => (
            <div key={peerId} className="mb-3 border-b pb-2">
              <div className="relative bg-gray-200 rounded-full h-10 flex items-center px-4 w-[360px]">
                <span className="text-sm font-semibold text-gray-700">
                  {usernames[peerId] || `Unknown_${peerId}`}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  defaultValue="1"
                  className="ml-auto w-40 h-1 accent-pink-500"
                  onChange={(e) => {
                    const audio = document.getElementById(`audio-${peerId}`);
                    if (audio) audio.volume = parseFloat(e.target.value);
                  }}
                />
              </div>
              <audio id={`audio-${peerId}`} autoPlay hidden />
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);


}

export default VoiceChat;
