import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import api from '../services/api';
import { onSocketEvent, offSocketEvent } from '../services/socket';
import { COLORS } from '../utils/theme';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('[Notifications Screen] Error loading alerts:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Listen to realtime socket notifications
  useEffect(() => {
    fetchNotifications();

    const handleNewNotification = (notification) => {
      console.log('[Notifications Screen] Realtime alert received:', notification);
      if (notification) {
        setNotifications((prev) => {
          // Avoid duplicate entries
          if (prev.find((n) => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
      }
    };

    onSocketEvent('new_notification', handleNewNotification);

    return () => {
      offSocketEvent('new_notification', handleNewNotification);
    };
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('[Notifications Screen] Error marking notification read:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('[Notifications Screen] Error marking all read:', err.message);
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      handleMarkRead(item.id);
    }
    // Navigate to details screen
    navigation.navigate('InquiryDetails', { id: item.relatedId });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ASSIGNMENT':
        return '👥';
      case 'NEW_COMMENT':
        return '💬';
      case 'STATUS_UPDATE':
        return '🔄';
      case 'NEW_INQUIRY':
      default:
        return '✉️';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching secure notifications...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.tabRow}>
          {['ALL', 'UNREAD'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, filter === t && styles.tabActive]}
              onPress={() => setFilter(t)}
            >
              <Text style={[styles.tabText, filter === t && styles.tabTextActive]}>
                {t === 'ALL' ? 'All Alerts' : `Unread (${unreadCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>✓ Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications list */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.isRead && styles.cardUnread]}
            activeOpacity={0.7}
            onPress={() => handleNotificationClick(item)}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}>
                  {item.title}
                </Text>
                <Text style={styles.cardTime}>
                  {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.cardBody} numberOfLines={2}>
                {item.message}
              </Text>
            </View>

            {!item.isRead && (
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={() => handleMarkRead(item.id)}
              >
                <Text style={styles.checkIcon}>✓</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 10,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
  },
  tabActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: 'rgba(2, 132, 199, 0.02)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    flex: 1,
    paddingRight: 8,
  },
  cardTitleUnread: {
    color: COLORS.textDark,
    fontWeight: '800',
  },
  cardTime: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cardBody: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  checkBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  checkIcon: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default NotificationsScreen;
