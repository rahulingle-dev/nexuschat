import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { sendSignalingMessage } from '../services/signalr';

export const WebRTCCallModal = ({
  isOpen,
  onClose,
  callData,
  currentUser,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  incomingSignalingMessage,
  token
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const isVideoCall = callData?.isVideo ?? true;
  const isIncoming = callData?.isIncoming ?? false;
  const callStatus = callData?.status || 'ringing'; // 'ringing' | 'calling' | 'connected'

  // Timer for connected call duration
  useEffect(() => {
    let timer;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // WebRTC PeerConnection Setup
  useEffect(() => {
    if (isOpen && callStatus === 'connected') {
      setupWebRTC();
    } else if (!isOpen) {
      cleanupWebRTC();
    }
  }, [isOpen, callStatus]);

  const setupWebRTC = async () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      pcRef.current = pc;

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && callData) {
          const targetId = callData.targetUserId || callData.callerId;
          sendSignalingMessage(targetId, currentUser.id, 'ice-candidate', event.candidate);
        }
      };

      // Handle Remote Stream Tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Capture Local Media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // If caller, send WebRTC Offer
      if (!isIncoming) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const targetId = callData.targetUserId;
        sendSignalingMessage(targetId, currentUser.id, 'offer', offer);
      }
    } catch (err) {
      console.error('WebRTC setup error:', err);
    }
  };

  // Handle incoming WebRTC Signaling (offer, answer, ice-candidate)
  useEffect(() => {
    if (incomingSignalingMessage && pcRef.current) {
      const { senderId, messageType, payload } = incomingSignalingMessage;
      handleSignalingData(senderId, messageType, payload);
    }
  }, [incomingSignalingMessage]);

  const handleSignalingData = async (senderId, messageType, payload) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (messageType === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage(senderId, currentUser.id, 'answer', answer);
      } else if (messageType === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (messageType === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
      }
    } catch (err) {
      console.error('Error processing WebRTC signaling message:', err);
    }
  };

  const cleanupWebRTC = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      remoteVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      remoteVideoRef.current.srcObject = null;
    }
  };

  const toggleMuteAudio = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const audioTracks = localVideoRef.current.srcObject.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const videoTracks = localVideoRef.current.srcObject.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoDisabled(!isVideoDisabled);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="call-modal-overlay">
      <div className="call-modal-card">
        {/* Call Info Header */}
        <div className="call-header">
          <h2 className="call-target-name font-bold text-lg text-white">
            {callData?.callerName || callData?.targetName || 'Nexus Contact'}
          </h2>
          <p className="call-status-subtitle text-emerald-400 text-sm font-medium">
            {callStatus === 'connected'
              ? formatDuration(callDuration)
              : isIncoming
              ? 'Incoming Video/Voice Call...'
              : 'Calling...'}
          </p>
        </div>

        {/* Video Viewport Area */}
        <div className="call-viewport">
          <video ref={remoteVideoRef} autoPlay playsInline className="remote-video-stream" />
          {isVideoCall && (
            <video ref={localVideoRef} autoPlay playsInline muted className="local-video-stream" />
          )}

          {callStatus !== 'connected' && (
            <div className="call-placeholder-overlay">
              <div className="calling-avatar-pulse">
                <span className="text-3xl font-bold text-white">
                  {(callData?.callerName || callData?.targetName || 'N').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls Toolbar */}
        <div className="call-controls-bar">
          {isIncoming && callStatus === 'ringing' ? (
            <div className="incoming-call-btns">
              <button
                type="button"
                className="call-control-btn btn-accept-call"
                onClick={onAcceptCall}
                title="Accept Call"
              >
                <Phone size={24} />
              </button>
              <button
                type="button"
                className="call-control-btn btn-decline-call"
                onClick={onRejectCall}
                title="Reject Call"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          ) : (
            <div className="active-call-btns">
              <button
                type="button"
                className={`call-control-btn ${isAudioMuted ? 'active-red' : ''}`}
                onClick={toggleMuteAudio}
                title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {isVideoCall && (
                <button
                  type="button"
                  className={`call-control-btn ${isVideoDisabled ? 'active-red' : ''}`}
                  onClick={toggleVideo}
                  title={isVideoDisabled ? 'Turn On Camera' : 'Turn Off Camera'}
                >
                  {isVideoDisabled ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}

              <button
                type="button"
                className="call-control-btn btn-end-call"
                onClick={onEndCall}
                title="End Call"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
