import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [token, setToken] = useState(localStorage.getItem('token'));
 const [isLoading, setIsLoading] = useState(true);

 // Synchronize axios defaults when token changes
 useEffect(() => {
 if (token) {
 localStorage.setItem('token', token);
 axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
 } else {
 localStorage.removeItem('token');
 delete axios.defaults.headers.common['Authorization'];
 }
 }, [token]);

 // Load user profile on mount if token exists
 useEffect(() => {
 const loadUser = async () => {
 if (!token) {
 setIsLoading(false);
 return;
 }

 try {
 const response = await axios.get('/api/auth/me');
 setUser(response.data);
 } catch (error) {
 console.error('Failed to load user profile:', error.message);
 // Token is invalid/expired
 setToken(null);
 setUser(null);
 } finally {
 setIsLoading(false);
 }
 };

 loadUser();
 }, [token]);

  // Set up Axios interceptors for handling token expiration and refreshing
  useEffect(() => {
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

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 token_expired and we haven't retried this request yet
        if (
          error.response &&
          error.response.status === 401 &&
          error.response.data?.error === 'token_expired' &&
          !originalRequest._retry
        ) {
          if (isRefreshing) {
            // Queue this request and wait for the refresh token call to finish
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((newToken) => {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return axios(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          return new Promise((resolve, reject) => {
            const storedRefreshToken = localStorage.getItem('refreshToken');
            
            if (!storedRefreshToken) {
              processQueue(new Error('No refresh token available'), null);
              setToken(null);
              setUser(null);
              localStorage.removeItem('refreshToken');
              reject(error);
              isRefreshing = false;
              return;
            }

            axios
              .post('/api/auth/refresh', { refreshToken: storedRefreshToken })
              .then(({ data }) => {
                const { token: newAccessToken, refreshToken: newRefreshToken } = data;
                
                // Save new tokens
                setToken(newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                
                // Update authorization header and process queue
                originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                processQueue(null, newAccessToken);
                
                resolve(axios(originalRequest));
              })
              .catch((refreshError) => {
                processQueue(refreshError, null);
                setToken(null);
                setUser(null);
                localStorage.removeItem('refreshToken');
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
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

 const login = async (email, password) => {
 setIsLoading(true);
 try {
 const response = await axios.post('/api/auth/login', { email, password });
 const { token: receivedToken, refreshToken: receivedRefreshToken, user: receivedUser } = response.data;
 localStorage.setItem('refreshToken', receivedRefreshToken);
 setToken(receivedToken);
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
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      axios.post('/api/auth/logout', { refreshToken: storedRefreshToken }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('refreshToken');
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
