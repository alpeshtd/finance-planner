import api from './api';

export const milestoneService = {
  getAll: async () => {
    const response = await api.get('/milestones/status');
    return response.data;
  },
  create: async (milestoneData) => {
    const response = await api.post('/milestones', milestoneData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/milestones/${id}`);
    return response.data;
  }
};
