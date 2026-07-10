import apiClient from './apiClient';

export const taskService = {
  getTasks: async (params = {}) => {
    const response = await apiClient.get('/api/tasks', { params });
    return response.data;
  },

  getTask: async (id) => {
    const response = await apiClient.get(`/api/tasks/${id}`);
    return response.data;
  },

  updateTaskStatus: async (id, status) => {
    const response = await apiClient.patch(`/api/tasks/${id}/status`, { status });
    return response.data;
  },

  updateTask: async (id, payload) => {
    const response = await apiClient.put(`/api/tasks/${id}`, payload);
    return response.data;
  },

  deleteTask: async (id) => {
    const response = await apiClient.delete(`/api/tasks/${id}`);
    return response.data;
  },

  addComment: async (id, content) => {
    const response = await apiClient.post(`/api/tasks/${id}/comments`, { content });
    return response.data;
  },

  getEmailSyncStatus: async () => {
    const response = await apiClient.get('/api/emails/status');
    return response.data;
  },
};
