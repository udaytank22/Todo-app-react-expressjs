import apiClient from './apiClient';

export const groupService = {
  getGroups: async () => {
    const response = await apiClient.get('/api/groups');
    return response.data;
  },

  createGroup: async (name) => {
    const response = await apiClient.post('/api/groups', { name });
    return response.data;
  },

  updateGroup: async (id, name) => {
    const response = await apiClient.put(`/api/groups/${id}`, { name });
    return response.data;
  },

  deleteGroup: async (id) => {
    const response = await apiClient.delete(`/api/groups/${id}`);
    return response.data;
  },

  getTeams: async () => {
    const response = await apiClient.get('/api/teams');
    return response.data;
  },

  createTeam: async (name) => {
    const response = await apiClient.post('/api/teams', { name });
    return response.data;
  },

  updateTeam: async (id, name) => {
    const response = await apiClient.put(`/api/teams/${id}`, { name });
    return response.data;
  },

  deleteTeam: async (id) => {
    const response = await apiClient.delete(`/api/teams/${id}`);
    return response.data;
  },
};
