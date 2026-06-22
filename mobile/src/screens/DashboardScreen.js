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
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const highPriority = tasks.filter((t) => ['HIGH', 'URGENT'].includes(t.priority)).length;

  const recentInquiries = tasks.slice(0, 5);

  const statuses = [
    { label: 'Pending', key: 'PENDING', color: '#8b5cf6' }, // Violet
    { label: 'In Progress', key: 'IN_PROGRESS', color: '#0ea5e9' }, // Sky
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

  const getRoleBadgeText = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'ADMIN ACCESS';
      case 'MANAGER':
        return 'MANAGER ACCESS';
      default:
        return 'STAFF ACCESS';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'rgba(2, 132, 199, 0.08)', text: '#0284c7' };
      case 'IN_PROGRESS':
        return { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b' };
      case 'COMPLETED':
        return { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981' };
      case 'WAITING_FOR_CLIENT':
        return { bg: 'rgba(180, 83, 9, 0.08)', text: '#b45309' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.12)', text: '#64748b' };
    }
  };

  const renderMetricIcon = (type) => {
    switch (type) {
      case 'total':
        return (
          <View style={styles.iconBarChart}>
            <View style={[styles.bar, { height: 6, backgroundColor: COLORS.primary }]} />
            <View style={[styles.bar, { height: 14, backgroundColor: COLORS.primary }]} />
            <View style={[styles.bar, { height: 10, backgroundColor: COLORS.primary }]} />
          </View>
        );
      case 'pending':
        return (
          <View style={styles.iconEnvelope}>
            <View style={[styles.envelopeBody, { borderColor: '#8b5cf6' }]} />
            <View style={[styles.envelopeV, { borderTopColor: '#8b5cf6' }]} />
          </View>
        );
      case 'in_progress':
        return (
          <View style={styles.iconHourglass}>
            <View style={[styles.hourglassTop, { borderBottomColor: '#f59e0b' }]} />
            <View style={[styles.hourglassBottom, { borderTopColor: '#f59e0b' }]} />
          </View>
        );
      case 'completed':
        return (
          <View style={[styles.iconCheckCircle, { borderColor: '#10b981' }]}>
            <View style={[styles.checkMark, { borderColor: '#10b981' }]} />
          </View>
        );
      case 'high_priority':
        return (
          <View style={styles.iconWarningContainer}>
            <View style={styles.iconWarning}>
              <View style={[styles.warningTriangle, { borderBottomColor: '#ef4444' }]} />
              <Text style={styles.warningExclamation}>!</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

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
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Team Member'}</Text>
          <View style={styles.roleBadge}>
            <View style={styles.roleBadgeDot} />
            <Text style={styles.roleBadgeText}>{getRoleBadgeText(user?.role)}</Text>
          </View>
        </View>

        {/* Metrics Container */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderLeftColor: COLORS.primary }]}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>Total Inquiries</Text>
                {renderMetricIcon('total')}
              </View>
              <Text style={styles.metricVal}>{totalInquiries}</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>Pending</Text>
                {renderMetricIcon('pending')}
              </View>
              <Text style={[styles.metricVal, { color: '#8b5cf6' }]}>{pendingTasks}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderLeftColor: '#b45309' }]}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>In Progress</Text>
                {renderMetricIcon('in_progress')}
              </View>
              <Text style={[styles.metricVal, { color: '#b45309' }]}>{inProgressTasks}</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>Completed</Text>
                {renderMetricIcon('completed')}
              </View>
              <Text style={[styles.metricVal, { color: '#10b981' }]}>{completedTasks}</Text>
            </View>
          </View>

          <View style={[styles.metricCardFull, { borderLeftColor: '#ef4444' }]}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>High Priority</Text>
              {renderMetricIcon('high_priority')}
            </View>
            <Text style={[styles.metricVal, { color: '#ef4444' }]}>{highPriority}</Text>
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

          <View style={styles.recentInquiriesList}>
            {recentInquiries.length === 0 ? (
              <View style={styles.listCard}>
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No recent inquiries found.</Text>
                </View>
              </View>
            ) : (
              recentInquiries.map((item) => {
                const statusStyle = getStatusBadgeStyle(item.status);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.inquiryCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('InquiryDetails', { id: item.id })}
                  >
                    <View style={styles.inquiryLeft}>
                      <Text style={styles.inquirySubject} numberOfLines={2}>
                        {item.subject}
                      </Text>
                      <View style={styles.inquirySenderRow}>
                        <Text style={styles.inquirySenderIcon}>👤</Text>
                        <Text style={styles.inquirySenderName} numberOfLines={1}>
                          {item.customerName || item.senderEmail}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.inquiryRight}>
                      <View style={[
                        styles.priorityBadge,
                        item.priority === 'HIGH' || item.priority === 'URGENT' ? styles.badgeHigh : styles.badgeNormal
                      ]}>
                        <Text style={[
                          styles.priorityText,
                          item.priority === 'HIGH' || item.priority === 'URGENT' ? styles.textHigh : styles.textNormal
                        ]}>
                          {item.priority}
                        </Text>
                      </View>
                      
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.bg }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: statusStyle.text }
                        ]}>
                          {item.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
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
    paddingVertical: 8,
    paddingHorizontal: 2,
    gap: 2,
  },
  welcomeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    gap: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: 'space-between',
    minHeight: 92,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  metricCardFull: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: 'space-between',
    minHeight: 92,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    flex: 1,
    paddingRight: 4,
  },
  metricVal: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 6,
  },
  // Custom drawn metric icons
  iconBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    width: 20,
    height: 18,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 3.5,
    borderRadius: 1,
  },
  iconEnvelope: {
    width: 20,
    height: 14,
    position: 'relative',
    marginTop: 2,
  },
  envelopeBody: {
    width: 20,
    height: 14,
    borderWidth: 2,
    borderRadius: 3.5,
  },
  envelopeV: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderTopWidth: 6,
  },
  iconHourglass: {
    width: 16,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    marginTop: 2,
  },
  hourglassTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderLeftColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: 'transparent',
    borderTopWidth: 8,
  },
  hourglassBottom: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderLeftColor: 'transparent',
    borderRightWidth: 7,
    borderRightColor: 'transparent',
    borderBottomWidth: 8,
  },
  iconCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    width: 8,
    height: 4,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: '-45deg' }],
    top: -1,
  },
  iconWarningContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWarning: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  warningTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: 'transparent',
    borderRightWidth: 8,
    borderRightColor: 'transparent',
    borderBottomWidth: 14,
  },
  warningExclamation: {
    position: 'absolute',
    color: '#ef4444',
    fontSize: 9,
    fontWeight: 'bold',
    bottom: 1.5,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  recentInquiriesList: {
    gap: 10,
  },
  inquiryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1.5,
  },
  inquiryLeft: {
    flex: 1,
    paddingRight: 12,
    gap: 10,
  },
  inquirySubject: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  inquirySenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inquirySenderIcon: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  inquirySenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  inquiryRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 52,
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  badgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  textHigh: {
    color: '#ef4444',
  },
  badgeNormal: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  textNormal: {
    color: '#64748b',
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
