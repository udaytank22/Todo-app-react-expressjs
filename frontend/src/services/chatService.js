import apiClient from './apiClient';

export const chatService = {
  getChatHistory: async (userId) => {
    const response = await apiClient.get(`/api/chat/messages/${userId}`);
    return response.data;
  },
};
