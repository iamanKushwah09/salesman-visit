import axios from 'axios';

// Resolve backend API URL dynamically based on environment
const getApiBaseUrl = () => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  const envServerUrl = import.meta.env.VITE_SERVER_URL;

  // 1. Explicit API URL provided
  if (envApiUrl && envApiUrl.trim()) {
    return envApiUrl.trim().replace(/\/+$/, '');
  }

  // 2. Server Root URL provided
  if (envServerUrl && envServerUrl.trim()) {
    const cleanUrl = envServerUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }

  // 3. Cloud / Production fallback: if running on a live domain (Render, Railway, custom domain), use origin
  if (
    typeof window !== 'undefined' &&
    window.location.origin &&
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1')
  ) {
    return `${window.location.origin}/api`;
  }

  // 4. Default local development server
  return 'http://localhost:5070/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('salesman_visit_token') ||
      localStorage.getItem('fieldpulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('salesman_visit_token');
      localStorage.removeItem('salesman_visit_user');
      localStorage.removeItem('fieldpulse_token');
      localStorage.removeItem('fieldpulse_user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
