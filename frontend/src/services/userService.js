import api from './api';

export const userService = {
  getAll: async () => {
    const response = await api.get('/users/'); // Adjust path to match your FastAPI router
    return response.data;
  },
  create: async (userData) => {
    const response = await api.post('/users/', userData);
    return response.data;
  }
};