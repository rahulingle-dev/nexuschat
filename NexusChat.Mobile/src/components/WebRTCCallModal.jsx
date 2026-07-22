import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendSignalingMessage } from '../services/signalr';

export const WebRTCCallModal = ({
  isOpen,
  onClose,
  callData,
  currentUser,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  incomingSignalingMessage
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callData?.isVideo || false);
  const [callDuration, setCallDuration] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing WebRTC...');

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const candidateQueueRef = useRef([]);

  const isIncoming = callData?.isIncoming;
  const isConnected = callData?.status === 'connected';
  const isConnecting = callData?.status === 'calling' || callData?.status === 'ringing';
  const peerId = isIncoming ? callData?.callerId : callData?.targetUserId;

  // 1. Reset states when call opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsMuted(false);
      setIsVideoOn(callData?.isVideo || false);
      setCallDuration(0);
      setLocalStream(null);
      setRemoteStream(null);
      candidateQueueRef.current = [];
      setStatusMessage(isIncoming ? 'Incoming Call...' : 'Calling...');
    } else {
      cleanupCall();
    }
  }, [isOpen]);

  // 2. Call Duration Timer
  useEffect(() => {
    let timer;
    if (isOpen && isConnected) {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isOpen, isConnected]);

  // 3. Sync local media mute states
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOn;
      });
    }
  }, [isVideoOn, localStream]);

  // 4. Load local media stream & establish WebRTC once connected
  useEffect(() => {
    if (isOpen && isConnected) {
      startWebRTCPeerConnection();
    }
  }, [isOpen, isConnected]);

  // 5. Watch for incoming Signaling Messages
  useEffect(() => {
    if (isOpen && incomingSignalingMessage && peerConnectionRef.current) {
      const { senderId, messageType, payload } = incomingSignalingMessage;
      
      // Make sure we only process messages from our active peer
      if (senderId?.toLowerCase() === peerId?.toLowerCase()) {
        handleIncomingSignaling(messageType, payload);
      }
    }
  }, [incomingSignalingMessage]);

  // 6. Bind local video stream to element once rendered
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOn, isConnected]);

  // 7. Bind remote video stream to element once rendered
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isConnected]);

  // Fetch free TURN servers dynamically from OpenRelay
  const getIceServers = async () => {
    try {
      const response = await fetch('https://nexuschat.metered.live/api/v1/turn/credentials?apiKey=d610817c1bf1941d9c1eb5e9');
      if (response.ok) {
        const iceServers = await response.json();
        if (Array.isArray(iceServers) && iceServers.length > 0) {
          console.log('[WebRTC] OpenRelay TURN servers loaded.');
          return iceServers;
        }
      }
    } catch (e) {
      console.warn('[WebRTC] TURN fetch failed, fallback to Google STUN:', e);
    }
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ];
  };

  const startWebRTCPeerConnection = async () => {
    setStatusMessage('Configuring secure media link...');
    try {
      // 1. Get user media (microphone + camera if video is on)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callData?.isVideo ? { facingMode: 'user', width: 640, height: 480 } : false
      });
      setLocalStream(stream);

      // 2. Fetch ICE Servers
      const iceServers = await getIceServers();

      // 3. Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      peerConnectionRef.current = pc;

      // Add local stream tracks to Peer Connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 4. Bind ICE candidate events
      pc.onicecandidate = (event) => {
        if (event.candidate && peerId) {
          sendSignalingMessage(peerId, currentUser.id, 'ice-candidate', JSON.stringify(event.candidate));
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC State Change]', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          setStatusMessage('Connected Secured');
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setStatusMessage('Link dropped. Reconnecting...');
        }
      };

      // 5. Receive remote stream tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote video/audio track.');
        if (event.streams && event.streams[0]) {
          const remoteStr = event.streams[0];
          setRemoteStream(remoteStr);
        }
      };

      // 6. Negotiate connection (Caller sends offer)
      if (!isIncoming) {
        setStatusMessage('Connecting...');
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        sendSignalingMessage(peerId, currentUser.id, 'sdp-offer', JSON.stringify(offer));
      } else {
        setStatusMessage('Answering...');
      }
    } catch (err) {
      console.error('[WebRTC PC Init Error]', err);
      setStatusMessage(`Media Error: ${err.message || err.name}`);
    }
  };

  const handleIncomingSignaling = async (messageType, payload) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (messageType === 'sdp-offer') {
        console.log('[WebRTC] SDP Offer received.');
        const offerDesc = new RTCSessionDescription(JSON.parse(payload));
        await pc.setRemoteDescription(offerDesc);

        // Process queued candidates
        while (candidateQueueRef.current.length > 0) {
          const cand = candidateQueueRef.current.shift();
          await pc.addIceCandidate(cand);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage(peerId, currentUser.id, 'sdp-answer', JSON.stringify(answer));
        setStatusMessage('Connecting...');
      } 
      else if (messageType === 'sdp-answer') {
        console.log('[WebRTC] SDP Answer received.');
        const answerDesc = new RTCSessionDescription(JSON.parse(payload));
        await pc.setRemoteDescription(answerDesc);

        // Process queued candidates
        while (candidateQueueRef.current.length > 0) {
          const cand = candidateQueueRef.current.shift();
          await pc.addIceCandidate(cand);
        }
      } 
      else if (messageType === 'ice-candidate') {
        const candidate = new RTCIceCandidate(JSON.parse(payload));
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          candidateQueueRef.current.push(candidate);
        }
      }
    } catch (e) {
      console.error('[WebRTC Signaling Handle Error]', e);
    }
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    candidateQueueRef.current = [];
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={isOpen} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Banner (Caller/Target details) */}
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={14} color="#00a884" style={{ marginRight: 6 }} />
          <Text style={styles.secureText}>End-to-End Encrypted</Text>
        </View>

        {isConnected ? (
          /* Active Call Layout (WhatsApp Style) */
          <View style={styles.callContent}>
            {/* Fullscreen Remote Video Feed */}
            {callData?.isVideo ? (
              <View style={styles.remoteVideoContainer}>
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={styles.remoteVideo}
                  />
                ) : (
                  <View style={styles.videoPlaceholderBox}>
                    <ActivityIndicator size="large" color="#00a884" />
                    <Text style={styles.placeholderTxt}>Waiting for peer video stream...</Text>
                  </View>
                )}

                {/* Local Video Overlay (Picture-in-Picture) */}
                {isVideoOn && localStream && (
                  <View style={styles.pipContainer}>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={styles.pipVideo}
                    />
                  </View>
                )}
              </View>
            ) : (
              /* Audio-Only Call Avatar Screen */
              <View style={styles.audioCallContainer}>
                <View style={styles.pulseRing}>
                  <View style={styles.voiceAvatar}>
                    <Text style={styles.avatarTxt}>
                      {(callData?.callerName || callData?.targetName || 'C').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.targetName}>
                  {callData?.callerName || callData?.targetName || 'Nexus Contact'}
                </Text>
                <Text style={styles.callDurationTxt}>
                  {formatTimer(callDuration)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* Ringing / Dialing Call Screen */
          <View style={styles.ringingBox}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTxtLarge}>
                {(callData?.callerName || callData?.targetName || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text style={styles.targetNameLarge}>
              {callData?.callerName || callData?.targetName || 'Nexus Contact'}
            </Text>

            <View style={styles.statusRow}>
              {isConnecting && <ActivityIndicator color="#00a884" style={{ marginRight: 8 }} />}
              <Text style={styles.callStatus}>
                {isIncoming ? 'Incoming Call...' : 'Ringing...'}
              </Text>
            </View>

            <Text style={styles.callTypeLabel}>
              Nexus {callData?.isVideo ? 'HD Video Call' : 'Voice Call'}
            </Text>
          </View>
        )}

        {/* Unified Bottom Controls Bar */}
        <View style={styles.controlsSection}>
          {isIncoming && !isConnected ? (
            /* Incoming call Accept/Decline */
            <View style={styles.incomingControlsBar}>
              <TouchableOpacity onPress={onRejectCall || onClose} style={[styles.roundCallBtn, styles.declineBtn]}>
                <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                <Text style={styles.btnLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onAcceptCall} style={[styles.roundCallBtn, styles.acceptBtn]}>
                <Ionicons name="call" size={26} color="#fff" />
                <Text style={styles.btnLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Connected or Outgoing calling active controllers */
            <View style={styles.activeCallControlsBar}>
              {/* Mic Mute Toggle */}
              <TouchableOpacity
                onPress={() => setIsMuted(!isMuted)}
                style={[styles.smallCtrlBtn, isMuted && styles.ctrlBtnRed]}
              >
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color="#fff" />
              </TouchableOpacity>

              {/* Video Camera Toggle */}
              {callData?.isVideo && (
                <TouchableOpacity
                  onPress={() => setIsVideoOn(!isVideoOn)}
                  style={[styles.smallCtrlBtn, !isVideoOn && styles.ctrlBtnRed]}
                >
                  <Ionicons name={isVideoOn ? 'videocam' : 'videocam-off'} size={22} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Hang Up Button */}
              <TouchableOpacity onPress={onEndCall || onClose} style={[styles.roundCallBtn, styles.declineBtn, { width: 64, height: 64 }]}>
                <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141a',
    justifyContent: 'space-between'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#111b21',
    borderBottomWidth: 1,
    borderBottomColor: '#222d34'
  },
  secureText: {
    color: '#00a884',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  callContent: {
    flex: 1,
    width: '100%'
  },
  remoteVideoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000'
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  pipContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 110,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00a884',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6
  },
  pipVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  videoPlaceholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a'
  },
  placeholderTxt: {
    color: '#8696a0',
    fontSize: 14,
    marginTop: 14
  },
  audioCallContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pulseRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(0, 168, 132, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  voiceAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarTxt: {
    color: '#fff',
    fontSize: 54,
    fontWeight: 'bold'
  },
  targetName: {
    color: '#e9edef',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  callDurationTxt: {
    color: '#00a884',
    fontSize: 15,
    fontWeight: '600'
  },
  ringingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  },
  avatarTxtLarge: {
    color: '#fff',
    fontSize: 54,
    fontWeight: 'bold'
  },
  targetNameLarge: {
    color: '#e9edef',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  callStatus: {
    color: '#00a884',
    fontSize: 15,
    fontWeight: '600'
  },
  callTypeLabel: {
    color: '#8696a0',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 40
  },
  controlsSection: {
    paddingVertical: 36,
    backgroundColor: '#111b21',
    borderTopWidth: 1,
    borderTopColor: '#222d34',
    alignItems: 'center'
  },
  incomingControlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 20
  },
  activeCallControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%'
  },
  roundCallBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6
  },
  declineBtn: {
    backgroundColor: '#ef4444'
  },
  acceptBtn: {
    backgroundColor: '#22c55e'
  },
  btnLabel: {
    position: 'absolute',
    bottom: -22,
    color: '#8696a0',
    fontSize: 11,
    fontWeight: '600',
    width: 60,
    textAlign: 'center'
  },
  smallCtrlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#202c33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a3942'
  },
  ctrlBtnRed: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444'
  }
});
