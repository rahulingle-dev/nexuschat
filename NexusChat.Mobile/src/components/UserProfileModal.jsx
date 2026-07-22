import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateUserProfile, uploadAttachment } from '../services/api';

export const UserProfileModal = ({ isOpen, onClose, user, isMe, token, onProfileUpdated }) => {
  const [fullName, setFullName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setBio(user.bio || '');
      setIsEditingName(false);
      setIsEditingBio(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const showToast = (type, message) => {
    if (type === 'error') {
      setErrorMsg(message);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(message);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleUpdateName = async () => {
    if (!fullName.trim() || fullName.trim() === user.fullName) {
      setIsEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, fullName.trim(), user.bio, null, token);
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setIsEditingName(false);
      showToast('success', 'Full name updated.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update full name.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBio = async () => {
    if (bio.trim() === (user.bio || '')) {
      setIsEditingBio(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.id, user.fullName, bio.trim(), null, token);
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setIsEditingBio(false);
      showToast('success', 'About status updated.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const uploadRes = await uploadAttachment(file, token);
      const fileUrl = uploadRes.fileUrl;

      // Save to user profile
      const updated = await updateUserProfile(user.id, user.fullName, user.bio, fileUrl, token);
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      showToast('success', 'Profile picture updated successfully.');
    } catch (err) {
      showToast('error', err.message || 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.banner}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Hidden File Input for Web */}
          {Platform.OS === 'web' && (
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          )}

          <View style={styles.content}>
            {/* Avatar Container */}
            <View style={{ alignItems: 'center', marginTop: -45, marginBottom: 12 }}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  {user.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarTxt}>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</Text>
                  )}
                </View>
                {isMe && (
                  <TouchableOpacity onPress={() => fileInputRef.current?.click()} style={styles.cameraOverlay} disabled={uploadingAvatar}>
                    {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Success & Error boxes */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#f87171" style={{ marginRight: 6 }} />
                <Text style={styles.errorTxt}>{errorMsg}</Text>
              </View>
            )}
            {successMsg && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#00a884" style={{ marginRight: 6 }} />
                <Text style={styles.successTxt}>{successMsg}</Text>
              </View>
            )}

            {/* Editable Full Name */}
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  style={styles.editNameInput}
                  maxLength={50}
                  autoFocus
                />
                <TouchableOpacity onPress={handleUpdateName} style={styles.saveBtn} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setIsEditingName(false); setFullName(user.fullName || ''); }} style={styles.cancelBtn}>
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.name}>{user.fullName}</Text>
                {isMe && (
                  <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editIconBtn}>
                    <Ionicons name="pencil" size={14} color="#00a884" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.handle}>@{user.username}</Text>

            <View style={styles.infoBox}>
              {/* About & Bio Row */}
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color="#8696a0" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>About & Bio</Text>
                  {isEditingBio ? (
                    <View style={styles.editBioRow}>
                      <TextInput
                        value={bio}
                        onChangeText={setBio}
                        style={styles.editBioInput}
                        maxLength={150}
                        multiline
                      />
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                        <TouchableOpacity onPress={handleUpdateBio} style={styles.smallSaveBtn} disabled={saving}>
                          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Save</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setIsEditingBio(false); setBio(user.bio || ''); }} style={styles.smallCancelBtn}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.infoValue}>{user.bio || "Hey there! I am using NexusChat."}</Text>
                      {isMe && (
                        <TouchableOpacity onPress={() => setIsEditingBio(true)} style={{ padding: 4 }}>
                          <Ionicons name="pencil" size={14} color="#00a884" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Email Row */}
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={20} color="#8696a0" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{user.email}</Text>
                </View>
              </View>

              {/* Status Row */}
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={20} color="#00a884" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={[styles.infoValue, { color: '#00a884', fontWeight: '600' }]}>
                    {user.isOnline ? '● Active Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 20, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111b21',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#222d34',
    overflow: 'hidden'
  },
  banner: {
    backgroundColor: '#00a884',
    height: 90,
    alignItems: 'flex-end',
    padding: 12
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24
  },
  avatarContainer: {
    position: 'relative',
    width: 90,
    height: 90
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#202c33',
    borderWidth: 4,
    borderColor: '#111b21',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImg: {
    width: 82,
    height: 82,
    borderRadius: 41
  },
  avatarTxt: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold'
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00a884',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#111b21',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  name: {
    fontSize: 20,
    color: '#e9edef',
    fontWeight: '700',
    textAlign: 'center'
  },
  editIconBtn: {
    padding: 4,
    marginLeft: 4
  },
  handle: {
    color: '#00a884',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center'
  },
  infoBox: {
    backgroundColor: '#182229',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222d34',
    gap: 14
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: 11,
    color: '#8696a0'
  },
  infoValue: {
    fontSize: 14,
    color: '#e9edef',
    marginTop: 1
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6
  },
  editNameInput: {
    backgroundColor: '#202c33',
    borderWidth: 1,
    borderColor: '#00a884',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#e9edef',
    fontSize: 15,
    width: 180,
    textAlign: 'center'
  },
  saveBtn: {
    backgroundColor: '#00a884',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtn: {
    backgroundColor: '#ef4444',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  editBioRow: {
    marginTop: 4,
    width: '100%'
  },
  editBioInput: {
    backgroundColor: '#202c33',
    borderWidth: 1,
    borderColor: '#00a884',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#e9edef',
    fontSize: 14,
    minHeight: 50,
    textAlignVertical: 'top'
  },
  smallSaveBtn: {
    backgroundColor: '#00a884',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  smallCancelBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  errorTxt: {
    color: '#f87171',
    fontSize: 12
  },
  successBox: {
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  successTxt: {
    color: '#00a884',
    fontSize: 12
  }
});
