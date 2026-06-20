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

 const login = async (email, password) => {
 setIsLoading(true);
 try {
 const response = await axios.post('/api/auth/login', { email, password });
 const { token: receivedToken, user: receivedUser } = response.data;
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

 const logout = () => {
 setToken(null);
 setUser(null);
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
