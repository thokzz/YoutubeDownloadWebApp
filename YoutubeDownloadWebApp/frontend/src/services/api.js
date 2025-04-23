// /scripts/downloaderapp/frontend/src/services/api.js
import axios from 'axios';

const API_URL = 'http://10.0.0.98:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const login = (username, password) => {
  return api.post('/login', { username, password });
};

// Users API
export const getUsers = () => {
  return api.get('/users');
};

export const createUser = (userData) => {
  return api.post('/users', userData);
};

export const deleteUser = (userId) => {
  return api.delete(`/users/${userId}`);
};

// Downloads API
export const startDownloads = (urls, targetPaths) => {
  return api.post('/downloads', { urls, targetPaths });
};

export const getDownloads = () => {
  return api.get('/downloads');
};

export const getAllDownloads = () => {
  return api.get('/downloads/all');
};

export const getDownloadStatus = (downloadId) => {
  return api.get(`/downloads/${downloadId}`);
};

export const cancelDownload = (downloadId) => {
  return api.post(`/downloads/${downloadId}/cancel`);
};

export default api;
