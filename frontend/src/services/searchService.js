import apiClient from './apiClient';

export const searchService = {
  searchInquiries: async (query) => {
    const response = await apiClient.get(`/api/search`, { params: { q: query } });
    return response.data;
  },
};
