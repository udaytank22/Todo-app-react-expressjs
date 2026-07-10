import apiClient from './apiClient';

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (name, email, password, role) => {
    const response = await apiClient.post('/api/auth/register', { name, email, password, role });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get('/api/auth/users');
    return response.data;
  },

  createUser: async (payload) => {
    const response = await apiClient.post('/api/auth/users', payload);
    return response.data;
  },

  updateUser: async (id, payload) => {
    const response = await apiClient.put(`/api/auth/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/api/auth/users/${id}`);
    return response.data;
  },

  bulkCreateUsers: async (payload) => {
    const response = await apiClient.post('/api/auth/users/bulk', payload);
    return response.data;
  },
};
