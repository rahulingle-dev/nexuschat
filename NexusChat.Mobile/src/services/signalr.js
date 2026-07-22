import * as signalR from '@microsoft/signalr';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getHubUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:5009/hubs/chat`;
  }

  try {
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
    if (hostUri) {
      const laptopIp = hostUri.split(':')[0];
      if (laptopIp && laptopIp !== 'localhost' && laptopIp !== '127.0.0.1') {
        return `http://${laptopIp}:5009/hubs/chat`;
      }
    }
  } catch (e) {}

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5009/hubs/chat';
  }

  return 'http://localhost:5009/hubs/chat';
};

let hubConnection = null;
let connectionPromise = null;
let currentUserId = null;

export const initSignalR = (token, userId, callbacks = {}) => {
  const hubUrl = getHubUrl();
  console.log('[SignalR Config] Connecting to Hub URL:', hubUrl);
  currentUserId = userId;

  if (hubConnection) {
    hubConnection.stop();
  }

  hubConnection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .build();

  const {
    onNewMessage,
    onChatUpdated,
    onChatCreated,
    onTyping,
    onPresenceChange,
    onIncomingCall,
    onCallAccepted,
    onCallRejected,
    onCallEnded,
    onSignalingMessage,
    onMessageDeleted,
    onChatCleared
  } = callbacks;

  hubConnection.on('ReceiveMessage', (message) => {
    if (onNewMessage) onNewMessage(message);
  });

  hubConnection.on('ChatUpdated', (chatId, message) => {
    if (onChatUpdated) onChatUpdated(chatId, message);
  });

  hubConnection.on('ChatCreated', (chatId) => {
    if (onChatCreated) onChatCreated(chatId);
  });

  hubConnection.on('UserTyping', (chatId, username) => {
    if (onTyping) onTyping(chatId, username);
  });

  hubConnection.on('MessageDeleted', (chatId, messageId) => {
    if (onMessageDeleted) onMessageDeleted(chatId, messageId);
  });

  hubConnection.on('ChatCleared', (chatId) => {
    if (onChatCleared) onChatCleared(chatId);
  });

  hubConnection.on('UserPresence', (userId, isOnline) => {
    if (onPresenceChange) onPresenceChange(userId, isOnline);
  });

  hubConnection.on('UserPresenceChanged', (userId, isOnline) => {
    if (onPresenceChange) onPresenceChange(userId, isOnline);
  });

  hubConnection.on('IncomingCall', (targetUserId, callerId, callerName, isVideo) => {
    if (onIncomingCall) onIncomingCall(targetUserId, callerId, callerName, isVideo);
  });

  hubConnection.on('CallAccepted', (callerId, receiverId) => {
    if (onCallAccepted) onCallAccepted(callerId, receiverId);
  });

  hubConnection.on('CallRejected', (callerId, receiverId) => {
    if (onCallRejected) onCallRejected(callerId, receiverId);
  });

  hubConnection.on('CallEnded', (targetUserId, senderId) => {
    if (onCallEnded) onCallEnded(targetUserId, senderId);
  });

  hubConnection.on('SignalingMessageReceived', (senderId, messageType, payload) => {
    if (onSignalingMessage) onSignalingMessage(senderId, messageType, payload);
  });

  hubConnection.onreconnected((connectionId) => {
    console.log('[SignalR Reconnected] Connection ID:', connectionId);
    if (currentUserId) {
      hubConnection.invoke('JoinUserGroup', currentUserId.toString().toLowerCase())
        .catch((err) => console.error('[SignalR JoinUserGroup Reconnect Error]', err));
    }
  });

  connectionPromise = hubConnection.start()
    .then(() => {
      console.log('[SignalR Connected] WebSockets Live');
      if (userId) {
        hubConnection.invoke('JoinUserGroup', userId.toString().toLowerCase())
          .catch((err) => console.error('[SignalR JoinUserGroup Error]', err));
      }
      return true;
    })
    .catch((err) => {
      console.error('[SignalR Connection Error]', err);
      connectionPromise = null;
      return false;
    });

  return hubConnection;
};

const ensureConnection = async () => {
  if (!hubConnection) return false;
  if (hubConnection.state === signalR.HubConnectionState.Connected) return true;
  if (connectionPromise) {
    return await connectionPromise;
  }
  if (hubConnection.state === signalR.HubConnectionState.Disconnected) {
    try {
      connectionPromise = hubConnection.start()
        .then(() => {
          console.log('[SignalR Connected] WebSockets Live');
          return true;
        })
        .catch((err) => {
          console.error('[SignalR Connection Error]', err);
          connectionPromise = null;
          return false;
        });
      return await connectionPromise;
    } catch (e) {
      connectionPromise = null;
      return false;
    }
  }
  return false;
};

export const joinChatGroup = async (chatId) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('JoinChatGroup', chatId.toString().toLowerCase())
      .catch((err) => console.error('[SignalR JoinGroup Error]', err));
  }
};

export const leaveChatGroup = async (chatId) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('LeaveChatGroup', chatId.toString().toLowerCase())
      .catch((err) => console.error('[SignalR LeaveGroup Error]', err));
  }
};

export const joinUserGroup = async (userId) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('JoinUserGroup', userId.toString().toLowerCase())
      .catch((err) => console.error('[SignalR JoinUserGroup Error]', err));
  }
};

export const sendTypingIndicator = async (chatId, username) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('SendTypingIndicator', chatId.toString().toLowerCase(), username)
      .catch((err) => console.error('[SignalR Typing Error]', err));
  }
};

export const sendCallOffer = async (targetUserId, callerId, callerName, isVideo) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('SendCallOffer', targetUserId.toString().toLowerCase(), callerId.toString().toLowerCase(), callerName, isVideo)
      .catch((err) => console.error('[SignalR SendCallOffer Error]', err));
  }
};

export const acceptCall = async (callerId, receiverId) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('AcceptCall', callerId.toString().toLowerCase(), receiverId.toString().toLowerCase())
      .catch((err) => console.error('[SignalR AcceptCall Error]', err));
  }
};

export const rejectCall = async (callerId, receiverId) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('RejectCall', callerId.toString().toLowerCase(), receiverId.toString().toLowerCase())
      .catch((err) => console.error('[SignalR RejectCall Error]', err));
  }
};

export const endCall = async (targetUserId, senderId) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('EndCall', targetUserId.toString().toLowerCase(), senderId.toString().toLowerCase())
      .catch((err) => console.error('[SignalR EndCall Error]', err));
  }
};

export const sendSignalingMessage = async (targetUserId, senderId, messageType, payload) => {
  const isConnected = await ensureConnection();
  if (isConnected && hubConnection) {
    hubConnection.invoke('SendSignalingMessage', targetUserId.toString().toLowerCase(), senderId.toString().toLowerCase(), messageType, payload)
      .catch((err) => console.error('[SignalR SendSignalingMessage Error]', err));
  }
};

export const getHubConnection = () => hubConnection;
