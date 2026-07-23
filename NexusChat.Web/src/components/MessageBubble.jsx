import React, { useState } from 'react';
import { Download, FileText, Play, Trash2, Image as ImageIcon, Smile } from 'lucide-react';
import { addReaction } from '../services/api';

export const MessageBubble = ({ message, currentUserId, onDeleteMessage, token }) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isMe = message.senderId?.toString().toLowerCase() === currentUserId?.toString().toLowerCase();

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReaction = async (emoji) => {
    setShowEmojiPicker(false);
    try {
      await addReaction(message.id, currentUserId, emoji, token);
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  return (
    <div className={`message-bubble-wrapper ${isMe ? 'mine' : 'other'}`}>
      <div className={`message-bubble ${isMe ? 'bubble-mine' : 'bubble-other'}`}>
        {!isMe && message.senderUsername && (
          <div className="sender-label">@{message.senderUsername}</div>
        )}

        {/* Message Content according to messageType */}
        {/* Type 0: Text, 1: Image, 2: Audio, 3: Video, 4: File */}
        {message.messageType === 1 || (message.fileUrl && (message.fileUrl.endsWith('.jpg') || message.fileUrl.endsWith('.png') || message.fileUrl.endsWith('.jpeg') || message.fileUrl.endsWith('.webp'))) ? (
          <div className="media-attachment-container">
            <img
              src={message.fileUrl}
              alt=""
              className="message-img-preview"
              onClick={() => setShowLightbox(true)}
            />
            {message.content && <p className="message-text-caption">{message.content}</p>}
          </div>
        ) : message.messageType === 2 || (message.fileUrl && (message.fileUrl.endsWith('.mp3') || message.fileUrl.endsWith('.wav') || message.fileUrl.endsWith('.m4a'))) ? (
          <div className="audio-attachment-container">
            <audio controls src={message.fileUrl} className="audio-player" />
            {message.content && <p className="message-text-caption">{message.content}</p>}
          </div>
        ) : message.messageType === 3 || (message.fileUrl && (message.fileUrl.endsWith('.mp4') || message.fileUrl.endsWith('.mov'))) ? (
          <div className="video-attachment-container">
            <video controls src={message.fileUrl} className="video-player-preview" />
            {message.content && <p className="message-text-caption">{message.content}</p>}
          </div>
        ) : message.messageType === 4 || message.fileUrl ? (
          <div className="file-attachment-card">
            <div className="file-icon-box">
              <FileText size={24} className="text-emerald-400" />
            </div>
            <div className="file-info-box">
              <span className="file-name">{message.fileName || 'Attachment Document'}</span>
              <span className="file-size">
                {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Document File'}
              </span>
            </div>
            <a
              href={message.fileUrl}
              download={message.fileName || 'file'}
              target="_blank"
              rel="noreferrer"
              className="download-file-btn"
            >
              <Download size={18} />
            </a>
          </div>
        ) : (
          <p className="message-text-content">{message.content}</p>
        )}

        {/* Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="reactions-container">
            {message.reactions.map((r, i) => (
              <span key={i} className="reaction-badge">
                {r.emoji}
              </span>
            ))}
          </div>
        )}

        {/* Time and Actions */}
        <div className="bubble-meta">
          <span className="message-time">{formatTime(message.sentAt)}</span>
          {isMe && (
            <button
              type="button"
              className="delete-msg-btn"
              onClick={() => onDeleteMessage(message.id)}
              title="Delete message"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={message.fileUrl} alt="Attachment" className="lightbox-img" />
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setShowLightbox(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
