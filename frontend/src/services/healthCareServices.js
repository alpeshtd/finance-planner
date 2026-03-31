import api from './api';

export const healthCareServices = {
    //   getAll: async () => {
    //     const response = await api.get('/accounts/');
    //     return response.data;
    //   },
    uploadReport: async (formdata) => {
        const response = await api.post('/upload-medical/', formdata, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },
    getAllRecords: async ({ searchTerm, critical }) => {
        const response = await api.get('/medical-reports/', {
            params: {
                search_term: searchTerm,
                critical: critical
            }
        });
        return response.data;
    },
    getDiabetesRecords: async ({ period = 'month', startDate, endDate, patientName, readingType }) => {
        const response = await api.get('/diabetes-records/', {
            params: {
                period,
                start_date: startDate,
                end_date: endDate,
                patient_name: patientName,
                reading_type: readingType,
            }
        });
        return response.data;
    },
    addDiabetesRecord: async (payload) => {
        const response = await api.post('/diabetes-records/', payload);
        return response.data;
    },
    deleteDiabetesRecord: async (id) => {
        const response = await api.delete(`/diabetes-records/${id}`);
        return response.data;
    },
    deleteRecord: async (id) => {
        const response = await api.delete(`/medical-reports/${id}`);
        return response.data;
    }
};