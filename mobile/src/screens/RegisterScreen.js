import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STAFF'); // Default role
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    
    const result = await register(
      name.trim(),
      email.trim().toLowerCase(),
      password,
      role
    );
    setLoading(false);
    
    if (result.success) {
      Alert.alert(
        'Success',
        'Registration successful! Please log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      setErrorMsg(result.error);
    }
  };

  const roles = [
    { label: 'Staff', value: 'STAFF', icon: '👤' },
    { label: 'Manager', value: 'MANAGER', icon: '🔑' },
    { label: 'Admin', value: 'ADMIN', icon: '🛡️' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* Header section */}
            <View style={styles.headerSection}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.backArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Join the Team</Text>
              <Text style={styles.subtitle}>Create your secure mobile account</Text>
            </View>

            {/* Card Form */}
            <View style={styles.card}>
              {errorMsg && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setErrorMsg(null);
                  }}
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="john@company.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrorMsg(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMsg(null);
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Role selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Role</Text>
                <View style={styles.roleContainer}>
                  {roles.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[
                        styles.roleButton,
                        role === r.value && styles.roleButtonActive,
                      ]}
                      onPress={() => setRole(r.value)}
                    >
                      <Text style={styles.roleIcon}>{r.icon}</Text>
                      <Text
                        style={[
                          styles.roleText,
                          role === r.value && styles.roleTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Register Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  headerSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backArrow: {
    fontSize: 20,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textDark,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  roleButtonActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: COLORS.primary,
  },
  roleIcon: {
    fontSize: 18,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  roleTextActive: {
    color: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default RegisterScreen;
