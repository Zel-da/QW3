import axios from 'axios';

// Use relative path to use the same host and port as the frontend
// This works with Vite's proxy and Replit's environment
const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default apiClient;