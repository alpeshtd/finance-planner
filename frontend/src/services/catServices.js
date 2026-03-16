import api from './api';

export const categoryService = {
  getAll: async () => {
    const response = await api.get('/categories/');
    return response.data;
  },
  create: async (categoryData) => {
    const response = await api.post('/categories/', categoryData);
    return response.data;
  },
  update: async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  }
};