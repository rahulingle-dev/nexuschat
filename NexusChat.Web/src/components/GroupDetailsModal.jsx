import React, { useState } from 'react';
import { X, UserPlus, Trash2, Edit2, Check, Shield, Users } from 'lucide-react';
import { updateGroupName, addGroupMember, removeGroupMember, deleteGroup, searchUsers } from '../services/api';

export const GroupDetailsModal = ({ isOpen, onClose, activeChat, currentUser, token, onChatUpdated, onDeleteGroup }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(activeChat?.name || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !activeChat) return null;

  const handleUpdateName = async () => {
    if (!newGroupName.trim()) return;
    try {
      const updated = await updateGroupName(activeChat.id, newGroupName.trim(), token);
      onChatUpdated({ ...activeChat, name: updated.name || newGroupName.trim() });
      setIsEditingName(false);
    } catch (err) {
      setError(err.message || 'Failed to update group name');
    }
  };

  const handleSearchUsers = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const users = await searchUsers(val.trim(), token);
      const existingIds = (activeChat.members || []).map((m) => m.id?.toString().toLowerCase());
      setSearchResults((users || []).filter((u) => !existingIds.includes(u.id?.toString().toLowerCase())));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (user) => {
    try {
      await addGroupMember(activeChat.id, user.id, token);
      const updatedMembers = [...(activeChat.members || []), user];
      onChatUpdated({ ...activeChat, members: updatedMembers });
      setSearchQuery('');
      setSearchResults([]);
      setShowAddMember(false);
    } catch (err) {
      setError(err.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      await removeGroupMember(activeChat.id, userId, token);
      const updatedMembers = (activeChat.members || []).filter(
        (m) => m.id?.toString().toLowerCase() !== userId?.toString().toLowerCase()
      );
      onChatUpdated({ ...activeChat, members: updatedMembers });
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? All history will be erased.')) return;
    try {
      await deleteGroup(activeChat.id, token);
      onDeleteGroup();
    } catch (err) {
      setError(err.message || 'Failed to delete group');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg modal-styled-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="modal-header-icon bg-indigo">
              <Users size={18} className="text-indigo-400" />
            </div>
            <h3>Group Workspace Details</h3>
          </div>
          <button type="button" className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="auth-alert alert-error mb-4">{error}</div>}

          {/* Group Header Info Card */}
          <div className="group-detail-info-card text-center mb-6">
            <div className="avatar-wrapper mx-auto mb-3 w-16 h-16">
              {activeChat.imageUrl ? (
                <img src={activeChat.imageUrl} alt="" className="avatar-image" />
              ) : (
                <span className="avatar-fallback text-2xl font-bold">
                  {activeChat.name ? activeChat.name.charAt(0).toUpperCase() : 'G'}
                </span>
              )}
            </div>

            {isEditingName ? (
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="modal-input"
                />
                <button type="button" className="btn-primary py-2 px-3 shrink-0" onClick={handleUpdateName}>
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-xl font-bold text-white">{activeChat.name}</h2>
                <button
                  type="button"
                  className="icon-btn text-muted hover:text-white"
                  onClick={() => setIsEditingName(true)}
                  title="Rename Group"
                >
                  <Edit2 size={15} />
                </button>
              </div>
            )}
            <p className="text-sm text-cyan font-medium mt-1">{activeChat.members?.length || 0} Members</p>
          </div>

          {/* Members Section */}
          <div className="group-members-section">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Group Members</h4>
              <button
                type="button"
                className="btn-secondary text-xs py-1 px-3"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                <UserPlus size={14} /> Add Member
              </button>
            </div>

            {showAddMember && (
              <div className="add-member-box-styled mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Search people by @username..."
                  className="modal-input text-sm mb-2"
                />
                {loading ? (
                  <div className="spinner py-2 mx-auto" />
                ) : searchResults.length > 0 ? (
                  <div className="user-search-results-list max-h-36 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="user-select-row-styled"
                        onClick={() => handleAddMember(user)}
                      >
                        <div className="avatar-wrapper">
                          <span className="avatar-fallback">{user.fullName?.charAt(0) || 'U'}</span>
                        </div>
                        <div className="user-select-info-box">
                          <span className="user-select-name">{user.fullName}</span>
                          <span className="user-select-handle">@{user.username}</span>
                        </div>
                        <button type="button" className="btn-start-chat-row">
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="members-list max-h-60 overflow-y-auto">
              {(activeChat.members || []).map((member) => {
                const isMe = member.id?.toString().toLowerCase() === currentUser.id?.toString().toLowerCase();
                return (
                  <div key={member.id} className="member-row-styled">
                    <div className="avatar-wrapper">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="avatar-image" />
                      ) : (
                        <span className="avatar-fallback">{member.fullName?.charAt(0) || 'U'}</span>
                      )}
                    </div>
                    <div className="member-info-box">
                      <div className="member-name">
                        {member.fullName} {isMe && <span className="text-cyan text-xs font-semibold">(You)</span>}
                      </div>
                      <div className="member-handle">@{member.username}</div>
                    </div>
                    {!isMe && (
                      <button
                        type="button"
                        className="btn-remove-member"
                        onClick={() => handleRemoveMember(member.id)}
                        title="Remove Member"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer justify-between">
          <button type="button" className="btn-danger-outline" onClick={handleDeleteGroup}>
            <Trash2 size={16} /> Delete Group
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
