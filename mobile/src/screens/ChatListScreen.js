import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

const ChatListScreen = ({ navigation }) => {
  const { user: currentUser, unreadCounts } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await api.get('/api/auth/users');
      // Exclude the current user from the list
      const filtered = (response.data || []).filter(
        (u) => u.id !== currentUser?.id
      );
      setUsers(filtered);
    } catch (error) {
      console.error('[Chat List Screen] Error fetching users:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(true);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getAvatarBgColor = (name) => {
    const hash = (name || '').split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const colors = [
      '#f43f5e', // rose-500
      '#ec4899', // pink-500
      '#d946ef', // fuchsia-500
      '#a855f7', // purple-500
      '#8b5cf6', // violet-500
      '#6366f1', // indigo-500
      '#3b82f6', // blue-500
      '#0ea5e9', // sky-500
      '#06b6d4', // cyan-500
      '#14b8a6', // teal-500
      '#10b981', // emerald-500
      '#22c55e', // green-500
      '#eab308', // yellow-500
      '#f97316', // orange-500
    ];
    return colors[hash % colors.length];
  };

  const getRoleColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN':
        return COLORS.danger;
      case 'MANAGER':
        return COLORS.warning;
      default:
        return COLORS.primary;
    }
  };

  const filteredUsers = users.filter((u) => {
    const nameMatch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const roleMatch = (u.role || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || roleMatch || emailMatch;
  });

  const renderUserItem = ({ item }) => {
    const unreadCount = unreadCounts[item.id] || 0;
    const initials = getInitials(item.name);
    const avatarBg = getAvatarBgColor(item.name);
    const roleColor = getRoleColor(item.role);

    return (
      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('DirectChat', { user: item })}
      >
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}15` }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>
                {item.role}
              </Text>
            </View>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {item.email}
          </Text>
        </View>

        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search team members..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearIcon}>✖</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching users found.' : 'No other users found.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textDark,
    fontSize: 15,
    paddingVertical: 8,
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginRight: 8,
    maxWidth: '65%',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  unreadBadge: {
    backgroundColor: COLORS.danger,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: 15,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
});

export default ChatListScreen;
