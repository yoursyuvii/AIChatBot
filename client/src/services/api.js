// In client/src/services/api.js
import axios from 'axios';

// Define the root of the API URL separately. 
// This makes the baseURL construction more reliable.
const API_ROOT = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  // **THIS IS THE MAIN CHANGE**
  // Always append the /api prefix to the root URL.
  // This now works correctly for both local ('http://localhost:5000/api') 
  // and deployed ('https://your-app.onrender.com/api') environments.
  baseURL: `${API_ROOT}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
// This part is well-written and doesn't need changes.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
// This part is also well-written and doesn't need changes.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If token is invalid, remove it and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
