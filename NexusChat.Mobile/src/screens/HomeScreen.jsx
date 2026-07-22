import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserChats, searchUsers } from '../services/api';

export const HomeScreen = ({
  currentUser,
  connection,
  onSelectChat,
  onOpenNewChat,
  onOpenNewGroup,
  onLogout,
  onOpenMyProfile,
  onOpenPermissions
}) => {
  const [chats, setChats] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatsRef = useRef(chats);
  const filterRef = useRef(filter);

  const getOtherMember = (chat) => {
    if (chat.type !== 0) return null;
    return chat.members?.find(m => m.id?.toString().toLowerCase() !== currentUser.id?.toString().toLowerCase()) || null;
  };

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const data = await getUserChats(currentUser.id, filterRef.current);
      setChats(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [filter]);

  useEffect(() => {
    // Real-time Chat List SignalR synchronization
    if (connection) {
      const chatUpdateHandler = (chatId, message) => {
        const currentChats = chatsRef.current;
        const index = currentChats.findIndex((c) => c.id?.toLowerCase() === chatId?.toLowerCase());
        if (index !== -1) {
          setChats((prevChats) => {
            const indexInPrev = prevChats.findIndex((c) => c.id?.toLowerCase() === chatId?.toLowerCase());
            if (indexInPrev !== -1) {
              const updated = { ...prevChats[indexInPrev] };
              updated.lastMessageAt = message.sentAt;
              updated.lastMessage = message;
              if (message.senderId?.toLowerCase() !== currentUser.id?.toLowerCase()) {
                updated.unreadCount = (updated.unreadCount || 0) + 1;
              }
              const remaining = prevChats.filter((c) => c.id?.toLowerCase() !== chatId?.toLowerCase());
              return [updated, ...remaining];
            }
            return prevChats;
          });
        } else {
          // If the chat is not present in the current tab/list, pull updated chat list from server
          fetchChats();
        }
      };

      const chatCreatedHandler = (chatId) => {
        fetchChats();
      };

      const userPresenceHandler = (userId, isOnline) => {
        setChats((prevChats) => {
          return prevChats.map((c) => {
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
          });
        });
      };
      const messageDeletedHandler = (chatId, messageId) => {
        fetchChats();
      };

      const chatClearedHandler = (chatId) => {
        fetchChats();
      };

      connection.on('ChatUpdated', chatUpdateHandler);
      connection.on('ChatCreated', chatCreatedHandler);
      connection.on('UserPresence', userPresenceHandler);
      connection.on('UserPresenceChanged', userPresenceHandler);
      connection.on('MessageDeleted', messageDeletedHandler);
      connection.on('ChatCleared', chatClearedHandler);

      return () => {
        connection.off('ChatUpdated', chatUpdateHandler);
        connection.off('ChatCreated', chatCreatedHandler);
        connection.off('UserPresence', userPresenceHandler);
        connection.off('UserPresenceChanged', userPresenceHandler);
        connection.off('MessageDeleted', messageDeletedHandler);
        connection.off('ChatCleared', chatClearedHandler);
      };
    }
  }, [connection, currentUser]);


  const handleSearchChange = async (val) => {
    setSearchQuery(val);
    if (val.trim().length > 1) {
      try {
        const users = await searchUsers(val);
        setSearchResults(users.filter(u => u.id !== currentUser.id));
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onOpenMyProfile} style={styles.profileBtn}>
          <View style={styles.headerAvatar}>
            {currentUser.avatarUrl ? (
              <Image source={{ uri: currentUser.avatarUrl }} style={styles.headerAvatarImg} />
            ) : (
              <Text style={styles.headerAvatarTxt}>
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.headerName}>{currentUser.fullName}</Text>
            <Text style={styles.headerHandle}>
              @{currentUser.username} • <Text style={{ color: '#00a884', fontWeight: '600', fontSize: 11.5 }}>Online</Text>
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={onOpenPermissions} style={{ padding: 6 }}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#00a884" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={{ padding: 6 }}>
            <Ionicons name="log-out-outline" size={22} color="#8696a0" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Search Bar */}
      <View style={styles.searchBarBox}>
        <View style={styles.searchInner}>
          <Ionicons name="search" size={18} color="#8696a0" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Search username, contacts, messages..."
            placeholderTextColor="#8696a0"
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Category Filter Tabs */}
      <View style={styles.tabsRow}>
        {['All', 'Unread', 'Favourite', 'Groups'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFilter(tab)}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabTxt, filter === tab && styles.filterTabTxtActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main List */}
      <View style={{ flex: 1 }}>
        {searchQuery.trim().length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onOpenNewChat(item)} style={styles.chatTile}>
                <View style={styles.chatAvatar}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.chatAvatarImg} />
                  ) : (
                    <Text style={styles.chatAvatarTxt}>
                      {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatName}>{item.fullName}</Text>
                  <Text style={{ color: '#00a884', fontSize: 13 }}>@{item.username}</Text>
                </View>
                <Ionicons name="person-add" size={18} color="#00a884" />
              </TouchableOpacity>
            )}
          />
        ) : loading ? (
          <ActivityIndicator color="#00a884" style={{ marginTop: 40 }} />
        ) : chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No conversations found in {filter} tab.{'\n'}
              Tap + New Chat below to search by username.
            </Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            extraData={chats.length}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onSelectChat(item)} style={styles.chatTile}>
                <View style={styles.chatAvatar}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.chatAvatarImg} />
                  ) : (
                    <Text style={styles.chatAvatarTxt}>
                      {item.name ? item.name.charAt(0).toUpperCase() : 'C'}
                    </Text>
                  )}
                  {item.type === 0 && getOtherMember(item)?.isOnline && (
                    <View style={styles.onlineBadge} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.chatName}>{item.name || 'Conversation'}</Text>
                    <Text style={styles.chatTime}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                    <Text style={styles.chatPreview} numberOfLines={1}>
                      {item.lastMessage?.content || (item.type === 1 ? 'Group created' : 'Click to start chatting')}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadTxt}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity onPress={onOpenNewGroup} style={styles.fabSecondary}>
          <Ionicons name="people" size={20} color="#00a884" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenNewChat} style={styles.fabPrimary}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b141a'
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#111b21',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#222d34'
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerAvatarTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  headerName: {
    color: '#e9edef',
    fontWeight: '600',
    fontSize: 15
  },
  headerHandle: {
    color: '#00a884',
    fontSize: 12,
    fontWeight: '500'
  },
  searchBarBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111b21'
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202c33',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  searchInput: {
    flex: 1,
    color: '#e9edef',
    fontSize: 14,
    padding: 4
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111b21',
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
    gap: 8
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#202c33'
  },
  filterTabActive: {
    backgroundColor: '#00a884'
  },
  filterTabTxt: {
    color: '#8696a0',
    fontSize: 13,
    fontWeight: '600'
  },
  filterTabTxtActive: {
    color: '#fff'
  },
  chatTile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2c34'
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  chatAvatarTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18
  },
  chatName: {
    color: '#e9edef',
    fontSize: 15,
    fontWeight: '600'
  },
  chatTime: {
    color: '#8696a0',
    fontSize: 11.5
  },
  chatPreview: {
    color: '#8696a0',
    fontSize: 13,
    flex: 1
  },
  unreadBadge: {
    backgroundColor: '#00a884',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6
  },
  unreadTxt: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    color: '#8696a0',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 12
  },
  fabSecondary: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#202c33',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a3942'
  },
  fabPrimary: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  chatAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#22c55e',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#111b21'
  }
});
