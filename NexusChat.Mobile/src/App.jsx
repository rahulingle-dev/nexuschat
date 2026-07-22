import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, StatusBar } from 'react-native';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ActiveChatScreen } from './screens/ActiveChatScreen';
import { NewChatModal } from './components/NewChatModal';
import { GroupCreateModal } from './components/GroupCreateModal';
import { UserProfileModal } from './components/UserProfileModal';
import { WebRTCCallModal } from './components/WebRTCCallModal';
import { PermissionModal } from './components/PermissionModal';
import { GroupDetailsModal } from './components/GroupDetailsModal';
import { initSignalR, sendCallOffer, acceptCall, rejectCall, endCall, getHubConnection, joinUserGroup } from './services/signalr';
import { createDirectChat, logoutUser } from './services/api';
import { getItem, setItem, removeItem } from './utils/storage';

export function App() {
  const [token, setToken] = useState(() => getItem('nexus_token'));
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = getItem('nexus_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentScreen, setCurrentScreen] = useState(currentUser ? 'home' : 'auth');
  const [activeChat, setActiveChat] = useState(null);
  const [connection, setConnection] = useState(null);

  // Modals State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [inspectUser, setInspectUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);

  // Permissions State
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  // Call State
  const [isCallActive, setIsCallActive] = useState(false);
  const [callData, setCallData] = useState(null);
  const [signalingMessage, setSignalingMessage] = useState(null);

  // First time launch permission prompt check
  useEffect(() => {
    if (currentUser) {
      const granted = getItem('nexus_permissions_granted');
      if (granted !== 'true') {
        setIsPermissionModalOpen(true);
      }
    }
  }, [currentUser]);

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
    setItem('nexus_token', newToken);
    setItem('nexus_user', JSON.stringify(user));
    setCurrentScreen('home');

    // Prompt for permission on fresh login
    const granted = getItem('nexus_permissions_granted');
    if (granted !== 'true') {
      setIsPermissionModalOpen(true);
    }
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
    removeItem('nexus_token');
    removeItem('nexus_user');
    setCurrentScreen('auth');
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setCurrentScreen('chat');
  };

  const handleStartChatWithUser = async (targetUser) => {
    try {
      const chat = await createDirectChat(currentUser.id, targetUser.id);
      chat.name = targetUser.fullName || targetUser.username;
      chat.members = [currentUser, targetUser];
      setActiveChat(chat);
      setCurrentScreen('chat');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b141a" />
      <View style={styles.container}>
        {/* Auth View */}
        {currentScreen === 'auth' && (
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        )}

        {/* Home View */}
        {currentScreen === 'home' && currentUser && (
          <HomeScreen
            currentUser={currentUser}
            connection={connection}
            onSelectChat={handleSelectChat}
            onOpenNewChat={(targetUser) => {
              if (targetUser && targetUser.id) {
                handleStartChatWithUser(targetUser);
              } else {
                setIsNewChatOpen(true);
              }
            }}
            onOpenNewGroup={() => setIsNewGroupOpen(true)}
            onLogout={handleLogout}
            onOpenMyProfile={() => handleOpenUserProfile(currentUser)}
            onOpenPermissions={() => setIsPermissionModalOpen(true)}
          />
        )}

        {/* Active Chat View */}
        {currentScreen === 'chat' && activeChat && currentUser && (
          <ActiveChatScreen
            activeChat={activeChat}
            currentUser={currentUser}
            token={token}
            connection={connection}
            onBack={() => {
              setActiveChat(null);
              setCurrentScreen('home');
            }}
            onStartCall={handleStartCall}
            onOpenUserProfile={handleOpenUserProfile}
            onOpenGroupDetails={() => setIsGroupDetailsOpen(true)}
            onChatUpdated={(updatedChat) => {
              setActiveChat(updatedChat);
            }}
          />
        )}

        {/* Modals */}
        <NewChatModal
          isOpen={isNewChatOpen}
          onClose={() => setIsNewChatOpen(false)}
          onStartChat={handleStartChatWithUser}
        />

        <GroupCreateModal
          isOpen={isNewGroupOpen}
          onClose={() => setIsNewGroupOpen(false)}
          currentUser={currentUser}
          availableUsers={[]}
          onGroupCreated={(groupChat) => {
            setActiveChat(groupChat);
            setCurrentScreen('chat');
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
          }}
        />

        <GroupDetailsModal
          isOpen={isGroupDetailsOpen}
          onClose={() => setIsGroupDetailsOpen(false)}
          activeChat={activeChat}
          currentUser={currentUser}
          token={token}
          onChatUpdated={(updatedChat) => {
            setActiveChat(updatedChat);
          }}
          onDeleteGroup={() => {
            setIsGroupDetailsOpen(false);
            setActiveChat(null);
            setCurrentScreen('home');
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

        <PermissionModal
          isOpen={isPermissionModalOpen}
          onClose={() => setIsPermissionModalOpen(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b141a'
  },
  container: {
    flex: 1,
    backgroundColor: '#0b141a'
  }
});
