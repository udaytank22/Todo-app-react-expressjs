import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { encrypt, decrypt } from '../utils/encryption';

const AuthContext = createContext(null);

// Enable withCredentials globally so axios automatically sends and receives cookies
axios.defaults.withCredentials = true;

// Helper to extract a cookie by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derive a dummy token value from user state to keep backward compatibility with the existing frontend
  const token = user ? 'cookie-authenticated' : null;

  // Load user profile on mount using the auth cookie
  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
      } catch (error) {
        console.log('No active session or session expired:', error.message);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Set up Axios interceptors for encryption, token refresh, and CSRF protection
  useEffect(() => {
    // Request interceptor: handles encryption and attaches CSRF token
    const requestInterceptor = axios.interceptors.request.use((config) => {
      // 1. Attach client headers
      config.headers['x-client-device'] = 'mobile';
      config.headers['x-client-encrypted'] = 'true';

      // 2. Attach CSRF token header for state-changing requests
      const csrfToken = getCookie('csrfToken');
      if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
        config.headers['x-csrf-token'] = csrfToken;
      }

      // 3. Encrypt request data if applicable
      if (config.data && !(config.data instanceof FormData)) {
        try {
          const jsonStr = JSON.stringify(config.data);
          config.data = { encryptedData: encrypt(jsonStr) };
        } catch (err) {
          console.error('Failed to encrypt request data', err);
        }
      }
      return config;
    });

    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, newToken = null) => {
      failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(newToken);
        }
      });
      failedQueue = [];
    };

    // Response interceptor: handles decryption and token rotation (401 token_expired)
    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        if (response.data && response.data.encryptedData) {
          try {
            const decryptedStr = decrypt(response.data.encryptedData);
            if (decryptedStr) {
              response.data = JSON.parse(decryptedStr);
            }
          } catch (err) {
            console.error('Failed to decrypt response data', err);
          }
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Decrypt error response if encrypted
        if (error.response && error.response.data && error.response.data.encryptedData) {
          try {
            const decryptedStr = decrypt(error.response.data.encryptedData);
            if (decryptedStr) {
              error.response.data = JSON.parse(decryptedStr);
            }
          } catch (err) {
            console.error('Failed to decrypt error response data', err);
          }
        }

        // Check if error is 401 token_expired and we haven't retried this request yet
        if (
          error.response &&
          error.response.status === 401 &&
          error.response.data?.error === 'token_expired' &&
          !originalRequest._retry
        ) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => {
                return axios(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          return new Promise((resolve, reject) => {
            axios
              .post('/api/auth/refresh')
              .then(() => {
                processQueue(null, 'refreshed');
                resolve(axios(originalRequest));
              })
              .catch((refreshError) => {
                processQueue(refreshError, null);
                setUser(null);
                reject(refreshError);
              })
              .then(() => {
                isRefreshing = false;
              });
          });
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { user: receivedUser } = response.data;
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
      await axios.post('/api/auth/register', { name, email, password, role });
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
      await axios.post('/api/auth/logout');
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
