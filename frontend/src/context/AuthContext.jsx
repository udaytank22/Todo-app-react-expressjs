import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import { setAuthFailureHandler } from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derive a dummy token value from user state to keep backward compatibility with the existing frontend
  const token = user ? 'cookie-authenticated' : null;

  // Load user profile on mount using the auth cookie
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await authService.getCurrentUser();
        setUser(data);
      } catch (error) {
        console.log('No active session or session expired:', error.message);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Set up auth failure callback for response interceptor
  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
    });
    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      const { user: receivedUser } = data;
      setUser(receivedUser);
      return { success: true };
    } catch (error) {
      console.error('Login request failed:', error.response?.data?.error || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to authenticate. Please check your credentials.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setIsLoading(true);
    try {
      await authService.register(name, email, password, role);
      return { success: true };
    } catch (error) {
      console.error('Registration request failed:', error.response?.data?.error || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout request failed:', err.message);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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

