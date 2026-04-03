import axios from 'axios';

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      window.location.href = '/login/customer';
    }
    return Promise.reject(error);
  }
);

// ==================== Auth API ====================
export const authAPI = {
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
};

// ==================== Ticket API ====================
export const ticketAPI = {
  getAll: (params) => api.get('/tickets/', { params }),
  getOne: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets/', data),
  update: (id, data) => api.put(`/tickets/${id}`, data),
  delete: (id) => api.delete(`/tickets/${id}`),
  getReplies: (id) => api.get(`/tickets/${id}/replies`),
  addReply: (id, message, senderType) =>
    api.post(`/tickets/${id}/replies`, { ticket_id: id, message, sender_type: senderType }),
  getAnalytics: () => api.get('/tickets/analytics'),
};

// ==================== Agent API ====================
export const agentAPI = {
  getAll: () => api.get('/agents/'),
  create: (data) => api.post('/agents/', data),
  updateStatus: (id, status) => api.put(`/agents/${id}/status?status=${status}`),
  getQueue: () => api.get('/agents/queue'),
  assignTicket: (ticketId, agentId) => api.put(`/agents/assign/${ticketId}/${agentId}`),
  suggestReply: (ticketId) => api.post(`/agents/suggest-reply/${ticketId}`),
  triageTicket: (ticketId) => api.post(`/agents/triage/${ticketId}`),
  resolveTicket: (ticketId, resolution) =>
    api.post(`/agents/resolve/${ticketId}?resolution=${encodeURIComponent(resolution)}`),
  instantCategorize: (text) => api.post('/agents/categorize-instant', { message: text, context: text }),
  chat: (data) => api.post('/agents/chat', data),
  autoSolve: (ticketId) => api.post(`/agents/auto-solve/${ticketId}`),
  confirmResolved: (ticketId, satisfied) =>
    api.post(`/agents/confirm-resolved/${ticketId}?satisfied=${satisfied}`),
};

// ==================== User API ====================
export const userAPI = {
  getAll: (params) => api.get('/users/', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  getMyStats: () => api.get('/users/stats/me'),
  getAnalytics: () => api.get('/users/analytics/summary'),
};

// ==================== Category API ====================
export const categoryAPI = {
  getAll: () => api.get('/categories/'),
  getSubcategories: (id) => api.get(`/categories/${id}/subcategories`),
  getDepartments: () => api.get('/categories/departments'),
};

// ==================== FAQ API ====================
export const faqAPI = {
  getAll: (params) => api.get('/faq/', { params }),
  getOne: (id) => api.get(`/faq/${id}`),
  create: (data, categoryId) => api.post(`/faq/${categoryId ? `?category_id=${categoryId}` : ''}`, data),
  update: (id, data) => api.put(`/faq/${id}`, data),
  delete: (id) => api.delete(`/faq/${id}`),
  generateFromTicket: (ticketId) => api.post(`/faq/generate-from-ticket/${ticketId}`),
  bulkGenerate: (limit = 10) => api.post(`/faq/bulk-generate?limit=${limit}`),
  incrementView: (id) => api.post(`/faq/${id}/increment-view`),
};

// ==================== Analytics API ====================
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTicketTrends: (days = 30) => api.get(`/analytics/ticket-trends?days=${days}`),
  getAgentPerformance: (agentId) => api.get(`/analytics/agent-performance/${agentId}`),
  getCategoryStats: () => api.get('/analytics/category-stats'),
};

export default api;