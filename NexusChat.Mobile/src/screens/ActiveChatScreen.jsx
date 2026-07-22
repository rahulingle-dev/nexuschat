import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getChatMessages, sendMessage, markAsRead, toggleChatFlag, clearChat, deleteMessage } from '../services/api';
import { MessageBubble } from '../components/MessageBubble';
import { VoiceToTextInput } from '../components/VoiceToTextInput';
import { AttachmentModal } from '../components/AttachmentModal';
import { sendTypingIndicator, joinChatGroup, leaveChatGroup } from '../services/signalr';

export const ActiveChatScreen = ({ activeChat, currentUser, token, connection, onBack, onStartCall, onOpenUserProfile, onOpenGroupDetails, onChatUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const flatListRef = useRef(null);

  const targetUser = activeChat?.members?.find(m => m.id?.toString().toLowerCase() !== currentUser.id?.toString().toLowerCase()) || null;

  const handleToggleFavourite = async () => {
    try {
      await toggleChatFlag(activeChat.id, currentUser.id, 'favorite', token);
      const updatedChat = { ...activeChat, isFavourite: !activeChat.isFavourite };
      if (onChatUpdated) {
        onChatUpdated(updatedChat);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    const proceed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm("Are you sure you want to delete this message for everyone?")
      : true;

    if (!proceed) return;

    try {
      await deleteMessage(messageId, currentUser.id, token);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message: ' + err.message);
    }
  };

  const handleClearChat = async () => {
    const proceed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm("Are you sure you want to clear all messages in this chat? This cannot be undone.")
      : true;

    if (!proceed) return;

    try {
      await clearChat(activeChat.id, currentUser.id, token);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
      alert('Failed to clear chat: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeChat) {
      // 1. Join SignalR real-time group for this active chat
      joinChatGroup(activeChat.id);

      // 2. Fetch existing messages and mark as read immediately
      fetchMessagesAndMarkRead();

      // 3. Register real-time message listener for incoming messages
      if (connection) {
        const messageHandler = (incomingMsg) => {
          if (incomingMsg.chatId?.toLowerCase() === activeChat.id?.toLowerCase()) {
            setMessages((prev) => {
              if (prev.some(m => m.id?.toLowerCase() === incomingMsg.id?.toLowerCase())) {
                return [...prev]; // Return fresh reference to force re-render
              }
              return [...prev, incomingMsg];
            });
            // Mark incoming message as read
            markAsRead(activeChat.id, currentUser.id).catch(() => {});
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        };

        const messageDeletedHandler = (chatId, messageId) => {
          if (chatId?.toLowerCase() === activeChat.id?.toLowerCase()) {
            setMessages((prev) => prev.filter((m) => m.id?.toLowerCase() !== messageId?.toLowerCase()));
          }
        };

        const chatClearedHandler = (chatId) => {
          if (chatId?.toLowerCase() === activeChat.id?.toLowerCase()) {
            setMessages([]);
          }
        };

        connection.on('ReceiveMessage', messageHandler);
        connection.on('MessageDeleted', messageDeletedHandler);
        connection.on('ChatCleared', chatClearedHandler);

        return () => {
          connection.off('ReceiveMessage', messageHandler);
          connection.off('MessageDeleted', messageDeletedHandler);
          connection.off('ChatCleared', chatClearedHandler);
          leaveChatGroup(activeChat.id);
        };
      }
    }
  }, [activeChat, connection]);

  const fetchMessagesAndMarkRead = async () => {
    setLoading(true);
    try {
      const data = await getChatMessages(activeChat.id);
      setMessages(data || []);
      await markAsRead(activeChat.id, currentUser.id);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 150);
    }
  };

  const handleSendText = async (content) => {
    if (!content || !content.trim()) return;

    // Optimistic temporary message to display instantly
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      chatId: activeChat.id,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      content,
      messageType: 0,
      sentAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const newMsg = await sendMessage({
        chatId: activeChat.id,
        senderId: currentUser.id,
        content,
        messageType: 0
      });
      
      setMessages((prev) => {
        // Replace temp msg with real backend msg
        const filtered = prev.filter(m => m.id !== tempId);
        if (filtered.some(m => m.id?.toLowerCase() === newMsg.id?.toLowerCase())) {
          return [...filtered];
        }
        return [...filtered, newMsg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSendAttachmentPayload = async (payload) => {
    // Optimistic display
    const tempId = `temp_att_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      chatId: activeChat.id,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      content: payload.content,
      messageType: payload.messageType,
      fileUrl: payload.fileUrl,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      sentAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const newMsg = await sendMessage({
        chatId: activeChat.id,
        senderId: currentUser.id,
        content: payload.content,
        messageType: payload.messageType,
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        fileSize: payload.fileSize
      });

      setMessages((prev) => {
        const filtered = prev.filter(m => m.id !== tempId);
        if (filtered.some(m => m.id?.toLowerCase() === newMsg.id?.toLowerCase())) {
          return [...filtered];
        }
        return [...filtered, newMsg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      console.error('Failed to send attachment message:', err);
    }
  };

  const handleTyping = () => {
    sendTypingIndicator(activeChat.id, currentUser.username);
  };

  const handleInitiateCall = (isVideo) => {
    const target = targetUser || activeChat?.members?.find(m => m.id?.toString().toLowerCase() !== currentUser.id?.toString().toLowerCase());
    const targetId = target?.id;
    if (!targetId) {
      alert('Cannot initiate call: Target user not found in this chat.');
      return;
    }
    onStartCall({
      targetUserId: targetId,
      targetName: target.fullName || activeChat.name || 'Nexus User',
      isVideo
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color="#8696a0" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (activeChat.type === 1) {
                onOpenGroupDetails && onOpenGroupDetails();
              } else {
                onOpenUserProfile && onOpenUserProfile(targetUser || currentUser);
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View style={styles.avatar}>
              {activeChat.imageUrl ? (
                <Image source={{ uri: activeChat.imageUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarTxt}>
                  {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'C'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.chatName}>{activeChat.name || 'Chat'}</Text>
              <Text style={[
                styles.statusTxt,
                activeChat.type === 0 && !targetUser?.isOnline && { color: '#8696a0' }
              ]}>
                {activeChat.type === 1 
                  ? `${activeChat.members?.length || 2} members` 
                  : (targetUser?.isOnline ? '● Online' : 'Offline')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <TouchableOpacity onPress={handleToggleFavourite}>
            <Ionicons 
              name={activeChat.isFavourite ? "star" : "star-outline"} 
              size={21} 
              color={activeChat.isFavourite ? "#eab308" : "#8696a0"} 
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleInitiateCall(false)}>
            <Ionicons name="call-outline" size={21} color="#00a884" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleInitiateCall(true)}>
            <Ionicons name="videocam-outline" size={22} color="#00a884" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClearChat}>
            <Ionicons name="trash-outline" size={21} color="#8696a0" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            if (activeChat.type === 1) {
              onOpenGroupDetails && onOpenGroupDetails();
            } else {
              onOpenUserProfile && onOpenUserProfile(targetUser || currentUser);
            }
          }}>
            <Ionicons name="information-circle-outline" size={22} color="#8696a0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message List */}
      <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 10 }}>
        {loading ? (
          <ActivityIndicator color="#00a884" style={{ marginTop: 20 }} />
        ) : messages.length === 0 ? (
          <View style={styles.encryptionCard}>
            <Text style={styles.encryptionTxt}>
              🔒 Messages are end-to-end encrypted. Tap paperclip icon for attachments or mic icon to speak!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            extraData={messages.length}
            keyExtractor={(item) => item.id}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                currentUserId={currentUser.id}
                onDeleteMessage={handleDeleteMessage}
              />
            )}
          />
        )}
      </View>

      {/* Input Bar */}
      <VoiceToTextInput
        onSend={handleSendText}
        onOpenAttachment={() => setIsAttachmentOpen(true)}
        onTyping={handleTyping}
      />

      {/* Attachment Modal */}
      <AttachmentModal
        isOpen={isAttachmentOpen}
        onClose={() => setIsAttachmentOpen(false)}
        token={token}
        onSendAttachment={handleSendAttachmentPayload}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141a'
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#111b21',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#222d34'
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  avatarTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  chatName: {
    color: '#e9edef',
    fontWeight: '600',
    fontSize: 15
  },
  statusTxt: {
    color: '#00a884',
    fontSize: 11,
    fontWeight: '500'
  },
  encryptionCard: {
    backgroundColor: '#111b21',
    padding: 14,
    borderRadius: 12,
    maxWidth: 280,
    alignSelf: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#222d34'
  },
  encryptionTxt: {
    color: '#8696a0',
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 18
  }
});
