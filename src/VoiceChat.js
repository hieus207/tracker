import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrophone, faMicrophoneSlash, faFloppyDisk, faRightToBracket, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

const SIGNALING_SERVER_URL = 'wss://hieulaptop.duckdns.org:3001';
const ROOM_ID = 'test-room';

function VoiceChat() {
  const [userId] = useState(() => {
    let savedId = localStorage.getItem('userId');
    if (!savedId) {
      savedId = Math.floor(Math.random() * 1000000).toString();
      localStorage.setItem('userId', savedId);
    }
    return savedId;
  });

  const [username, setUsername] = useState(() => {
    const stored = localStorage.getItem('username');
    if (stored) return stored;
    const tg = window.Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    return tgUser?.username || tgUser?.first_name || 'Unknown_' + userId.toString();
  });

  const [usernames, setUsernames] = useState({});
  const [peers, setPeers] = useState({});
  const [speakingPeers, setSpeakingPeers] = useState({});
  const [isSpeakingSelf, setIsSpeakingSelf] = useState(false);
  const [muted, setMuted] = useState(false);
  const [joined, setJoined] = useState(false);

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const allUsersRef = useRef([]);

  const joinRoom = () => {
    if (joined) return;
    socketRef.current = io(SIGNALING_SERVER_URL);

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        localStreamRef.current = stream;

        if (muted) {
          stream.getAudioTracks().forEach(track => (track.enabled = false));
        }

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const micSource = audioCtx.createMediaStreamSource(stream);
        micSource.connect(analyser);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkSpeaking = () => {
          analyser.getByteFrequencyData(dataArray);
          const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setIsSpeakingSelf(volume > 10);
          requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();

        socketRef.current.emit('join-room', ROOM_ID, userId, username);
        setJoined(true);

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

            if (
              message.sdp.type === 'offer' &&
              peerConnection.signalingState === 'have-remote-offer'
            ) {
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
      })
      .catch(err => {
        console.error('Could not get user media', err);
      });
  };

  const leaveRoom = () => {
    socketRef.current?.emit('leave-room', ROOM_ID, userId);
    Object.values(peersRef.current).forEach(pc => pc.close());
    peersRef.current = {};
    setPeers({});
    setSpeakingPeers({});
    allUsersRef.current = [];

    socketRef.current?.disconnect();
    socketRef.current = null;

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;

    setJoined(false);
  };

  useEffect(() => {
    if (userId && !joined) {
      joinRoom();
    }
    return () => {
      leaveRoom();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!joined) return;

    const interval = setInterval(() => {
      createMissingConnections(allUsersRef.current);
    }, 10000); // mỗi 10 giây

    return () => clearInterval(interval);
  }, [joined]);

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
        monitorSpeaking(otherUserId, remoteAudio);
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

  function monitorSpeaking(peerId, audioElement) {
    const checkStream = () => {
      if (audioElement.srcObject) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(audioElement.srcObject);
        source.connect(analyser);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkSpeaking = () => {
          analyser.getByteFrequencyData(dataArray);
          const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const isSpeaking = volume > 10;
          setSpeakingPeers(prev => ({ ...prev, [peerId]: isSpeaking }));
          requestAnimationFrame(checkSpeaking);
        };
        checkSpeaking();
      } else {
        setTimeout(checkStream, 200);
      }
    };
    checkStream();
  }

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-6 space-y-6">
      <div className="w-full max-w-4xl space-y-4">
        <h1 className="text-3xl font-bold text-center">Voice Chat</h1>

        <div className="bg-white rounded p-4 shadow space-y-4">
          <p><strong>Phòng: VIP</strong></p>

          <div className="flex items-center space-x-2">
            <label className="mr-2 whitespace-nowrap">Tên</label>
            <input
              className="border rounded p-2 flex-grow"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleUsernameChange}
            >
              <FontAwesomeIcon icon={faFloppyDisk} className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-between">
            <button
              className={`px-4 py-2 rounded ${muted ? 'bg-red-500' : 'bg-green-500'} text-white hover:opacity-90`}
              onClick={toggleMute}
            >
              <FontAwesomeIcon icon={muted ? faMicrophoneSlash : faMicrophone} className="w-5 h-5" />
            </button>

            {joined ? (
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={leaveRoom}
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="w-5 h-5" /> Exit
              </button>
            ) : (
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={joinRoom}
              >
                <FontAwesomeIcon icon={faRightToBracket} className="w-5 h-5" /> Join
              </button>
            )}
          </div>

          <audio autoPlay muted />
        </div>

        <div className="bg-white rounded p-4 shadow w-full">
          <h2 className="text-xl font-semibold mb-2">Người tham gia khác:</h2>

          <div className="mb-3 pb-2">
            <div className="w-full max-w-[420px]">
              <div className={`relative rounded-full h-12 flex items-center px-4 transition-colors duration-300 ${isSpeakingSelf ? 'bg-green-400' : 'bg-gray-200'} w-full`}>
                <span className="text-sm pl-2 text-black-1000">
                  <strong>{usernames[userId]} (you)</strong>
                </span>
              </div>
            </div>
          </div>

          {Object.keys(peers).length === 0 ? (
            <p className="text-gray-500">{joined?"Chưa có ai trong phòng":"Bạn chưa vào phòng (vào để xem có ai trong phòng)"}</p>
          ) : (
            Object.keys(peers).map(peerId => (
              <div key={peerId} className="mb-3 pb-2">
                <div className="w-full max-w-[420px]">
                  <div className={`relative rounded-full h-12 flex items-center px-4 transition-colors duration-300 ${speakingPeers[peerId] ? 'bg-green-400' : 'bg-gray-200'} w-full`}>
                    <span className="text-sm pl-2 text-black-500">
                      <strong>{usernames[peerId] || `Unknown_${peerId}`}</strong>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      defaultValue="1"
                      className="ml-auto h-1 accent-black-1000 w-[120px]"
                      onChange={(e) => {
                        const audio = document.getElementById(`audio-${peerId}`);
                        if (audio) audio.volume = parseFloat(e.target.value);
                      }}
                    />
                  </div>
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
