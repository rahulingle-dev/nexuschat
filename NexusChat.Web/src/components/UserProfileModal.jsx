import React, { useState, useRef } from 'react';
import { X, User, Mail, Sparkles, Edit2, Check, LogOut, Camera, AtSign, ShieldCheck, MessageSquareQuote } from 'lucide-react';
import { updateUserProfile, uploadAttachment, formatAvatarUrl } from '../services/api';

export const UserProfileModal = ({ isOpen, onClose, user, isMe, token, onProfileUpdated, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen || !user) return null;

  const displayAvatarUrl = formatAvatarUrl(avatarUrl || user.avatarUrl);

  const handleAvatarFileSelect = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingAvatar(true);
      setError('');
      try {
        const res = await uploadAttachment(file, token);
        if (res.fileUrl) {
          setAvatarUrl(res.fileUrl);
          if (!isEditing) {
            const updated = await updateUserProfile(user.id, user.fullName, user.bio, res.fileUrl, token);
            if (onProfileUpdated) {
              onProfileUpdated(updated || { ...user, avatarUrl: res.fileUrl });
            }
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to upload avatar image');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateUserProfile(user.id, fullName, bio, avatarUrl, token);
      if (onProfileUpdated) {
        onProfileUpdated(updated || { ...user, fullName, bio, avatarUrl });
      }
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-profile-redesign-card" onClick={(e) => e.stopPropagation()}>
        {/* Banner Header with Glowing Backdrop */}
        <div className="profile-banner-redesign">
          <div className="banner-glow-gradient" />
          <button type="button" className="close-profile-btn" onClick={onClose} title="Close Profile">
            <X size={18} />
          </button>
        </div>

        {/* Avatar Container */}
        <div className="profile-avatar-container">
          <div className="profile-avatar-circle-lg">
            {displayAvatarUrl ? (
              <img src={displayAvatarUrl} alt="" className="avatar-img-cover" />
            ) : (
              <span className="avatar-initials-txt">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
            {uploadingAvatar && (
              <div className="avatar-upload-overlay">
                <div className="spinner" />
              </div>
            )}
          </div>

          {isMe && (
            <>
              <button
                type="button"
                className="camera-upload-badge-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Change profile picture"
              >
                <Camera size={15} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden-file-input"
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>

        {/* Profile Content Body */}
        <div className="modal-body pt-0 text-center">
          {error && <div className="auth-alert alert-error mb-4">{error}</div>}

          {!isEditing ? (
            <div className="profile-details-wrapper space-y-4">
              {/* Primary User Header */}
              <div className="profile-head-info">
                <h2 className="user-fullname-head">{user.fullName}</h2>
                <div className="user-username-badge">
                  <AtSign size={13} className="text-cyan-400" />
                  <span>{user.username}</span>
                </div>
              </div>

              {/* Personal Info Grid Cards */}
              <div className="profile-cards-grid">
                <div className="profile-info-card">
                  <div className="card-icon-box bg-emerald">
                    <span className="pulsing-online-dot" />
                  </div>
                  <div className="card-txt-box">
                    <span className="card-txt-label">Presence</span>
                    <span className="card-txt-val text-emerald-400 font-semibold">Active Now</span>
                  </div>
                </div>

                {user.email && (
                  <div className="profile-info-card">
                    <div className="card-icon-box bg-cyan">
                      <Mail size={16} className="text-cyan-400" />
                    </div>
                    <div className="card-txt-box">
                      <span className="card-txt-label">Email Address</span>
                      <span className="card-txt-val">{user.email}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Bio Card */}
              <div className="profile-bio-card-redesign">
                <div className="bio-card-header">
                  <MessageSquareQuote size={16} className="text-cyan-400" />
                  <span>About / Status Bio</span>
                </div>
                <p className="bio-card-content">
                  "{user.bio || 'Hey there! I am using NexusChat.'}"
                </p>
              </div>
            </div>
          ) : (
            <div className="profile-edit-form text-left space-y-4 mt-2">
              <div className="form-input-group">
                <label className="input-label-bold">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="modal-input"
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-input-group">
                <label className="input-label-bold">Status Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people a little about yourself..."
                  className="modal-textarea"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="profile-footer-redesign">
          {isMe ? (
            <button
              type="button"
              className="btn-profile-logout-redesign"
              onClick={() => {
                onClose();
                if (onLogout) onLogout();
              }}
              title="Sign Out of Account"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          ) : (
            <div />
          )}

          <div className="profile-right-actions">
            {isMe && !isEditing ? (
              <button
                type="button"
                className="btn-profile-edit-redesign"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={15} />
                <span>Edit Profile</span>
              </button>
            ) : isMe && isEditing ? (
              <button
                type="button"
                className="btn-profile-save-redesign"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <Check size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            ) : null}

            <button type="button" className="btn-profile-close-redesign" onClick={onClose}>
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
