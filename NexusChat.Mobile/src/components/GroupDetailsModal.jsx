import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updateGroupName, addGroupMember, removeGroupMember, searchUsers, deleteGroup } from '../services/api';

export const GroupDetailsModal = ({ isOpen, onClose, activeChat, currentUser, token, onChatUpdated, onDeleteGroup }) => {
  const [newName, setNewName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add member states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Custom alert & confirmation states
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  useEffect(() => {
    if (isOpen && activeChat) {
      setNewName(activeChat.name || '');
      setIsEditingName(false);
      setSearchQuery('');
      setSearchResults([]);
      setErrorMsg(null);
      setSuccessMsg(null);
      setMemberToRemove(null);
      setConfirmDeleteGroup(false);
    }
  }, [isOpen, activeChat]);

  if (!isOpen || !activeChat) return null;

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
    if (!newName.trim() || newName.trim() === activeChat.name) {
      setIsEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const updatedChat = await updateGroupName(activeChat.id, newName.trim(), token);
      const chatWithMembers = { 
        ...updatedChat, 
        members: updatedChat.members && updatedChat.members.length > 0 ? updatedChat.members : activeChat.members 
      };
      setIsEditingName(false);
      if (onChatUpdated) {
        onChatUpdated(chatWithMembers);
      }
      showToast('success', 'Group name updated successfully.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update group name.');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    try {
      const cleanQuery = searchQuery.trim().replace('@', '');
      const results = await searchUsers(cleanQuery);
      
      const existingIds = new Set((activeChat.members || []).map(m => m.id?.toString().toLowerCase()));
      const filtered = results.filter(u => 
        u.id?.toString().toLowerCase() !== currentUser.id?.toString().toLowerCase() && 
        !existingIds.has(u.id?.toString().toLowerCase())
      );
      
      setSearchResults(filtered);
      if (filtered.length === 0) {
        showToast('error', `No new users found matching '@${cleanQuery}'`);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to search users.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleAddMember = async (user) => {
    setLoadingMembers(true);
    try {
      const addedUser = await addGroupMember(activeChat.id, user.id, token);
      const updatedMembers = [...(activeChat.members || []), addedUser];
      const updatedChat = { ...activeChat, members: updatedMembers };
      
      if (onChatUpdated) {
        onChatUpdated(updatedChat);
      }
      
      setSearchResults(searchResults.filter(u => u.id !== user.id));
      showToast('success', `${user.fullName} has been added to the group.`);
    } catch (err) {
      showToast('error', err.message || 'Failed to add member.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const performRemove = async (member) => {
    setLoadingMembers(true);
    try {
      await removeGroupMember(activeChat.id, member.id, token);
      
      const updatedMembers = (activeChat.members || []).filter(m => m.id?.toString().toLowerCase() !== member.id?.toString().toLowerCase());
      const updatedChat = { ...activeChat, members: updatedMembers };
      
      if (onChatUpdated) {
        onChatUpdated(updatedChat);
      }
      showToast('success', `${member.fullName} has been removed.`);
    } catch (err) {
      showToast('error', err.message || 'Failed to remove member.');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDeleteGroup = async () => {
    setLoadingMembers(true);
    try {
      await deleteGroup(activeChat.id, token);
      showToast('success', 'Group has been successfully deleted.');
      setTimeout(() => {
        if (onDeleteGroup) {
          onDeleteGroup();
        }
      }, 1500);
    } catch (err) {
      showToast('error', err.message || 'Failed to delete group.');
    } finally {
      setLoadingMembers(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Custom Confirmation Dialog for removing member */}
          {memberToRemove && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <Ionicons name="warning" size={32} color="#ef4444" style={{ marginBottom: 12 }} />
                <Text style={styles.confirmTitle}>Remove Member</Text>
                <Text style={styles.confirmText}>
                  Are you sure you want to remove <Text style={{ color: '#e9edef', fontWeight: 'bold' }}>{memberToRemove.fullName}</Text> (@{memberToRemove.username}) from this group?
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity onPress={() => setMemberToRemove(null)} style={styles.cancelConfirmBtn}>
                    <Text style={styles.cancelConfirmTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      performRemove(memberToRemove);
                      setMemberToRemove(null);
                    }} 
                    style={styles.deleteConfirmBtn}
                  >
                    <Text style={styles.deleteConfirmTxt}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Custom Confirmation Dialog for deleting group */}
          {confirmDeleteGroup && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <Ionicons name="trash-outline" size={32} color="#ef4444" style={{ marginBottom: 12 }} />
                <Text style={styles.confirmTitle}>Delete Group</Text>
                <Text style={styles.confirmText}>
                  Are you sure you want to permanently delete <Text style={{ color: '#e9edef', fontWeight: 'bold' }}>{activeChat.name}</Text>? This action cannot be undone and will delete all messages.
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity onPress={() => setConfirmDeleteGroup(false)} style={styles.cancelConfirmBtn}>
                    <Text style={styles.cancelConfirmTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      handleDeleteGroup();
                      setConfirmDeleteGroup(false);
                    }} 
                    style={styles.deleteConfirmBtn}
                  >
                    <Text style={styles.deleteConfirmTxt}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Group Info</Text>
              <Text style={styles.subtitle}>{(activeChat.members || []).length} Members</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#8696a0" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Custom Toast Messages */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#f87171" style={{ marginRight: 8 }} />
                <Text style={styles.errorTxt}>{errorMsg}</Text>
              </View>
            )}

            {successMsg && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#00a884" style={{ marginRight: 8 }} />
                <Text style={styles.successTxt}>{successMsg}</Text>
              </View>
            )}

            {/* Group Name Editing */}
            <Text style={styles.sectionLabel}>Group Name</Text>
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.editNameInput}
                  maxLength={50}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity onPress={handleUpdateName} style={styles.saveBtn} disabled={saving}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setIsEditingName(false); setNewName(activeChat.name || ''); }} style={styles.cancelBtn}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.groupNameText}>{activeChat.name}</Text>
                <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editBtn}>
                  <Ionicons name="pencil" size={16} color="#00a884" />
                </TouchableOpacity>
              </View>
            )}

            {/* Add Member Section */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Add New Member</Text>
            <View style={styles.searchRow}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="search username to add..."
                placeholderTextColor="#8696a0"
                style={styles.searchInput}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleSearchUsers} style={styles.searchBtn} disabled={loadingSearch}>
                {loadingSearch ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnTxt}>Search</Text>}
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View style={styles.searchResultsBox}>
                <Text style={styles.smallLabel}>Results (Tap to add)</Text>
                {searchResults.map((u) => (
                  <TouchableOpacity key={u.id} onPress={() => handleAddMember(u)} style={styles.searchResultRow} disabled={loadingMembers}>
                    <View style={styles.memberInfo}>
                      <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
                        <Text style={styles.avatarTxt}>{u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}</Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>{u.fullName}</Text>
                        <Text style={styles.memberHandle}>@{u.username}</Text>
                      </View>
                    </View>
                    <Ionicons name="person-add" size={18} color="#00a884" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Member List */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Group Members</Text>
            {loadingMembers && <ActivityIndicator color="#00a884" style={{ marginBottom: 10 }} />}
            <View style={styles.membersList}>
              {(activeChat.members || []).map((m) => {
                const isMe = m.id?.toString().toLowerCase() === currentUser.id?.toString().toLowerCase();
                return (
                  <View key={m.id} style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarTxt}>{m.fullName ? m.fullName.charAt(0).toUpperCase() : 'U'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.fullName} {isMe && <Text style={{ color: '#8696a0', fontSize: 12 }}>(You)</Text>}
                        </Text>
                        <Text style={styles.memberHandle}>@{m.username}</Text>
                      </View>
                    </View>

                    {/* Don't allow kicking yourself */}
                    {!isMe && (
                      <TouchableOpacity onPress={() => setMemberToRemove(m)} style={styles.kickBtn} disabled={loadingMembers}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Delete Group Button */}
            <TouchableOpacity 
              onPress={() => setConfirmDeleteGroup(true)} 
              style={styles.deleteGroupBtn}
              disabled={loadingMembers}
            >
              <Ionicons name="trash" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.deleteGroupTxt}>Delete Group</Text>
            </TouchableOpacity>
          </ScrollView>
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
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: '#111b21',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#222d34',
    overflow: 'hidden'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e9edef'
  },
  subtitle: {
    fontSize: 12,
    color: '#00a884',
    marginTop: 2
  },
  body: {
    padding: 20
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8696a0',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2c34',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3942'
  },
  groupNameText: {
    color: '#e9edef',
    fontSize: 16,
    fontWeight: '600',
    flex: 1
  },
  editBtn: {
    padding: 4
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  editNameInput: {
    flex: 1,
    backgroundColor: '#202c33',
    borderWidth: 1,
    borderColor: '#00a884',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#e9edef',
    fontSize: 15
  },
  saveBtn: {
    backgroundColor: '#00a884',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtn: {
    backgroundColor: '#ef4444',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchRow: {
    flexDirection: 'row',
    backgroundColor: '#202c33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3942',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10
  },
  atSymbol: {
    color: '#00a884',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 4
  },
  searchInput: {
    flex: 1,
    color: '#e9edef',
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 14
  },
  searchBtn: {
    backgroundColor: '#00a884',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8
  },
  searchBtnTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  searchResultsBox: {
    backgroundColor: '#182229',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#222d34',
    marginBottom: 16
  },
  smallLabel: {
    fontSize: 11,
    color: '#8696a0',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222d34'
  },
  membersList: {
    backgroundColor: '#182229',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222d34',
    padding: 8
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
    paddingHorizontal: 6
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },
  memberName: {
    color: '#e9edef',
    fontSize: 14,
    fontWeight: '500'
  },
  memberHandle: {
    color: '#8696a0',
    fontSize: 12
  },
  kickBtn: {
    padding: 6,
    marginLeft: 10
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  errorTxt: {
    color: '#f87171',
    fontSize: 13
  },
  successBox: {
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  successTxt: {
    color: '#00a884',
    fontSize: 13
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 20, 26, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999
  },
  confirmCard: {
    backgroundColor: '#1f2c34',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a3942',
    padding: 20,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center'
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e9edef',
    marginBottom: 8
  },
  confirmText: {
    fontSize: 14,
    color: '#8696a0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: '#202c33',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3942'
  },
  cancelConfirmTxt: {
    color: '#8696a0',
    fontSize: 14,
    fontWeight: '600'
  },
  deleteConfirmBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  deleteConfirmTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  deleteGroupBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24
  },
  deleteGroupTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  }
});
