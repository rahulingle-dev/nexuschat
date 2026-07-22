import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const MessageBubble = ({ message, currentUserId, onSelectUser, onDeleteMessage }) => {
  const isMine = message.senderId === currentUserId;
  const [reactions, setReactions] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  const handleDeleteClick = () => {
    setShowPicker(false);
    if (onDeleteMessage) {
      onDeleteMessage(message.id);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handleAddReaction = (emoji) => {
    setReactions((prev) => [...prev, emoji]);
    setShowPicker(false);
  };

  const handleOpenFile = (url) => {
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={[styles.wrapper, isMine ? styles.wrapperMine : styles.wrapperOther]}>
      <TouchableOpacity 
        onLongPress={() => setShowPicker(!showPicker)}
        activeOpacity={0.9}
        style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}
      >
        {!isMine && message.senderUsername && (
          <TouchableOpacity onPress={() => onSelectUser && onSelectUser(message.senderUsername)}>
            <Text style={styles.senderHandle}>@{message.senderUsername}</Text>
          </TouchableOpacity>
        )}

        {message.fileUrl && message.messageType === 1 ? (
          <TouchableOpacity onPress={() => handleOpenFile(message.fileUrl)} activeOpacity={0.8}>
            <Image source={{ uri: message.fileUrl }} style={styles.imageAttachment} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}

        {message.fileUrl && message.messageType !== 1 ? (
          <TouchableOpacity
            onPress={() => handleOpenFile(message.fileUrl)}
            style={styles.fileBox}
            activeOpacity={0.8}
          >
            <View style={styles.fileIconCircle}>
              <Ionicons name="document-text" size={22} color="#00a884" />
            </View>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={styles.fileName} numberOfLines={1}>
                {message.fileName || 'Attachment Document'}
              </Text>
              {message.fileSize ? (
                <Text style={styles.fileSize}>{formatFileSize(message.fileSize)}</Text>
              ) : null}
            </View>
            <Ionicons name="download-outline" size={20} color="#34b7f1" />
          </TouchableOpacity>
        ) : null}

        {message.content ? (
          <Text style={styles.messageText}>{message.content}</Text>
        ) : null}

        {reactions.length > 0 ? (
          <View style={[styles.reactionBadge, isMine ? { right: 6 } : { left: 6 }]}>
            {reactions.map((r, idx) => (
              <Text key={idx} style={styles.reactionText}>{r}</Text>
            ))}
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.timeText}>{formatTime(message.sentAt)}</Text>
          {isMine && (
            <Ionicons
              name={message.readAt ? "checkmark-done" : message.deliveredAt ? "checkmark-done" : "checkmark"}
              size={15}
              color={message.readAt ? "#34b7f1" : "#8696a0"}
              style={{ marginLeft: 3 }}
            />
          )}
        </View>
      </TouchableOpacity>

      {showPicker && (
        <View style={[styles.pickerBox, isMine ? { right: 10 } : { left: 10 }]}>
          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
            <TouchableOpacity key={emoji} onPress={() => handleAddReaction(emoji)}>
              <Text style={{ fontSize: 18 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          {isMine && (
            <TouchableOpacity 
              onPress={handleDeleteClick} 
              style={{ marginLeft: 6, paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: '#222d34', justifyContent: 'center' }}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    flexDirection: 'row',
    position: 'relative'
  },
  wrapperMine: {
    justifyContent: 'flex-end'
  },
  wrapperOther: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12
  },
  bubbleMine: {
    backgroundColor: '#005c4b',
    borderBottomRightRadius: 2
  },
  bubbleOther: {
    backgroundColor: '#202c33',
    borderBottomLeftRadius: 2
  },
  senderHandle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00a884',
    marginBottom: 4
  },
  messageText: {
    fontSize: 14.5,
    color: '#e9edef',
    lineHeight: 20,
    marginTop: 2
  },
  imageAttachment: {
    width: 220,
    height: 150,
    borderRadius: 8,
    marginBottom: 4
  },
  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4
  },
  fileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 168, 132, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#e9edef'
  },
  fileSize: {
    fontSize: 11,
    color: '#8696a0',
    marginTop: 2
  },
  reactionBadge: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#111b21',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#222d34'
  },
  reactionText: {
    fontSize: 11,
    marginHorizontal: 1
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4
  },
  timeText: {
    fontSize: 10.5,
    color: 'rgba(241, 245, 249, 0.6)'
  },
  pickerBox: {
    position: 'absolute',
    top: -40,
    backgroundColor: '#111b21',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#222d34',
    zIndex: 10
  }
});
