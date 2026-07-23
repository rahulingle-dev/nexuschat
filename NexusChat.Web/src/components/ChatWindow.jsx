import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Phone, Video, MoreVertical, Star, Info, Trash2, Lock, ShieldAlert } from 'lucide-react';
import { getChatMessages, sendMessage, markAsRead, toggleChatFlag, clearChat, deleteMessage, formatAvatarUrl } from '../services/api';
import { MessageBubble } from './MessageBubble';
import { VoiceToTextInput } from './VoiceToTextInput';
import { AttachmentModal } from './AttachmentModal';
import { CameraModal } from './CameraModal';
import { sendTypingIndicator, joinChatGroup, leaveChatGroup } from '../services/signalr';

export const ChatWindow = ({
  activeChat,
  currentUser,
  token,
  connection,
  onBack,
  onStartCall,
  onOpenUserProfile,
  onOpenGroupDetails,
  onChatUpdated
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const targetUser = activeChat?.members?.find(
    (m) => m.id?.toString().toLowerCase() !== currentUser?.id?.toString().toLowerCase()
  ) || null;

  const chatAvatarUrl = formatAvatarUrl(targetUser?.avatarUrl || activeChat?.imageUrl);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

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
    if (!window.confirm('Are you sure you want to delete this message for everyone?')) return;
    try {
      await deleteMessage(messageId, currentUser.id, true, token);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message: ' + err.message);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Are you sure you want to clear all messages in this chat? This cannot be undone.')) return;
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
      joinChatGroup(activeChat.id);
      fetchMessagesAndMarkRead();

      if (connection) {
        const messageHandler = (incomingMsg) => {
          if (incomingMsg.chatId?.toLowerCase() === activeChat.id?.toLowerCase()) {
            setMessages((prev) => {
              if (prev.some((m) => m.id?.toLowerCase() === incomingMsg.id?.toLowerCase())) {
                return [...prev];
              }
              return [...prev, incomingMsg];
            });
            markAsRead(activeChat.id, currentUser.id, token).catch(() => {});
            setTimeout(() => scrollToBottom(true), 100);
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
      const data = await getChatMessages(activeChat.id, currentUser.id, 0, 50, token);
      setMessages(data || []);
      await markAsRead(activeChat.id, currentUser.id, token);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 150);
    }
  };

  const handleSendText = async (content) => {
    if (!content || !content.trim()) return;

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
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const newMsg = await sendMessage(
        {
          chatId: activeChat.id,
          senderId: currentUser.id,
          content,
          messageType: 0
        },
        token
      );

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId);
        if (filtered.some((m) => m.id?.toLowerCase() === newMsg.id?.toLowerCase())) {
          return [...filtered];
        }
        return [...filtered, newMsg];
      });
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleSendAttachmentPayload = async (payload) => {
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
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const newMsg = await sendMessage(
        {
          chatId: activeChat.id,
          senderId: currentUser.id,
          content: payload.content,
          messageType: payload.messageType,
          fileUrl: payload.fileUrl,
          fileName: payload.fileName,
          fileSize: payload.fileSize
        },
        token
      );

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempId);
        if (filtered.some((m) => m.id?.toLowerCase() === newMsg.id?.toLowerCase())) {
          return [...filtered];
        }
        return [...filtered, newMsg];
      });
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error('Failed to send attachment message:', err);
    }
  };

  const handleTyping = () => {
    sendTypingIndicator(activeChat.id, currentUser.username);
  };

  const handleInitiateCall = (isVideo) => {
    const target = targetUser || activeChat?.members?.find((m) => m.id?.toString().toLowerCase() !== currentUser.id?.toString().toLowerCase());
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
    <div className="chat-window-container">
      {/* Active Chat Header */}
      <div className="chat-window-header">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" className="icon-btn mobile-only-back" onClick={onBack}>
              <ArrowLeft size={22} />
            </button>
          )}

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              if (activeChat.type === 1) {
                onOpenGroupDetails && onOpenGroupDetails();
              } else {
                onOpenUserProfile && onOpenUserProfile(targetUser || currentUser);
              }
            }}
          >
            <div className="avatar-circle">
              {chatAvatarUrl ? (
                <img src={chatAvatarUrl} alt="" className="avatar-img" />
              ) : (
                <span className="avatar-txt">
                  {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'C'}
                </span>
              )}
            </div>
            <div>
              <h3 className="chat-header-title">{activeChat.name || 'Chat'}</h3>
              <p className="chat-header-status">
                {activeChat.type === 1
                  ? `${activeChat.members?.length || 2} members`
                  : targetUser?.isOnline
                  ? '● Online'
                  : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-btn text-emerald hover:bg-emerald-500/10"
            onClick={() => handleInitiateCall(false)}
            title="Audio Call"
          >
            <Phone size={20} />
          </button>
          <button
            type="button"
            className="icon-btn text-emerald hover:bg-emerald-500/10"
            onClick={() => handleInitiateCall(true)}
            title="Video Call"
          >
            <Video size={20} />
          </button>

          <div className="relative">
            <button
              type="button"
              className="icon-btn text-muted hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreVertical size={20} />
            </button>

            {menuOpen && (
              <div className="dropdown-menu-overlay" onClick={() => setMenuOpen(false)}>
                <div className="dropdown-menu-card" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      handleToggleFavourite();
                    }}
                  >
                    <Star
                      size={16}
                      className={activeChat.isFavourite ? 'text-yellow-400 fill-yellow-400' : 'text-muted'}
                    />
                    {activeChat.isFavourite ? 'Unstar Chat' : 'Star Chat'}
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      if (activeChat.type === 1) {
                        onOpenGroupDetails && onOpenGroupDetails();
                      } else {
                        onOpenUserProfile && onOpenUserProfile(targetUser || currentUser);
                      }
                    }}
                  >
                    <Info size={16} />
                    Chat Details
                  </button>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      setMenuOpen(false);
                      handleClearChat();
                    }}
                  >
                    <Trash2 size={16} />
                    Clear Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="messages-viewport">
        {loading ? (
          <div className="loading-spinner-box py-10">
            <div className="spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="encryption-banner">
            <Lock size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Messages are encrypted end-to-end. Use the paperclip for attachments, camera for quick photos, or mic for voice typing!
            </span>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((item) => (
              <MessageBubble
                key={item.id}
                message={item}
                currentUserId={currentUser.id}
                onDeleteMessage={handleDeleteMessage}
                token={token}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Bar */}
      <VoiceToTextInput
        onSend={handleSendText}
        onOpenAttachment={() => setIsAttachmentOpen(true)}
        onOpenCamera={() => setIsCameraOpen(true)}
        onTyping={handleTyping}
      />

      {/* Modals */}
      <AttachmentModal
        isOpen={isAttachmentOpen}
        onClose={() => setIsAttachmentOpen(false)}
        token={token}
        onSendAttachment={handleSendAttachmentPayload}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        token={token}
        onSendAttachment={handleSendAttachmentPayload}
      />
    </div>
  );
};
