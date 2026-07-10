import apiClient from './apiClient';

export const notificationService = {
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/api/notifications', { params });
    return response.data;
  },

  markNotificationRead: async (id) => {
    const response = await apiClient.patch(`/api/notifications/${id}/read`);
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await apiClient.patch('/api/notifications/read-all');
    return response.data;
  },
};
