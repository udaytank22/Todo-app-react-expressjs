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
  { id: 'PENDING', title: 'Pending', color: '#0284c7' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: '#64748b' },
  { id: 'COMPLETED', title: 'Completed', color: '#10b981' },
  { id: 'CANCELLED', title: 'Cancelled', color: '#ef4444' },
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

  const renderColumnTabIcon = (colId, isActive, activeColor) => {
    const tintColor = isActive ? activeColor : '#64748b';
    switch (colId) {
      case 'PENDING':
        return (
          <View style={styles.iconEnvelopeCol}>
            <View style={[styles.envelopeBodyCol, { borderColor: tintColor }]} />
            <View style={[styles.envelopeVCol, { borderTopColor: tintColor }]} />
          </View>
        );
      case 'IN_PROGRESS':
        return (
          <View style={styles.iconInProgressCol}>
            <View style={[styles.progressCircleCol, { borderColor: tintColor, borderTopColor: 'transparent' }]} />
            <View style={[styles.progressArrowCol, { borderLeftColor: tintColor }]} />
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={[styles.iconCheckCircleCol, { borderColor: tintColor }]}>
            <View style={[styles.checkMarkCol, { borderColor: tintColor }]} />
          </View>
        );
      case 'CANCELLED':
        return (
          <View style={styles.iconCrossCol}>
            <View style={[styles.crossLineCol, { backgroundColor: tintColor, transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.crossLineCol, { backgroundColor: tintColor, transform: [{ rotate: '-45deg' }] }]} />
          </View>
        );
      default:
        return null;
    }
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Filtering Toolbar */}
      <View style={styles.filterToolbar}>
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search subject or customer..."
            placeholderTextColor="#94a3b8"
            value={searchVal}
            onChangeText={setSearchVal}
            autoCorrect={false}
          />
        </View>
        <View style={styles.priorityFilters}>
          <Text style={styles.filterLabel}>PRIORITY</Text>
          {['', 'LOW', 'MEDIUM', 'HIGH'].map((p) => (
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
                {p ? (p.charAt(0) + p.slice(1).toLowerCase()) : 'All'}
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
                  isActive && {
                    backgroundColor: 'rgba(2, 132, 199, 0.08)',
                    borderColor: 'rgba(2, 132, 199, 0.2)',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => setActiveTab(col.id)}
              >
                {renderColumnTabIcon(col.id, isActive, col.color)}
                <Text style={[
                  styles.tabTitle, 
                  { color: isActive ? col.color : '#64748b' }
                ]}>
                  {col.title}
                </Text>
                <View style={[
                  styles.tabBadge, 
                  { backgroundColor: isActive ? col.color : 'rgba(15, 23, 42, 0.06)' }
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    { color: isActive ? COLORS.white : '#64748b' }
                  ]}>
                    {count}
                  </Text>
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
        renderItem={({ item }) => {
          const priorityStyle = getPriorityBadgeStyle(item.priority);
          const colColor = COLUMNS.find(c => c.id === activeTab)?.color || COLORS.primary;
          return (
            <View style={[styles.taskCard, { borderLeftColor: colColor }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
                  <Text style={[styles.badgePriorityText, { color: priorityStyle.text }]}>
                    {item.priority}
                  </Text>
                </View>
                <Text style={styles.inquiryId}>{item.inquiryId}</Text>
              </View>

              <Text style={styles.cardSubject}>{item.subject}</Text>
              
              <Text style={styles.cardCustomer}>
                Client: <Text style={styles.cardCustomerName}>{item.customerName || item.senderEmail}</Text>
              </Text>

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
                    style={[styles.moveBtn, { backgroundColor: colColor }]}
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
          );
        }}
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
  filterToolbar: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: '#94a3b8',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  priorityFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  priorityPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priorityPillActive: {
    backgroundColor: '#005ec4',
    borderColor: '#005ec4',
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  priorityPillTextActive: {
    color: '#ffffff',
  },
  tabsWrapper: {
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
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
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inquiryId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
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
    marginTop: 4,
  },
  cardCustomerName: {
    color: '#0f172a',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statsText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 'auto',
  },
  detailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  detailsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#005ec4',
  },
  moveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
  },
  closeBtn: {
    fontSize: 18,
    color: '#64748b',
    padding: 4,
  },
  modalSubject: {
    fontSize: 13,
    color: '#64748b',
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
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  statusOptionBtnCurrent: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284c7',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  currentIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  iconEnvelopeCol: {
    width: 20,
    height: 14,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  envelopeBodyCol: {
    width: 20,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    position: 'absolute',
  },
  envelopeVCol: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 2,
  },
  iconInProgressCol: {
    width: 18,
    height: 18,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleCol: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    position: 'absolute',
  },
  progressArrowCol: {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 3.5,
    borderBottomWidth: 3.5,
    borderLeftWidth: 4.5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  iconCheckCircleCol: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  checkMarkCol: {
    width: 7,
    height: 4,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRightWidth: 0,
    borderTopWidth: 0,
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  iconCrossCol: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  crossLineCol: {
    width: 12,
    height: 1.5,
    position: 'absolute',
  },
});

export default KanbanScreen;
