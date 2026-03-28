import api from './api';

export const accountService = {
  getAll: async (userId) => {
    const url = userId ? `/accounts/${userId}` : '/accounts/';
    const response = await api.get(url);
    return response.data;
  },
  create: async (accountData) => {
    const response = await api.post('/accounts/', accountData);
    return response.data;
  },
  update: async (id, accountData) => {
    const response = await api.put(`/accounts/${id}`, accountData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  }
};