import api from './api';

export const transactionService = {
  // Fetch all transactions
  getAll: async (filters) => {
    const response = await api.get(`/transactions/`, {
      params: { user_id: filters.userId ? parseInt(filters.userId) : undefined, month: filters.month, 
        year: filters.year,
        start_date: filters.start,
        end_date: filters.end }
    });
    return response.data;
  },

  // Add a new transaction (Income, Expense, or Transfer)
  create: async (transactionData) => {
    const response = await api.post('/transactions/', transactionData);
    return response.data;
  },
  update: async (id, transactionData) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },

  // Get metadata for dropdowns (Categories and Accounts)
  getMetadata: async () => {
    const [categories, accounts] = await Promise.all([
      api.get('/categories/'),
      api.get('/accounts/')
    ]);
    return { 
      categories: categories.data, 
      accounts: accounts.data 
    };
  }
};