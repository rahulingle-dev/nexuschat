import React, { useState } from 'react';
import { X, Search, UserPlus, Sparkles } from 'lucide-react';
import { searchUsers } from '../services/api';

export const NewChatModal = ({ isOpen, onClose, onStartChat, token }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (val) => {
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchUsers(val.trim(), token);
      setResults(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-styled-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="modal-header-icon bg-indigo">
              <UserPlus size={18} className="text-indigo-400" />
            </div>
            <h3>Start New Direct Chat</h3>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="search-input-box mb-4">
            <Search size={16} className="search-input-icon" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search people by @username or full name..."
              className="search-native-input"
              autoFocus
            />
          </div>

          {error && <div className="auth-alert alert-error mb-3">{error}</div>}

          {loading ? (
            <div className="loading-spinner-box py-8">
              <div className="spinner" />
            </div>
          ) : results.length === 0 ? (
            <div className="modal-empty-state">
              <Sparkles size={32} className="text-muted mb-2" />
              <p>{query.trim() ? 'No users found matching your search.' : 'Search a username above to start chatting.'}</p>
            </div>
          ) : (
            <div className="user-search-results-list">
              {results.map((user) => (
                <div
                  key={user.id}
                  className="user-select-row-styled"
                  onClick={() => onStartChat(user)}
                >
                  <div className="avatar-wrapper">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="avatar-image" />
                    ) : (
                      <span className="avatar-fallback">
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>

                  <div className="user-select-info-box">
                    <span className="user-select-name">{user.fullName}</span>
                    <span className="user-select-handle">@{user.username}</span>
                  </div>

                  <button type="button" className="btn-start-chat-row">
                    <UserPlus size={15} />
                    <span>Message</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
