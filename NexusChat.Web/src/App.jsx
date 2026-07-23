import React, { useState, useEffect } from 'react';
import { NavRail } from './components/NavRail';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { NewChatModal } from './components/NewChatModal';
import { GroupCreateModal } from './components/GroupCreateModal';
import { UserProfileModal } from './components/UserProfileModal';
import { GroupDetailsModal } from './components/GroupDetailsModal';
import { WebRTCCallModal } from './components/WebRTCCallModal';
import { initSignalR, sendCallOffer, acceptCall, rejectCall, endCall, getHubConnection, joinUserGroup } from './services/signalr';
import { createDirectChat, logoutUser } from './services/api';
import { Lock, MessageSquarePlus, ShieldCheck, Video, Mic, Sparkles } from 'lucide-react';
import './index.css';
import './App.css';

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem('nexus_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('nexus_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('nexus_theme') || 'dark');
  const [activeNavTab, setActiveNavTab] = useState('chats');
  const [activeChat, setActiveChat] = useState(null);
  const [connection, setConnection] = useState(null);

  // Modals state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [inspectUser, setInspectUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [callData, setCallData] = useState(null);
  const [signalingMessage, setSignalingMessage] = useState(null);

  // Sync theme attribute on document root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // Initialize SignalR real-time websocket when token & user exist
  useEffect(() => {
    if (token && currentUser) {
      const conn = initSignalR(token, currentUser.id, {
        onNewMessage: (msg) => console.log('[SignalR ReceiveMessage]', msg),
        onChatUpdated: (chatId, msg) => console.log('[SignalR ChatUpdated]', chatId, msg),
        onTyping: (chatId, username) => console.log('[SignalR Typing]', username),
        onPresenceChange: (userId, isOnline) => {
          console.log('[SignalR Presence]', userId, isOnline);
          setActiveChat((prevActiveChat) => {
            if (prevActiveChat && prevActiveChat.type === 0) {
              const updatedMembers = (prevActiveChat.members || []).map((m) => {
                if (m.id?.toString().toLowerCase() === userId?.toString().toLowerCase()) {
                  return { ...m, isOnline };
                }
                return m;
              });
              return { ...prevActiveChat, members: updatedMembers };
            }
            return prevActiveChat;
          });
        },
        onSignalingMessage: (senderId, messageType, payload) => {
          setSignalingMessage({ senderId, messageType, payload, timestamp: Date.now() });
        },
        onIncomingCall: (targetUserId, callerId, callerName, isVideo) => {
          const myId = currentUser?.id?.toString().toLowerCase();
          if (targetUserId && myId && targetUserId.toString().toLowerCase() === myId) {
            setCallData({
              targetUserId,
              callerId,
              callerName,
              isVideo,
              isIncoming: true,
              status: 'ringing'
            });
            setIsCallActive(true);
          }
        },
        onCallAccepted: (callerId, receiverId) => {
          const myId = currentUser?.id?.toString().toLowerCase();
          if (myId && (myId === callerId?.toString().toLowerCase() || myId === receiverId?.toString().toLowerCase())) {
            setCallData((prev) => (prev ? { ...prev, status: 'connected', isIncoming: false } : prev));
          }
        },
        onCallRejected: (callerId, receiverId) => {
          const myId = currentUser?.id?.toString().toLowerCase();
          if (myId && (myId === callerId?.toString().toLowerCase() || myId === receiverId?.toString().toLowerCase())) {
            setIsCallActive(false);
            setCallData(null);
          }
        },
        onCallEnded: (targetUserId, senderId) => {
          const myId = currentUser?.id?.toString().toLowerCase();
          if (myId && (myId === targetUserId?.toString().toLowerCase() || myId === senderId?.toString().toLowerCase())) {
            setIsCallActive(false);
            setCallData(null);
          }
        }
      });
      setConnection(conn);
      joinUserGroup(currentUser.id);
    }
  }, [token, currentUser]);

  const handleAuthSuccess = (newToken, user) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('nexus_token', newToken);
    localStorage.setItem('nexus_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await logoutUser(currentUser.id, token);
      } catch (err) {
        console.warn('[Logout API Error]', err);
      }
    }

    const conn = getHubConnection();
    if (conn) {
      conn.stop().catch(() => {});
    }
    setToken(null);
    setCurrentUser(null);
    setConnection(null);
    setActiveChat(null);
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const chat = await createDirectChat(currentUser.id, targetUser.id, token);
      chat.name = targetUser.fullName || targetUser.username;
      chat.members = [currentUser, targetUser];
      setActiveChat(chat);
      setIsNewChatOpen(false);
    } catch (err) {
      console.error('Failed to start chat with user:', err);
    }
  };

  const handleStartCall = (data) => {
    const { targetUserId, targetName, isVideo } = data;
    setSignalingMessage(null);
    sendCallOffer(targetUserId, currentUser.id, currentUser.fullName || currentUser.username, isVideo);
    setCallData({
      targetUserId,
      targetName,
      isVideo,
      isIncoming: false,
      status: 'calling'
    });
    setIsCallActive(true);
  };

  const handleAcceptIncomingCall = () => {
    if (callData?.callerId) {
      acceptCall(callData.callerId, currentUser.id);
      setCallData((prev) => ({ ...prev, status: 'connected', isIncoming: false }));
    }
  };

  const handleRejectIncomingCall = () => {
    if (callData?.callerId) {
      rejectCall(callData.callerId, currentUser.id);
    }
    setIsCallActive(false);
    setCallData(null);
    setSignalingMessage(null);
  };

  const handleEndActiveCall = () => {
    const otherUserId = callData?.targetUserId || callData?.callerId;
    if (otherUserId) {
      endCall(otherUserId, currentUser.id);
    }
    setIsCallActive(false);
    setCallData(null);
    setSignalingMessage(null);
  };

  const handleOpenUserProfile = (user) => {
    setInspectUser(user);
    setIsProfileOpen(true);
  };

  if (!token || !currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="web-desktop-layout">
      {/* 1. Far Left Primary Navigation Rail */}
      <NavRail
        currentUser={currentUser}
        activeNavTab={activeNavTab}
        setActiveNavTab={setActiveNavTab}
        onOpenMyProfile={() => handleOpenUserProfile(currentUser)}
        onOpenNewChat={() => setIsNewChatOpen(true)}
        onOpenNewGroup={() => setIsNewGroupOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* 2. Secondary Conversations Sidebar Column */}
      <div className={`sidebar-column ${activeChat ? 'mobile-hide' : ''}`}>
        <Sidebar
          currentUser={currentUser}
          connection={connection}
          activeChat={activeChat}
          onSelectChat={handleSelectChat}
          onOpenNewChat={(targetUser) => {
            if (targetUser && targetUser.id) {
              handleStartChatWithUser(targetUser);
            } else {
              setIsNewChatOpen(true);
            }
          }}
          onOpenNewGroup={() => setIsNewGroupOpen(true)}
        />
      </div>

      {/* 3. Main Stage Chat Window Pane */}
      <div className={`chat-main-stage ${!activeChat ? 'mobile-hide' : ''}`}>
        {activeChat ? (
          <ChatWindow
            activeChat={activeChat}
            currentUser={currentUser}
            token={token}
            connection={connection}
            onBack={() => setActiveChat(null)}
            onStartCall={handleStartCall}
            onOpenUserProfile={handleOpenUserProfile}
            onOpenGroupDetails={() => setIsGroupDetailsOpen(true)}
            onChatUpdated={(updatedChat) => setActiveChat(updatedChat)}
          />
        ) : (
          <div className="cyber-home-canvas">
            <div className="cyber-hero-card">
              <div className="cyber-hero-img-box">
                <img src="/nexus_hero_theme.jpg" alt="NexusChat Workspace" className="cyber-hero-img" />
              </div>

              <h1 className="cyber-hero-title">NexusChat Desktop Workspace</h1>

              <p className="cyber-hero-subtitle">
                High-performance real-time messaging, WebRTC video calling, and media sharing workspace.<br />
                Select an active conversation or start a new direct chat.
              </p>

              <button
                type="button"
                className="btn-start-convo"
                onClick={() => setIsNewChatOpen(true)}
              >
                <MessageSquarePlus size={18} /> Start New Conversation
              </button>

              <div className="cyber-encryption-footer">
                <Lock size={14} className="text-cyan-400" />
                <span>End-to-end encrypted WebSocket messaging & peer-to-peer WebRTC</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onStartChat={handleStartChatWithUser}
        token={token}
      />

      <GroupCreateModal
        isOpen={isNewGroupOpen}
        onClose={() => setIsNewGroupOpen(false)}
        currentUser={currentUser}
        token={token}
        onGroupCreated={(groupChat) => {
          setActiveChat(groupChat);
          setIsNewGroupOpen(false);
        }}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={inspectUser || currentUser}
        isMe={!inspectUser || inspectUser.id?.toString().toLowerCase() === currentUser.id?.toString().toLowerCase()}
        token={token}
        onProfileUpdated={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
        }}
        onLogout={handleLogout}
      />

      <GroupDetailsModal
        isOpen={isGroupDetailsOpen}
        onClose={() => setIsGroupDetailsOpen(false)}
        activeChat={activeChat}
        currentUser={currentUser}
        token={token}
        onChatUpdated={(updatedChat) => setActiveChat(updatedChat)}
        onDeleteGroup={() => {
          setIsGroupDetailsOpen(false);
          setActiveChat(null);
        }}
      />

      <WebRTCCallModal
        isOpen={isCallActive}
        onClose={handleEndActiveCall}
        callData={callData}
        currentUser={currentUser}
        onAcceptCall={handleAcceptIncomingCall}
        onRejectCall={handleRejectIncomingCall}
        onEndCall={handleEndActiveCall}
        incomingSignalingMessage={signalingMessage}
        token={token}
      />
    </div>
  );
}

export default App;
