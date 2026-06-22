import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

const CustomerAssignmentsScreen = () => {
  const { user } = useAuth();
  const isPrivileged = user && (user.role === 'ADMIN' || user.role === 'MANAGER');

  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userDropdownVisible, setUserDropdownVisible] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [rulesRes, usersRes] = await Promise.all([
        api.get('/api/customer-assignments'),
        api.get('/api/auth/users'),
      ]);
      setRules(rulesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('[Assignments Screen] Error fetching data:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isPrivileged) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isPrivileged, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleOpenAddModal = () => {
    setEditingRuleId(null);
    setCustomerName('');
    setCustomerEmail('');
    setAssignedUserId('');
    setModalVisible(true);
  };

  const handleOpenEditModal = (rule) => {
    setEditingRuleId(rule.id);
    setCustomerName(rule.customerName || '');
    setCustomerEmail(rule.customerEmail || '');
    setAssignedUserId(rule.assignedUserId || '');
    setModalVisible(true);
  };

  const handleSaveRule = async () => {
    if (!customerName.trim() && !customerEmail.trim()) {
      Alert.alert('Validation Error', 'Provide customer name or email pattern.');
      return;
    }
    if (!assignedUserId) {
      Alert.alert('Validation Error', 'Please select an employee.');
      return;
    }

    setSubmitting(true);
    const payload = {
      customerName: customerName.trim() || null,
      customerEmail: customerEmail.trim() || null,
      assignedUserId,
    };

    try {
      if (editingRuleId) {
        const response = await api.put(`/api/customer-assignments/${editingRuleId}`, payload);
        setRules((prev) => prev.map((r) => (r.id === editingRuleId ? response.data : r)));
      } else {
        const response = await api.post('/api/customer-assignments', payload);
        setRules((prev) => [response.data, ...prev]);
      }
      setModalVisible(false);
    } catch (err) {
      console.error('[Assignments Screen] Failed to save rule:', err.message);
      Alert.alert('Error', err.response?.data?.error || 'Failed to save auto-assignment rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this auto-assignment rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/customer-assignments/${id}`);
              setRules((prev) => prev.filter((r) => r.id !== id));
            } catch (err) {
              console.error('[Assignments Screen] Delete failed:', err.message);
              Alert.alert('Error', 'Failed to delete rule.');
            }
          },
        },
      ]
    );
  };

  if (!isPrivileged) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedIcon}>🛡️</Text>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            Only Administrators and Managers are authorized to configure auto-assignment routing rules.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching assignment schemas...</Text>
      </View>
    );
  }

  const getSelectedUserName = () => {
    const selected = users.find((u) => u.id === assignedUserId);
    return selected ? `${selected.name} (${selected.role})` : 'Select Handler Employee...';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarText}>
          <Text style={styles.toolbarTitle}>Auto Routing Rules</Text>
          <Text style={styles.toolbarSubtitle}>Map customers to handlers automatically</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Rules list */}
      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No auto-routing rules defined.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.ruleDetails}>
                <Text style={styles.ruleLabel}>Customer Pattern:</Text>
                <Text style={styles.ruleValue}>{item.customerName || 'Any Name'}</Text>

                <Text style={styles.ruleLabel}>Email Pattern:</Text>
                <Text style={styles.ruleValue}>{item.customerEmail || 'Any Email'}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditModal(item)}>
                  <Text style={styles.actionBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRule(item.id)}>
                  <Text style={styles.actionBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.assigneeLabel}>Assigned Employee:</Text>
              <Text style={styles.assigneeName}>
                👤 {item.assignedUser?.name || 'Unknown Handler'} ({item.assignedUser?.role})
              </Text>
            </View>
          </View>
        )}
      />

      {/* Creation/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRuleId ? 'Edit Assignment Rule' : 'New Assignment Rule'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Name Pattern</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Acme Corp"
                  placeholderTextColor="#94a3b8"
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Email Pattern</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. billing@acme.com"
                  placeholderTextColor="#94a3b8"
                  value={customerEmail}
                  onChangeText={customerEmail => setCustomerEmail(customerEmail)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Handler user dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assigned Employee</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setUserDropdownVisible(!userDropdownVisible)}
                >
                  <Text style={styles.dropdownTriggerText}>{getSelectedUserName()}</Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>

                {userDropdownVisible && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView style={{ maxHeight: 150 }}>
                      {users.map((u) => (
                        <TouchableOpacity
                          key={u.id}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setAssignedUserId(u.id);
                            setUserDropdownVisible(false);
                          }}
                        >
                          <Text style={styles.dropdownOptionText}>
                            {u.name} ({u.role})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
                onPress={handleSaveRule}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Rule</Text>
                )}
              </TouchableOpacity>
            </View>
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  accessDeniedIcon: {
    fontSize: 48,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  accessDeniedText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toolbarText: {
    flex: 1,
    paddingRight: 8,
  },
  toolbarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  toolbarSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
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
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ruleDetails: {
    flex: 1,
    gap: 2,
  },
  ruleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  ruleValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.15)',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  actionBtnText: {
    fontSize: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 4,
  },
  assigneeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  assigneeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  closeBtn: {
    fontSize: 18,
    color: COLORS.textMuted,
    padding: 4,
  },
  form: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  input: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textDark,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  saveBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});

export default CustomerAssignmentsScreen;
