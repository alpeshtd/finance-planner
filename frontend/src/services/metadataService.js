import api from './api';

export const metadataService = {
  getEnums: async () => {
    const response = await api.get('/metadata/enums');
    return response.data;
  }
};