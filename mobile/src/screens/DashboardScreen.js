import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Endpoint is automatically encrypted/decrypted via our api service interceptors
      const response = await api.get('/api/tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('[Dashboard Screen] Failed to load tasks:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(true);
  };

  // Metrics
  const totalInquiries = tasks.length;
  const newEmails = tasks.filter((t) => t.status === 'NEW_EMAIL').length;
  const pendingReview = tasks.filter((t) => t.status === 'PENDING_REVIEW').length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const highPriority = tasks.filter((t) => ['HIGH', 'URGENT'].includes(t.priority)).length;

  const recentInquiries = tasks.slice(0, 5);

  const statuses = [
    { label: 'New Email', key: 'NEW_EMAIL', color: '#8b5cf6' }, // Violet
    { label: 'Pending Review', key: 'PENDING_REVIEW', color: '#f59e0b' }, // Amber
    { label: 'In Progress', key: 'IN_PROGRESS', color: '#0ea5e9' }, // Sky
    { label: 'Waiting for Client', key: 'WAITING_FOR_CLIENT', color: '#ec4899' }, // Pink
    { label: 'Completed', key: 'COMPLETED', color: '#10b981' }, // Emerald
    { label: 'Cancelled', key: 'CANCELLED', color: '#ef4444' }, // Red
  ];

  const getPercentage = (count) => {
    if (totalInquiries === 0) return 0;
    return Math.round((count / totalInquiries) * 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching encrypted workspace...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header Profile Section */}
        <View style={styles.profileSection}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'Team Member'}</Text>
            <Text style={styles.userRole}>{user?.role || 'Staff'}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Log Out 🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.metricLabel}>Total Inquiries</Text>
            <Text style={styles.metricVal}>{totalInquiries}</Text>
            <Text style={styles.metricIcon}>📊</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.metricLabel}>New Emails</Text>
            <Text style={[styles.metricVal, { color: '#8b5cf6' }]}>{newEmails}</Text>
            <Text style={styles.metricIcon}>✉️</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.metricLabel}>Pending Review</Text>
            <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{pendingReview}</Text>
            <Text style={styles.metricIcon}>⏳</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.metricLabel}>Completed</Text>
            <Text style={[styles.metricVal, { color: '#10b981' }]}>{completedTasks}</Text>
            <Text style={styles.metricIcon}>✅</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={styles.metricLabel}>High Priority</Text>
            <Text style={[styles.metricVal, { color: '#ef4444' }]}>{highPriority}</Text>
            <Text style={styles.metricIcon}>⚠️</Text>
          </View>
        </View>

        {/* Recent Inquiries List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Inquiries</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Kanban')}>
              <Text style={styles.sectionLink}>View Kanban →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listCard}>
            {recentInquiries.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recent inquiries found.</Text>
              </View>
            ) : (
              recentInquiries.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.listItem,
                    index === recentInquiries.length - 1 && styles.listItemLast,
                  ]}
                  onPress={() => navigation.navigate('InquiryDetails', { id: item.id })}
                >
                  <View style={styles.itemContent}>
                    <Text style={styles.itemSubject} numberOfLines={1}>
                      {item.subject}
                    </Text>
                    <Text style={styles.itemCustomer} numberOfLines={1}>
                      Customer: {item.customerName}
                    </Text>
                  </View>
                  <View style={styles.itemBadges}>
                    <Text style={[styles.badge, styles.badgePriority, { backgroundColor: item.priority === 'HIGH' || item.priority === 'URGENT' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(241, 245, 249, 0.8)' }]}>
                      {item.priority}
                    </Text>
                    <Text style={[styles.badge, styles.badgeStatus]}>
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Status Distribution breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Breakdown</Text>
          <View style={styles.listCard}>
            {statuses.map((status) => {
              const count = tasks.filter((t) => t.status === status.key).length;
              const percentage = getPercentage(count);
              return (
                <View key={status.key} style={styles.breakdownRow}>
                  <View style={styles.breakdownTextRow}>
                    <Text style={styles.breakdownLabel}>{status.label}</Text>
                    <Text style={styles.breakdownCount}>
                      {count} ({percentage}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { backgroundColor: status.color, width: `${percentage}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  welcomeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  userRole: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    position: 'relative',
    overflow: 'hidden',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4,
  },
  metricIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 20,
    opacity: 0.15,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  itemContent: {
    flex: 1,
    paddingRight: 8,
  },
  itemSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  itemCustomer: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  itemBadges: {
    alignItems: 'flex-end',
    gap: 4,
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
  badgeStatus: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    color: COLORS.primary,
  },
  breakdownRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  breakdownCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default DashboardScreen;
