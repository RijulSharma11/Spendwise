import axios from 'axios';

const api = axios.create({
  baseURL: '',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/api/auth/login', data),
  register: (data) => api.post('/api/auth/register', data),
  getMe: () => api.get('/api/auth/me'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
  updatePassword: (data) => api.put('/api/auth/password', data),
  seedDemoData: () => api.post('/api/auth/seed-demo'),
  resetData: () => api.delete('/api/auth/reset-data'),
  logout: () => api.post('/api/auth/logout'),
};

export const transactionsAPI = {
  getAll: (params) => api.get('/api/transactions', { params }),
  create: (data) => api.post('/api/transactions', data),
  update: (id, data) => api.put(`/api/transactions/${id}`, data),
  delete: (id) => api.delete(`/api/transactions/${id}`),
  batchDelete: (ids) => api.post('/api/transactions/batch-delete', { ids }),
};

export const analyticsAPI = {
  getSummary: () => api.get('/api/analytics/summary'),
  getCategoryBreakdown: () => api.get('/api/analytics/category-breakdown'),
  getMonthlyTrend: () => api.get('/api/analytics/monthly-trend'),
  getInsights: () => api.get('/api/analytics/insights'),
  getReports: (period = '6m') => api.get('/api/analytics/reports', { params: { period } }),
};

export const budgetsAPI = {
  getAll: (monthYear) => api.get('/api/budgets', { params: monthYear ? { monthYear } : {} }),
  create: (data) => api.post('/api/budgets', data),
  delete: (id) => api.delete(`/api/budgets/${id}`),
};

export const categoriesAPI = {
  getAll: () => api.get('/api/categories'),
  create: (data) => api.post('/api/categories', data),
  delete: (id) => api.delete(`/api/categories/${id}`),
};

export const exportCSVAPI = (params) =>
  api.get('/api/export/csv', { params, responseType: 'blob' });

export default api;
