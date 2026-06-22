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
import { COLORS } from '../utils/theme';

const STATUS_COLORS = {
  PENDING: '#0284c7',
  IN_PROGRESS: '#64748b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

const ListScreen = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt' or 'priority'

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await api.get('/api/tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('[List Screen] Error loading tasks:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks(true);
  };

  const getPriorityBadgeStyle = (priority) => {
    if (priority === 'HIGH' || priority === 'URGENT') {
      return { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444' };
    }
    if (priority === 'MEDIUM') {
      return { bg: 'rgba(148, 163, 184, 0.12)', text: '#64748b' };
    }
    return { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981' };
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'rgba(2, 132, 199, 0.08)', text: '#0284c7' };
      case 'IN_PROGRESS':
        return { bg: 'rgba(100, 116, 139, 0.08)', text: '#64748b' };
      case 'COMPLETED':
        return { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981' };
      case 'CANCELLED':
        return { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.12)', text: '#64748b' };
    }
  };

  const getPriorityWeight = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 4;
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 1;
      default:
        return 0;
    }
  };

  // Process sorting
  const processedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'priority') {
      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    }
    // Default: createdAt descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading encrypted database...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Sort Switcher Row */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortBy(sortBy === 'createdAt' ? 'priority' : 'createdAt')}
        >
          <Text style={styles.sortBtnText}>
            Sort: {sortBy === 'createdAt' ? '🗓️ Date' : '🔥 Priority'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tasks FlatList */}
      <FlatList
        data={processedTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No inquiries found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const priorityStyle = getPriorityBadgeStyle(item.priority);
          const statusStyle = getStatusBadgeStyle(item.status);
          const leftBorderColor = STATUS_COLORS[item.status] || '#0284c7';
          return (
            <TouchableOpacity
              style={[styles.card, { borderLeftColor: leftBorderColor }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('InquiryDetails', { id: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.inquiryId}>{item.inquiryId}</Text>
                <Text style={styles.cardDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.cardSubject}>{item.subject}</Text>

              <Text style={styles.cardCustomer}>
                Client: <Text style={styles.cardCustomerName}>{item.customerName || item.senderEmail}</Text>
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
                    <Text style={[styles.badgePriorityText, { color: priorityStyle.text }]}>
                      {item.priority}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.badgeStatusText, { color: statusStyle.text }]}>
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.arrowContainer}>
                  <Text style={styles.arrowText}>View Details ➔</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#f8fafc',
  },
  sortBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  sortBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inquiryId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  cardDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 6,
  },
  cardCustomer: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  cardCustomerName: {
    color: '#0f172a',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePriorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 14,
    color: '#005ec4',
    fontWeight: '600',
  },
});

export default ListScreen;
