import api from './api';

export const budgetService = {
  /**
   * Fetches the complete budget engine data from Python.
   * Calculates income from savings and aggregates spending by root category.
   */
  // Correct: spreads the properties into individual params
    getMonthlySummary: async (filters) => {
    // filters is { month: 3, year: 2026 }
    const response = await api.get('/budget/summary', { 
        params: { 
        month: filters.month, 
        year: filters.year,
        start_date: filters.start,
        end_date: filters.end,
        user_id: filters.user_id
        } 
    });
    return response.data;
    },

  /**
   * Fetches a specific breakdown for a root category if needed.
   */
  getCategoryDetails: async (rootId, month, year) => {
    const response = await api.get(`/budget/details/${rootId}`, {
      params: { month, year }
    });
    return response.data;
  }
};