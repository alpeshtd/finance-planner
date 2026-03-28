import api from './api';

export const authService = {
  login: async ({ email, password }) => {
    const response = await api.post('/users/login', { email, password });
    const { access_token } = response.data;
    localStorage.setItem('token', access_token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  isAuthenticated: () => {
    return Boolean(localStorage.getItem('token'));
  },

  getCurrentUser: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};
