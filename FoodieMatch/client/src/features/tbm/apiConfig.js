import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://your-production-tbm-api-url' // TODO: Add production URL
  : 'http://localhost:5287';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default apiClient;