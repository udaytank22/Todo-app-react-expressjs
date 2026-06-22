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
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Custom vector shapes for tab icons (matching the designs in the image)
const renderCustomIcon = (routeName, color) => {
  switch (routeName) {
    case 'Dashboard':
      return (
        <View style={styles.gridIcon}>
          <View style={[styles.gridSquare, { borderColor: color }]} />
          <View style={[styles.gridSquare, { borderColor: color }]} />
          <View style={[styles.gridSquare, { borderColor: color }]} />
          <View style={[styles.gridSquare, { borderColor: color }]} />
        </View>
      );
    case 'Kanban':
      return (
        <View style={styles.kanbanIconContainer}>
          <View style={[styles.kanbanIcon, { borderColor: color }]}>
            <View style={[styles.kanbanClip, { backgroundColor: color }]} />
            <View style={[styles.kanbanLine, { backgroundColor: color, width: 10 }]} />
            <View style={[styles.kanbanLine, { backgroundColor: color, width: 8 }]} />
            <View style={[styles.kanbanLine, { backgroundColor: color, width: 6 }]} />
          </View>
        </View>
      );
    case 'Tasks':
      return (
        <View style={styles.tasksIcon}>
          <View style={styles.tasksRow}>
            <View style={[styles.tasksBullet, { backgroundColor: color }]} />
            <View style={[styles.tasksLine, { backgroundColor: color }]} />
          </View>
          <View style={styles.tasksRow}>
            <View style={[styles.tasksBullet, { backgroundColor: color }]} />
            <View style={[styles.tasksLine, { backgroundColor: color }]} />
          </View>
          <View style={styles.tasksRow}>
            <View style={[styles.tasksBullet, { backgroundColor: color }]} />
            <View style={[styles.tasksLine, { backgroundColor: color }]} />
          </View>
        </View>
      );
    case 'Alerts':
      return (
        <View style={styles.bellIcon}>
          <View style={[styles.bellCap, { backgroundColor: color }]} />
          <View style={[styles.bellBody, { borderColor: color }]} />
          <View style={[styles.bellBase, { backgroundColor: color }]} />
          <View style={[styles.bellClapper, { backgroundColor: color }]} />
        </View>
      );
    case 'Profile':
      return (
        <View style={[styles.profileIcon, { borderColor: color }]}>
          <View style={[styles.profileHead, { borderColor: color }]} />
          <View style={[styles.profileShoulders, { borderColor: color }]} />
        </View>
      );
    default:
      return null;
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
        tabBarIcon: ({ focused, color }) => {
          return (
            <View style={styles.tabIconWrapper}>
              {focused && <View style={styles.activeDot} />}
              <View style={styles.tabIconContainer}>
                {renderCustomIcon(route.name, color)}
              </View>
            </View>
          );
        },
        tabBarLabel: ({ focused, color }) => {
          return (
            <Text style={[
              styles.tabLabelText, 
              { color: color, fontWeight: focused ? 'bold' : 'normal' }
            ]}>
              {route.name}
            </Text>
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
            : 65 + (insets.bottom > 0 ? insets.bottom : 0),
          paddingBottom: Platform.OS === 'ios'
            ? 6 + insets.bottom
            : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
        },
        headerTitleAlign: 'left',
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
          fontSize: 20,
          color: COLORS.textDark,
          marginLeft: 8,
        },
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
      <Tab.Screen name="Tasks" component={ListScreen} />
      <Tab.Screen name="Alerts" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
            <Stack.Screen 
              name="CustomerAssignments" 
              component={CustomerAssignmentsScreen} 
              options={{ 
                title: 'Customer Assignments',
                headerBackTitleVisible: false,
              }}
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
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: -12,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 30,
  },
  tabLabelText: {
    fontSize: 10,
    marginTop: 0,
    textAlign: 'center',
  },
  // Custom drawn CSS outline icons
  gridIcon: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  gridSquare: {
    width: 8,
    height: 8,
    borderWidth: 2,
    borderRadius: 2.5,
  },
  kanbanIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanbanIcon: {
    width: 16,
    height: 19,
    borderWidth: 2,
    borderRadius: 3.5,
    paddingTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    position: 'relative',
  },
  kanbanClip: {
    width: 6,
    height: 2.5,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    position: 'absolute',
    top: 0,
  },
  kanbanLine: {
    height: 2,
    borderRadius: 1,
  },
  tasksIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    gap: 3.5,
  },
  tasksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tasksBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tasksLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  bellIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellCap: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginBottom: -1,
  },
  bellBody: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 0,
  },
  bellBase: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  bellClapper: {
    width: 4,
    height: 3,
    borderBottomLeftRadius: 1.5,
    borderBottomRightRadius: 1.5,
    marginTop: 1,
  },
  profileIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profileHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
    marginTop: 2,
  },
  profileShoulders: {
    width: 14,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    position: 'absolute',
    bottom: -4,
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
