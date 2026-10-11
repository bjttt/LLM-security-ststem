import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error);
  }
);

export const KBApi = {
  getStats: () => api.get('/kb/stats'),
  getAll: () => api.get('/kb/'),
  add: (data) => api.post('/kb/', data),
  update: (id, data) => api.put(`/kb/${id}`, data),
  delete: (id) => api.delete(`/kb/${id}`),
  upload: (formData) => api.post('/kb/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const ConfigApi = {
  getState: () => api.get('/config/state'),
  updateKey: (provider, apiKey) => api.post('/config/key', { provider, api_key: apiKey }),
  updateModel: (modelName) => api.post('/config/model', { current_model: modelName }),
  updateEmbeddingModel: (modelName) => api.post('/config/embedding-model', { model_name: modelName }),
  updateRerankerModel: (modelName) => api.post('/config/reranker-model', { model_name: modelName })
};

export const AuditApi = {
  auditNormal: (data) => api.post('/audit/', data)
};

export const QAApi = {
  qaNormal: (data) => api.post('/qa/', data)
};

export default api;
