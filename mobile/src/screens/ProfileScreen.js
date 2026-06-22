import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

const ProfileScreen = () => {
  const { user, logout, isMailConnected } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'User Profile'}</Text>
          <Text style={styles.email}>{user?.email || 'N/A'}</Text>
          
          <View style={styles.badgeContainer}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role || 'STAFF'}</Text>
            </View>
          </View>
        </View>

        {/* Integration Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Integrations</Text>
          
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>Microsoft Outlook</Text>
              <Text style={styles.statusSubtext}>Auto-sync email inquiries</Text>
            </View>
            <View style={[
              styles.indicator,
              { backgroundColor: isMailConnected ? COLORS.success : COLORS.danger }
            ]}>
              <Text style={styles.indicatorText}>
                {isMailConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Options */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <Text style={styles.logoutBtnText}>Log Out 🚪</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    flex: 1,
    justifyContent: 'center',
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  email: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  badgeContainer: {
    marginTop: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.15)',
  },
  roleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  statusSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  indicator: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  indicatorText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  actionsContainer: {
    marginTop: 10,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ProfileScreen;
