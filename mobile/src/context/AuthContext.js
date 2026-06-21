import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMailConnected, setIsMailConnected] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const activeChatUserIdRef = useRef(null);

  // Initialize and load token on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      let storedToken = null;
      let storedUser = null;
      try {
        storedToken = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          storedUser = JSON.parse(userStr);
        }
      } catch (e) {
        console.error('[Auth Context] Failed to load data from storage:', e.message);
      }

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const checkMailStatus = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.get('/api/emails/status');
      setIsMailConnected(response.data.connected || response.data.demoMode || false);
    } catch (err) {
      console.error('[Auth Context] Failed to check mail status:', err.message);
    }
  }, [token]);

  const setActiveChatUser = (id) => {
    activeChatUserIdRef.current = id;
    if (id) {
      setUnreadCounts((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  // Connect socket when token changes and check mail status
  useEffect(() => {
    let active = true;
    let socketCallback = null;

    if (token) {
      checkMailStatus();
      const statusInterval = setInterval(checkMailStatus, 30000);

      initSocket().then(() => {
        if (!active) return;
        
        const { onSocketEvent } = require('../services/socket');
        socketCallback = (message) => {
          if (message && message.senderId) {
            if (activeChatUserIdRef.current === message.senderId) {
              return;
            }
            if (message.senderId !== user?.id) {
              setUnreadCounts((prev) => ({
                ...prev,
                [message.senderId]: (prev[message.senderId] || 0) + 1,
              }));
            }
          }
        };

        onSocketEvent('receive_direct_message', socketCallback);
      }).catch((err) => {
        console.error('[Auth Context] Socket init failed:', err.message);
      });

      return () => {
        active = false;
        clearInterval(statusInterval);
        if (socketCallback) {
          const { offSocketEvent } = require('../services/socket');
          offSocketEvent('receive_direct_message', socketCallback);
        }
        disconnectSocket();
      };
    } else {
      setIsMailConnected(false);
      setUnreadCounts({});
      disconnectSocket();
    }
  }, [token, user, checkMailStatus]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // Body will be auto-encrypted by our API interceptor
      const response = await api.post('/api/auth/login', { email, password });
      
      // Response will be auto-decrypted by our API interceptor
      const { token: receivedToken, refreshToken: receivedRefreshToken, user: receivedUser } = response.data;
      
      await AsyncStorage.setItem('token', receivedToken);
      await AsyncStorage.setItem('refreshToken', receivedRefreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (error) {
      console.error('[Auth Context] Login request failed:', error.response?.data?.error || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to authenticate. Please check your credentials.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setIsLoading(true);
    try {
      // Body will be auto-encrypted by our API interceptor
      await api.post('/api/auth/register', { name, email, password, role });
      return { success: true };
    } catch (error) {
      console.error('[Auth Context] Registration request failed:', error.response?.data?.error || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      if (storedRefreshToken) {
        // Send request to invalidate token
        await api.post('/api/auth/logout', { refreshToken: storedRefreshToken }).catch(() => {});
      }
    } catch (e) {
      console.error('[Auth Context] Logout endpoint error:', e.message);
    } finally {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isMailConnected, unreadCounts, checkMailStatus, setActiveChatUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
