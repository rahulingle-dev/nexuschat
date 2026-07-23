import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Users, Star, Pin, SlidersHorizontal, Plus } from 'lucide-react';
import { getUserChats, searchUsers, formatAvatarUrl } from '../services/api';

export const Sidebar = ({
  currentUser,
  connection,
  activeChat,
  onSelectChat,
  onOpenNewChat,
  onOpenNewGroup
}) => {
  const [chats, setChats] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatsRef = useRef(chats);
  const filterRef = useRef(filter);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  const getOtherMember = (chat) => {
    if (chat.type !== 0) return null;
    return chat.members?.find(
      (m) => m.id?.toString().toLowerCase() !== currentUser?.id?.toString().toLowerCase()
    ) || null;
  };

  const fetchChats = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await getUserChats(currentUser.id, filterRef.current);
      setChats(data || []);
    } catch (err) {
      console.error('Failed to fetch user chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [filter, currentUser]);

  useEffect(() => {
    if (connection) {
      const chatUpdateHandler = (chatId, message) => {
        const currentChats = chatsRef.current;
        const index = currentChats.findIndex(
          (c) => c.id?.toLowerCase() === chatId?.toLowerCase()
        );

        if (index !== -1) {
          setChats((prevChats) => {
            const indexInPrev = prevChats.findIndex(
              (c) => c.id?.toLowerCase() === chatId?.toLowerCase()
            );
            if (indexInPrev !== -1) {
              const updated = { ...prevChats[indexInPrev] };
              updated.lastMessageAt = message.sentAt;
              updated.lastMessage = message;
              if (message.senderId?.toLowerCase() !== currentUser.id?.toLowerCase()) {
                updated.unreadCount = (updated.unreadCount || 0) + 1;
              }
              const remaining = prevChats.filter(
                (c) => c.id?.toLowerCase() !== chatId?.toLowerCase()
              );
              return [updated, ...remaining];
            }
            return prevChats;
          });
        } else {
          fetchChats();
        }
      };

      const chatCreatedHandler = () => fetchChats();
      const userPresenceHandler = (userId, isOnline) => {
        setChats((prevChats) =>
          prevChats.map((c) => {
            if (c.type === 0) {
              const updatedMembers = (c.members || []).map((m) => {
                if (m.id?.toString().toLowerCase() === userId?.toString().toLowerCase()) {
                  return { ...m, isOnline };
                }
                return m;
              });
              return { ...c, members: updatedMembers };
            }
            return c;
          })
        );
      };

      connection.on('ChatUpdated', chatUpdateHandler);
      connection.on('ChatCreated', chatCreatedHandler);
      connection.on('UserPresence', userPresenceHandler);
      connection.on('UserPresenceChanged', userPresenceHandler);
      connection.on('MessageDeleted', () => fetchChats());
      connection.on('ChatCleared', () => fetchChats());

      return () => {
        connection.off('ChatUpdated', chatUpdateHandler);
        connection.off('ChatCreated', chatCreatedHandler);
        connection.off('UserPresence', userPresenceHandler);
        connection.off('UserPresenceChanged', userPresenceHandler);
      };
    }
  }, [connection, currentUser]);

  const handleSearchChange = async (val) => {
    setSearchQuery(val);
    if (val.trim().length > 1) {
      try {
        const users = await searchUsers(val);
        setSearchResults((users || []).filter((u) => u.id !== currentUser.id));
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="sidebar-container">
      {/* Sidebar Top Title Bar */}
      <div className="sidebar-title-bar">
        <h2 className="sidebar-main-title">Messages</h2>
        <div className="sidebar-quick-actions">
          <button
            type="button"
            className="action-icon-btn"
            onClick={() => onOpenNewChat()}
            title="Start New Chat"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="sidebar-search-container">
        <div className="search-input-box">
          <Search size={16} className="search-input-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search messages or people..."
            className="search-native-input"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="sidebar-filter-tabs">
        {['All', 'Unread', 'Favourite', 'Groups'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`filter-pill ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="conversations-scroll-area">
        {searchQuery.trim().length > 0 ? (
          <div className="search-results-wrapper">
            {searchResults.length === 0 ? (
              <div className="empty-results-text">No contacts found matching "{searchQuery}"</div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="chat-item-row"
                  onClick={() => onOpenNewChat(user)}
                >
                  <div className="avatar-wrapper">
                    {user.avatarUrl ? (
                      <img src={formatAvatarUrl(user.avatarUrl)} alt="" className="avatar-image" />
                    ) : (
                      <span className="avatar-fallback">
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="chat-item-content">
                    <div className="chat-item-title">{user.fullName}</div>
                    <div className="chat-item-subtext text-cyan">@{user.username}</div>
                  </div>
                  <UserPlus size={16} className="text-cyan ml-auto" />
                </div>
              ))
            )}
          </div>
        ) : loading ? (
          <div className="loading-spinner-wrapper">
            <div className="pulse-loader" />
          </div>
        ) : chats.length === 0 ? (
          <div className="empty-results-text">
            No chats in {filter}.<br />
            Click <strong>+</strong> above to start a conversation.
          </div>
        ) : (
          <div className="chat-items-list">
            {chats.map((chat) => {
              const other = getOtherMember(chat);
              const chatAvatarUrl = formatAvatarUrl(other?.avatarUrl || chat.imageUrl);
              const isActive = activeChat && activeChat.id?.toLowerCase() === chat.id?.toLowerCase();
              return (
                <div
                  key={chat.id}
                  className={`chat-item-row ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChat(chat)}
                >
                  <div className="avatar-wrapper">
                    {chatAvatarUrl ? (
                      <img src={chatAvatarUrl} alt="" className="avatar-image" />
                    ) : (
                      <span className="avatar-fallback">
                        {chat.name ? chat.name.charAt(0).toUpperCase() : 'C'}
                      </span>
                    )}
                    {chat.type === 0 && other?.isOnline && (
                      <span className="status-online-dot" title="Online" />
                    )}
                  </div>

                  <div className="chat-item-content">
                    <div className="chat-item-header">
                      <span className="chat-item-title">{chat.name || 'Conversation'}</span>
                      <span className="chat-item-timestamp">{formatTime(chat.lastMessageAt)}</span>
                    </div>

                    <div className="chat-item-footer">
                      <span className="chat-item-preview">
                        {chat.lastMessage?.content || (chat.type === 1 ? 'Group created' : 'Click to view conversation')}
                      </span>
                      {chat.isFavourite && (
                        <Star size={12} className="star-icon fill-amber" />
                      )}
                      {chat.unreadCount > 0 && (
                        <span className="unread-counter-pill">{chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
