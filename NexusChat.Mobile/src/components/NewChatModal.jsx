import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lookupUserByUsername } from '../services/api';

export const NewChatModal = ({ isOpen, onClose, onStartChat }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleLookup = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setFoundUser(null);
    setErrorMsg(null);

    try {
      const cleanHandle = username.trim().replace('@', '');
      const user = await lookupUserByUsername(cleanHandle);
      setFoundUser(user);
    } catch (err) {
      setErrorMsg(err.message || `User '@${username}' not found.`);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (foundUser) {
      onStartChat(foundUser);
      onClose();
      setUsername('');
      setFoundUser(null);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>New Conversation</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#8696a0" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>Search Contact by Username</Text>
            <View style={styles.searchRow}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="enter username (e.g. sarah)"
                placeholderTextColor="#8696a0"
                style={styles.input}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleLookup} style={styles.lookupBtn} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.lookupTxt}>Lookup</Text>}
              </TouchableOpacity>
            </View>

            {foundUser && (
              <View style={styles.userCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{foundUser.fullName ? foundUser.fullName.charAt(0) : 'U'}</Text>
                </View>
                <Text style={styles.fullName}>{foundUser.fullName}</Text>
                <Text style={styles.handle}>@{foundUser.username}</Text>
                <Text style={styles.bio}>{foundUser.bio || "No bio available"}</Text>

                <TouchableOpacity onPress={handleStart} style={styles.startBtn}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.startTxt}>Start Chat</Text>
                </TouchableOpacity>
              </View>
            )}

            {errorMsg && (
              <View style={styles.errorBox}>
                <Ionicons name="person-remove" size={20} color="#f87171" style={{ marginRight: 8 }} />
                <View>
                  <Text style={styles.errorTitle}>User Not Found</Text>
                  <Text style={styles.errorTxt}>{errorMsg}</Text>
                </View>
              </View>
            )}
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
  body: {
    padding: 20
  },
  label: {
    fontSize: 13,
    color: '#8696a0',
    marginBottom: 8
  },
  searchRow: {
    flexDirection: 'row',
    backgroundColor: '#202c33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3942',
    alignItems: 'center',
    paddingHorizontal: 12
  },
  atSymbol: {
    color: '#00a884',
    fontWeight: 'bold',
    fontSize: 16
  },
  input: {
    flex: 1,
    color: '#e9edef',
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15
  },
  lookupBtn: {
    backgroundColor: '#00a884',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  lookupTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  userCard: {
    marginTop: 20,
    backgroundColor: '#1f2c34',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#00a884',
    alignItems: 'center'
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  avatarTxt: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold'
  },
  fullName: {
    color: '#e9edef',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2
  },
  handle: {
    color: '#00a884',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8
  },
  bio: {
    color: '#8696a0',
    fontSize: 12,
    marginBottom: 16
  },
  startBtn: {
    width: '100%',
    backgroundColor: '#00a884',
    borderRadius: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  startTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  errorBox: {
    marginTop: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    flexDirection: 'row',
    alignItems: 'center'
  },
  errorTitle: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 13
  },
  errorTxt: {
    color: '#f87171',
    fontSize: 12
  }
});
