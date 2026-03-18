import api from './api';

export const utilityServices = {
    //   getAll: async () => {
    //     const response = await api.get('/accounts/');
    //     return response.data;
    //   },
    create: async (accountData) => {
        const response = await api.post('/read-statement/', accountData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },
};