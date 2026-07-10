import apiClient from './apiClient';

export const customerService = {
  getRules: async () => {
    const response = await apiClient.get('/api/customer-assignments');
    return response.data;
  },

  createRule: async (payload) => {
    const response = await apiClient.post('/api/customer-assignments', payload);
    return response.data;
  },

  createRuleFromInquiry: async (payload) => {
    const response = await apiClient.post('/api/assignments', payload);
    return response.data;
  },

  updateRule: async (id, payload) => {
    const response = await apiClient.put(`/api/customer-assignments/${id}`, payload);
    return response.data;
  },

  deleteRule: async (id) => {
    const response = await apiClient.delete(`/api/customer-assignments/${id}`);
    return response.data;
  },

  bulkCreateRules: async (payload) => {
    const response = await apiClient.post('/api/customer-assignments/bulk', payload);
    return response.data;
  },

  getDashboardReports: async () => {
    const response = await apiClient.get('/api/reports/dashboard');
    return response.data;
  },
};
