import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createGroupChat, getUserChats, searchUsers } from '../services/api';

export const GroupCreateModal = ({ isOpen, onClose, currentUser, availableUsers, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // User list states
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      const loadInitialContacts = async () => {
        setLoadingUsers(true);
        try {
          const chats = await getUserChats(currentUser.id, 'All');
          // Filter direct chats (type === 0)
          const directUsers = chats
            .filter(c => c.type === 0)
            .map(c => 
              c.members?.find(m => m.id?.toString().toLowerCase() !== currentUser.id?.toString().toLowerCase())
            )
            .filter(Boolean); // Filter out any null/undefined

          // Remove duplicate contacts
          const uniqueUsers = [];
          const seen = new Set();
          for (const u of directUsers) {
            const uid = u.id?.toString().toLowerCase();
            if (uid && !seen.has(uid)) {
              seen.add(uid);
              uniqueUsers.push(u);
            }
          }
          setContacts(uniqueUsers);
        } catch (err) {
          console.error('Failed to load initial contacts:', err);
        } finally {
          setLoadingUsers(false);
        }
      };

      loadInitialContacts();
      // Reset state on open
      setGroupName('');
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setErrorMsg(null);
    }
  }, [isOpen, currentUser]);

  // Reset search results if query is cleared
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearchUsers = async (query) => {
    if (!query || !query.trim()) return;
    setLoadingUsers(true);
    setErrorMsg(null);
    try {
      const cleanHandle = query.trim().replace('@', '');
      const results = await searchUsers(cleanHandle);
      // Exclude current user
      const filtered = results.filter(u => u.id?.toString().toLowerCase() !== currentUser.id?.toString().toLowerCase());
      setSearchResults(filtered);
      if (filtered.length === 0) {
        setErrorMsg(`No users found matching '@${cleanHandle}'`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to search users.');
      setSearchResults([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleSelect = (user) => {
    const isSelected = selectedUsers.some(u => u.id?.toLowerCase() === user.id?.toLowerCase());
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id?.toLowerCase() !== user.id?.toLowerCase()));
    } else {
      if (selectedUsers.length >= 49) {
        setErrorMsg('Group member limit reached! Maximum capacity is 50 members.');
        return;
      }
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setErrorMsg('Please provide a group name.');
      return;
    }
    if (selectedUsers.length < 1) {
      setErrorMsg('Select at least 1 member to form a group.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const selectedIds = selectedUsers.map(u => u.id);

    try {
      const groupChat = await createGroupChat(
        groupName.trim(),
        currentUser.id,
        selectedIds
      );
      onGroupCreated(groupChat);
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create group chat.');
    } finally {
      setLoading(false);
    }
  };

  const displayedUsers = searchQuery.trim().length > 0 ? searchResults : contacts;

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Create Group Chat</Text>
              <Text style={styles.subtitle}>Capacity: {selectedUsers.length + 1} / 50 Members</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#8696a0" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#f87171" style={{ marginRight: 6 }} />
                <Text style={styles.errorTxt}>{errorMsg}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Group Title</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Project Team Nexus"
              placeholderTextColor="#8696a0"
              style={styles.input}
            />

            <Text style={styles.label}>Select/Search Members</Text>

            {/* Search Input Box with Lookup/Search Button */}
            <View style={styles.searchRow}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="search username (e.g. sarah)"
                placeholderTextColor="#8696a0"
                style={styles.searchInputField}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => handleSearchUsers(searchQuery)} style={styles.lookupBtn} disabled={loadingUsers}>
                {loadingUsers ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.lookupTxt}>Search</Text>}
              </TouchableOpacity>
            </View>

            {/* Selected Badges */}
            {selectedUsers.length > 0 && (
              <View style={styles.selectedContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedScroll}>
                  {selectedUsers.map((u) => (
                    <TouchableOpacity key={u.id} onPress={() => toggleSelect(u)} style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeTxt} numberOfLines={1}>{u.fullName}</Text>
                      <Ionicons name="close-circle" size={14} color="#f87171" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.sectionTitle}>
              {searchQuery.trim().length > 0 ? 'Search Results' : 'Recent Contacts'}
            </Text>

            <ScrollView style={styles.scrollList}>
              {loadingUsers ? (
                <ActivityIndicator color="#00a884" style={{ padding: 20 }} />
              ) : displayedUsers.length === 0 ? (
                <Text style={styles.emptyTxt}>
                  {searchQuery.trim().length > 0 
                    ? 'No matching users found.' 
                    : 'No recent contacts. Use search bar to find users by username.'}
                </Text>
              ) : (
                displayedUsers.map((u) => {
                  const isSelected = selectedUsers.some(su => su.id?.toLowerCase() === u.id?.toLowerCase());
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => toggleSelect(u)}
                      style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                    >
                      <View style={styles.memberInfo}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarTxt}>{u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName} numberOfLines={1}>{u.fullName}</Text>
                          <Text style={styles.memberHandle}>@{u.username}</Text>
                        </View>
                      </View>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity onPress={handleCreate} style={styles.createBtn} disabled={loading}>
              <Ionicons name="people" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.createTxt}>{loading ? 'Creating...' : 'Create Group'}</Text>
            </TouchableOpacity>
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
    maxWidth: 400,
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
  label: {
    fontSize: 13,
    color: '#8696a0',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#202c33',
    borderWidth: 1,
    borderColor: '#2a3942',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#e9edef',
    fontSize: 14,
    marginBottom: 16
  },
  searchRow: {
    flexDirection: 'row',
    backgroundColor: '#202c33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3942',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 16
  },
  atSymbol: {
    color: '#00a884',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 4
  },
  searchInputField: {
    flex: 1,
    color: '#e9edef',
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 14
  },
  lookupBtn: {
    backgroundColor: '#00a884',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8
  },
  lookupTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00a884',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  selectedContainer: {
    marginBottom: 14,
    maxHeight: 40
  },
  selectedScroll: {
    gap: 8,
    alignItems: 'center'
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2c34',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#00a884'
  },
  selectedBadgeTxt: {
    color: '#e9edef',
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 100
  },
  scrollList: {
    maxHeight: 200,
    backgroundColor: '#182229',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222d34',
    padding: 6,
    marginBottom: 16
  },
  emptyTxt: {
    color: '#8696a0',
    fontSize: 13,
    padding: 12,
    textAlign: 'center'
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4
  },
  memberRowSelected: {
    backgroundColor: 'rgba(0, 168, 132, 0.15)'
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
    marginRight: 10
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8696a0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },
  checkboxSelected: {
    backgroundColor: '#00a884',
    borderWidth: 0
  },
  createBtn: {
    backgroundColor: '#00a884',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  }
});
