import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medishare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalizes errors so components can just read err.message for display.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || 'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
