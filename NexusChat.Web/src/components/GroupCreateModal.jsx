import React, { useState, useEffect } from 'react';
import { X, Search, Check, Users, UserPlus, Sparkles, UserCheck } from 'lucide-react';
import { searchUsers, createGroupChat } from '../services/api';

export const GroupCreateModal = ({ isOpen, onClose, currentUser, onGroupCreated, token }) => {
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Automatically fetch recent contacts on modal open
  useEffect(() => {
    if (isOpen) {
      fetchInitialContacts();
    } else {
      setGroupName('');
      setQuery('');
      setSearchResults([]);
      setSelectedMembers([]);
      setError('');
    }
  }, [isOpen]);

  const fetchInitialContacts = async () => {
    setLoading(true);
    try {
      const data = await searchUsers('', token);
      setSearchResults((data || []).filter((u) => u.id !== currentUser?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSearch = async (val) => {
    setQuery(val);
    setLoading(true);
    try {
      const data = await searchUsers(val.trim(), token);
      setSearchResults((data || []).filter((u) => u.id !== currentUser?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectMember = (user) => {
    if (selectedMembers.some((m) => m.id === user.id)) {
      setSelectedMembers(selectedMembers.filter((m) => m.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group workspace title.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Please select at least 1 member to add to the group.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const memberUserIds = [currentUser.id, ...selectedMembers.map((m) => m.id)];
      const groupChat = await createGroupChat(groupName.trim(), currentUser.id, memberUserIds, null, token);
      onGroupCreated(groupChat);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg modal-styled-card group-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="group-modal-icon-badge">
              <Users size={20} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create Group Workspace</h3>
              <p className="text-xs text-secondary">Start a multi-user team or topic chat</p>
            </div>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && <div className="auth-alert alert-error mb-4">{error}</div>}

          {/* Group Title Section */}
          <div className="form-input-group mb-5">
            <label className="input-label-bold">1. Group Workspace Title</label>
            <div className="input-field-box">
              <Sparkles size={18} className="field-icon text-cyan-400" />
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Design System Team, Product Launch"
                className="group-title-input"
                autoFocus
              />
            </div>
          </div>

          {/* Selected Members Badges Bar */}
          <div className="form-input-group mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="input-label-bold">2. Selected Members</label>
              <span className="selected-count-badge">
                {selectedMembers.length} selected
              </span>
            </div>

            {selectedMembers.length > 0 ? (
              <div className="group-selected-pills-card">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="group-member-pill">
                    <div className="pill-avatar">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="avatar-image" />
                      ) : (
                        <span>{member.fullName?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <span className="pill-name">{member.fullName || member.username}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectMember(member)}
                      className="pill-remove-btn"
                      title="Remove member"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="group-no-selection-hint">
                No members selected yet. Search and check members below.
              </div>
            )}
          </div>

          {/* Search Contacts Bar */}
          <div className="form-input-group mb-3">
            <label className="input-label-bold">Search & Add People</label>
            <div className="search-input-box">
              <Search size={16} className="search-input-icon" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Type username or full name..."
                className="search-native-input"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="group-contacts-list-container">
            {loading ? (
              <div className="loading-spinner-box py-6">
                <div className="spinner" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="modal-empty-state py-6">
                <p>No contacts found.</p>
              </div>
            ) : (
              <div className="group-users-list">
                {searchResults.map((user) => {
                  const isSelected = selectedMembers.some((m) => m.id === user.id);
                  return (
                    <div
                      key={user.id}
                      className={`group-user-selectable-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleSelectMember(user)}
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

                      <div className="group-user-info">
                        <span className="group-user-fullname">{user.fullName}</span>
                        <span className="group-user-handle">@{user.username}</span>
                      </div>

                      <div className={`group-select-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected ? <Check size={14} className="text-white" /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer justify-between">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!groupName.trim() || selectedMembers.length === 0 || creating}
            onClick={handleCreateGroup}
          >
            {creating ? (
              <div className="spinner" />
            ) : (
              <>
                <Users size={16} />
                <span>Create Group ({selectedMembers.length + 1} members)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
