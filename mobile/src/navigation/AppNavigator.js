import React from 'react';
import { ActivityIndicator, View, StyleSheet, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../utils/theme';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import KanbanScreen from '../screens/KanbanScreen';
import ListScreen from '../screens/ListScreen';
import InquiryDetailsScreen from '../screens/InquiryDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CustomerAssignmentsScreen from '../screens/CustomerAssignmentsScreen';
import ChatListScreen from '../screens/ChatListScreen';
import DirectChatScreen from '../screens/DirectChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom Unicode tab icons helper
const getTabIcon = (routeName) => {
  switch (routeName) {
    case 'Dashboard':
      return '📊';
    case 'Kanban':
      return '📋';
    case 'Tasks List':
      return '📝';
    case 'Notifications':
      return '🔔';
    case 'Assignments':
      return '👥';
    default:
      return '🔹';
  }
};

const TabNavigator = () => {
  const { user, isMailConnected, unreadCounts } = useAuth();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    console.log('[TabNavigator] Safe Area Insets:', insets);
  }, [insets]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handleAvatarPress = () => {
    Alert.alert(
      "User Profile",
      `Name: ${user?.name || ''}\nEmail: ${user?.email || ''}\nRole: ${user?.role || ''}\n\nOutlook Integration: ${isMailConnected ? 'Connected 🟢' : 'Disconnected 🔴'}`,
      [{ text: "OK" }]
    );
  };

  const totalUnread = Object.values(unreadCounts || {}).reduce((sum, count) => sum + count, 0);

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused }) => {
          const icon = getTabIcon(route.name);
          return (
            <View style={[styles.tabIconContainer, focused && styles.tabIconActive]}>
              <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6 }]}>
                {icon}
              </Text>
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios'
            ? 60 + insets.bottom
            : 60 + (insets.bottom > 0 ? insets.bottom : 12),
          paddingBottom: Platform.OS === 'ios'
            ? 8 + insets.bottom
            : 8 + (insets.bottom > 0 ? insets.bottom : 8),
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
        },
        headerStyle: {
          backgroundColor: COLORS.white,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.textDark,
        },
        headerLeft: () => (
          <TouchableOpacity 
            style={styles.headerLeftContainer} 
            activeOpacity={0.8}
            onPress={handleAvatarPress}
          >
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: isMailConnected ? COLORS.success : COLORS.danger }
            ]} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity 
            style={styles.headerRightContainer} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ChatList')}
          >
            <Text style={styles.chatIcon}>💬</Text>
            {totalUnread > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Kanban" component={KanbanScreen} />
      <Tab.Screen name="Tasks List" component={ListScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Assignments" component={CustomerAssignmentsScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.white,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            color: COLORS.textDark,
          },
          headerTintColor: COLORS.primary,
        }}
      >
        {token == null ? (
          // Authentication Screens
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ headerShown: false }}
            />
          </>
        ) : (
          // App main Tab screens and deep stack screens
          <>
            <Stack.Screen 
              name="Main" 
              component={TabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="InquiryDetails" 
              component={InquiryDetailsScreen} 
              options={{ title: 'Inquiry Details' }}
            />
            <Stack.Screen 
              name="ChatList" 
              component={ChatListScreen} 
              options={{ 
                title: 'Team Chat',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen 
              name="DirectChat" 
              component={DirectChatScreen} 
              options={({ route }) => ({ 
                title: route.params?.user?.name || 'Direct Chat',
                headerBackTitleVisible: false,
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tabIconActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  tabIcon: {
    fontSize: 20,
  },
  headerLeftContainer: {
    marginLeft: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  headerAvatarText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  headerRightContainer: {
    marginRight: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  chatIcon: {
    fontSize: 22,
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  chatBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
});

export default AppNavigator;
