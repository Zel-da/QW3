const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://192.68.10.249:8080'
  : 'http://192.68.10.249:8080';

export default API_BASE_URL;
