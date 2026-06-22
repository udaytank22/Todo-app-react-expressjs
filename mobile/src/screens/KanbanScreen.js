import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import api from '../services/api';
import { onSocketEvent, offSocketEvent } from '../services/socket';
import { COLORS } from '../utils/theme';

const COLUMNS = [
  { id: 'PENDING', title: 'Pending', icon: '✉️', color: '#8b5cf6' },
  { id: 'IN_PROGRESS', title: 'In Progress', icon: '⚡', color: '#0ea5e9' },
  { id: 'COMPLETED', title: 'Completed', icon: '✅', color: '#10b981' },
  { id: 'CANCELLED', title: 'Cancelled', icon: '❌', color: '#ef4444' },
];

const KanbanScreen = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtering states
  const [activeTab, setActiveTab] = useState('PENDING');
  const [searchVal, setSearchVal] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // Status edit modal states
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const response = await api.get('/api/tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('[Kanban Screen] Error fetching tasks:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Listen to socket status updates for real-time Kanban changes
  useEffect(() => {
    fetchTasks();

    const handleSocketStatusUpdate = (data) => {
      console.log('[Kanban Screen] Realtime status update received:', data);
      if (data && data.taskId && data.toStatus) {
        setTasks((prevTasks) =>
          prevTasks.map((t) =>
            t.id === data.taskId ? { ...t, status: data.toStatus } : t
          )
        );
      }
    };

    const handleSocketNewInquiry = (newInquiry) => {
      console.log('[Kanban Screen] Realtime new inquiry received:', newInquiry);
      if (newInquiry) {
        setTasks((prevTasks) => {
          // Prevent duplicates
          if (prevTasks.find((t) => t.id === newInquiry.id)) return prevTasks;
          return [newInquiry, ...prevTasks];
        });
      }
    };

    onSocketEvent('task_status_updated', handleSocketStatusUpdate);
    onSocketEvent('new_inquiry', handleSocketNewInquiry);

    return () => {
      offSocketEvent('task_status_updated', handleSocketStatusUpdate);
      offSocketEvent('new_inquiry', handleSocketNewInquiry);
    };
  }, [fetchTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks(true);
  };

  const handleUpdateStatus = async (taskId, nextStatus) => {
    setUpdatingStatus(true);
    try {
      // Body payload is auto-encrypted
      await api.patch(`/api/tasks/${taskId}/status`, { status: nextStatus });
      
      // Update local task state immediately
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      );
      
      setStatusModalVisible(false);
    } catch (err) {
      console.error('[Kanban Screen] Status update failed:', err.message);
      Alert.alert('Error', err.response?.data?.error || 'Failed to update task status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filters logic
  const filteredTasks = tasks.filter((task) => {
    const matchesTab = task.status === activeTab;
    const matchesPriority = priorityFilter ? task.priority === priorityFilter : true;
    const matchesSearch = searchVal
      ? task.subject.toLowerCase().includes(searchVal.toLowerCase()) ||
        task.customerName.toLowerCase().includes(searchVal.toLowerCase()) ||
        task.inquiryId.toLowerCase().includes(searchVal.toLowerCase())
      : true;
    return matchesTab && matchesPriority && matchesSearch;
  });

  const getColCount = (colId) => {
    return tasks.filter((t) => t.status === colId).length;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Syncing board status...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Filtering Toolbar */}
      <View style={styles.filterToolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search subject or customer..."
          placeholderTextColor="#94a3b8"
          value={searchVal}
          onChangeText={setSearchVal}
          autoCorrect={false}
        />
        <View style={styles.priorityFilters}>
          <Text style={styles.filterLabel}>Priority:</Text>
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
      </View>

      {/* Horizontal Tabs for Columns */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {COLUMNS.map((col) => {
            const count = getColCount(col.id);
            const isActive = activeTab === col.id;
            return (
              <TouchableOpacity
                key={col.id}
                style={[
                  styles.tabButton,
                  isActive && styles.tabButtonActive,
                  isActive && { borderBottomColor: col.color },
                ]}
                onPress={() => setActiveTab(col.id)}
              >
                <Text style={styles.tabIcon}>{col.icon}</Text>
                <Text style={[styles.tabTitle, isActive && styles.tabTitleActive]}>
                  {col.title}
                </Text>
                <View style={[styles.tabBadge, { backgroundColor: col.color }]}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Task List for active column */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No inquiries in this column.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <View style={styles.cardHeader}>
              <Text style={[styles.badge, styles.badgePriority, { backgroundColor: item.priority === 'HIGH' || item.priority === 'URGENT' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(241, 245, 249, 0.8)' }]}>
                {item.priority}
              </Text>
              <Text style={styles.inquiryId}>{item.inquiryId}</Text>
            </View>

            <Text style={styles.cardSubject}>{item.subject}</Text>
            <Text style={styles.cardCustomer}>Client: {item.customerName}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.statsRow}>
                {item._count?.attachments > 0 && (
                  <Text style={styles.statsText}>📎 {item._count.attachments}</Text>
                )}
                {item._count?.comments > 0 && (
                  <Text style={styles.statsText}>💬 {item._count.comments}</Text>
                )}
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() => navigation.navigate('InquiryDetails', { id: item.id })}
                >
                  <Text style={styles.detailsBtnText}>Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moveBtn}
                  onPress={() => {
                    setSelectedTask(item);
                    setStatusModalVisible(true);
                  }}
                >
                  <Text style={styles.moveBtnText}>Move ➔</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {/* Status Picker Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubject} numberOfLines={1}>
              {selectedTask?.subject}
            </Text>

            {updatingStatus ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.modalLoadingText}>Saving encryption...</Text>
              </View>
            ) : (
              <View style={styles.statusOptions}>
                {COLUMNS.map((col) => {
                  const isCurrent = selectedTask?.status === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[
                        styles.statusOptionBtn,
                        isCurrent && styles.statusOptionBtnCurrent,
                      ]}
                      onPress={() => handleUpdateStatus(selectedTask.id, col.id)}
                    >
                      <Text style={styles.statusOptionText}>
                        {col.icon} {col.title}
                      </Text>
                      {isCurrent && <Text style={styles.currentIndicator}>✓ Current</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  filterToolbar: {
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textDark,
  },
  priorityFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityPillActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: COLORS.primary,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  priorityPillTextActive: {
    color: COLORS.primary,
  },
  tabsWrapper: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTitleActive: {
    color: COLORS.textDark,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  taskCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
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
    marginBottom: 8,
  },
  inquiryId: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  badge: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgePriority: {
    color: COLORS.textDark,
  },
  cardSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  cardCustomer: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  moveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  moveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  closeBtn: {
    fontSize: 18,
    color: COLORS.textMuted,
    padding: 4,
  },
  modalSubject: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 20,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  statusOptions: {
    gap: 10,
  },
  statusOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  statusOptionBtnCurrent: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: COLORS.primary,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  currentIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default KanbanScreen;
