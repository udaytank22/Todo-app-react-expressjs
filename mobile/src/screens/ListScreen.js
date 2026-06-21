import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import api from '../services/api';
import { COLORS } from '../utils/theme';

const ListScreen = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
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

  // Process sorting & filtering
  const processedTasks = tasks
    .filter((task) => {
      const matchesSearch = searchVal
        ? task.subject.toLowerCase().includes(searchVal.toLowerCase()) ||
        task.customerName.toLowerCase().includes(searchVal.toLowerCase()) ||
        task.inquiryId.toLowerCase().includes(searchVal.toLowerCase())
        : true;
      const matchesStatus = statusFilter ? task.status === statusFilter : true;
      const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      }
      // Default: createdAt descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const statuses = [
    { label: 'ALL', value: '' },
    { label: 'New', value: 'NEW_EMAIL' },
    { label: 'Review', value: 'PENDING_REVIEW' },
    { label: 'Progress', value: 'IN_PROGRESS' },
    { label: 'Waiting', value: 'WAITING_FOR_CLIENT' },
    { label: 'Done', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

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
      {/* Filtering Options */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search inbox inquiries..."
          placeholderTextColor="#94a3b8"
          value={searchVal}
          onChangeText={setSearchVal}
          autoCorrect={false}
        />

        {/* Scrollable Status Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilters}
        >
          {statuses.map((status) => (
            <TouchableOpacity
              key={status.label}
              style={[
                styles.statusTab,
                statusFilter === status.value && styles.statusTabActive,
              ]}
              onPress={() => setStatusFilter(status.value)}
            >
              <Text
                style={[
                  styles.statusTabText,
                  statusFilter === status.value && styles.statusTabTextActive,
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Priority & Sorting row */}
        <View style={styles.subFiltersRow}>
          <View style={styles.dropdownFilters}>
            {['', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityPill,
                  priorityFilter === p && styles.priorityPillActive,
                ]}
                onPress={() => setPriorityFilter(p)}
              >
                <Text
                  style={[
                    styles.priorityPillText,
                    priorityFilter === p && styles.priorityPillTextActive,
                  ]}
                >
                  {p || 'ALL'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort Switcher */}
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortBy(sortBy === 'createdAt' ? 'priority' : 'createdAt')}
          >
            <Text style={styles.sortBtnText}>
              Sort: {sortBy === 'createdAt' ? '🗓️ Date' : '🔥 Priority'}
            </Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.emptyText}>No results match your filters.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
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
            <Text style={styles.cardCustomer}>Client: {item.customerName}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.badgeRow}>
                <Text style={[styles.badge, styles.badgePriority, { backgroundColor: item.priority === 'HIGH' || item.priority === 'URGENT' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(241, 245, 249, 0.8)' }]}>
                  {item.priority}
                </Text>
                <Text style={[styles.badge, styles.badgeStatus]}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>

              <Text style={styles.arrowText}>View Details ➔</Text>
            </View>
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
    backgroundColor: COLORS.white,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textDark,
  },
  statusFilters: {
    paddingVertical: 4,
    gap: 8,
  },
  statusTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusTabActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: COLORS.primary,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  statusTabTextActive: {
    color: COLORS.primary,
  },
  subFiltersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dropdownFilters: {
    flexDirection: 'row',
    gap: 4,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
  },
  priorityPillActive: {
    backgroundColor: COLORS.primary,
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  priorityPillTextActive: {
    color: COLORS.white,
  },
  sortBtn: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
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
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inquiryId: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  cardDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cardSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 18,
  },
  cardCustomer: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgePriority: {
    color: COLORS.textDark,
  },
  badgeStatus: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    color: COLORS.primary,
  },
  arrowText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default ListScreen;
