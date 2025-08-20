import axios from 'axios';

// Base URL for the API
const API_BASE_URL = import.meta.env.MODE === 'production' 
  ? '/api' 
  : 'http://localhost:5000/api';

// Base API configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // No timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          console.log('Attempting to refresh token');
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data;
          localStorage.setItem('token', access_token);
          console.log('Token refreshed successfully');
          
          // Retry the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Only redirect if we're in a browser environment
        if (typeof window !== 'undefined') {
          console.log('Redirecting to login after failed token refresh');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API service object with methods for each endpoint
const apiService = {
  /**
   * Health check endpoint
   * @returns {Promise} API health status
   */
  checkHealth: async () => {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  /**
   * Scan an email for phishing
   * @param {string} emailText - The email content to scan
   * @param {string} language - The language code (default: 'auto')
   * @param {boolean} authenticated - Whether to use the authenticated endpoint
   * @returns {Promise} Scan results
   */
  scanEmail: async (emailText, language = 'auto', authenticated = false) => {
    try {
      const endpoint = authenticated ? '/scan/auth' : '/scan';
      const response = await api.post(endpoint, { emailText, language });
      
      // Set a flag to indicate analytics data needs refresh
      sessionStorage.setItem('analytics_needs_refresh', 'true');
      sessionStorage.setItem('last_scan_time', Date.now().toString());
      
      return response.data;
    } catch (error) {
      console.error('Email scan failed:', error);
      throw error;
    }
  },

  /**
   * Get scan history
   * @param {string} timeRange - Time range filter (7d, 30d, 90d, 1y, all)
   * @param {number} page - Page number
   * @param {number} limit - Number of items per page
   * @returns {Promise} Scan history
   */
  getScanHistory: async (timeRange = 'all', page = 1, limit = 10) => {
    try {
      // Add timestamp for cache busting
      const timestamp = Date.now();
      
      const response = await api.get('/history', {
        params: { 
          timeRange, 
          page, 
          limit,
          _t: timestamp, // Add cache-busting parameter
          no_cache: true
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch scan history:', error);
      throw error;
    }
  },

  /**
   * Get scan detail by ID
   * @param {string} scanId - Scan ID
   * @returns {Promise} Scan detail
   */
  getScanDetail: async (scanId) => {
    try {
      const response = await api.get(`/history/${scanId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch scan detail:', error);
      throw error;
    }
  },

  /**
   * Get analytics data for the dashboard
   * @param {string} timeRange - Time range filter (7d, 30d, 90d, 1y, all)
   * @returns {Promise} Analytics data
   */
  getAnalytics: async (timeRange = '30d') => {
    try {
      // Add a timestamp to prevent caching
      const timestamp = Date.now();
      
      const response = await api.get('/analytics', {
        params: { 
          timeRange,
          no_cache: true,
          _t: timestamp // Add cache-busting parameter
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw error;
    }
  },

  /**
   * Submit feedback on scan results
   * @param {string} scanId - ID of the scan
   * @param {boolean} isPositive - Whether the feedback is positive
   * @returns {Promise} Feedback submission result
   */
  submitFeedback: async (scanId, isPositive) => {
    try {
      const response = await api.post('/feedback', { scanId, isPositive });
      return response.data;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Registration result
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  /**
   * Login a user
   * @param {string} username - Username or email
   * @param {string} password - Password
   * @returns {Promise} Login result with tokens and user data
   */
  login: async (username, password) => {
    try {
      console.log('API Service: Attempting login for', username);
      const response = await api.post('/auth/login', { username, password });
      
      // Store tokens and user data
      const { access_token, refresh_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('API Service: Login successful for', user.username);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  /**
   * Logout the current user
   */
  logout: () => {
    console.log('API Service: Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  /**
   * Get the current user's profile
   * @returns {Promise} User profile data
   */
  getCurrentUser: async () => {
    try {
      console.log('API Service: Fetching current user');
      const response = await api.get('/auth/me');
      console.log('API Service: Current user fetched successfully');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  },

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise} Updated user data
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/auth/user/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },
  
  /**
   * Check the status of the ML model
   * @returns {Promise} Model status information
   */
  checkModelStatus: async () => {
    try {
      const response = await api.get('/model/status');
      return response.data;
    } catch (error) {
      console.error('Failed to check model status:', error);
      throw error;
    }
  },

  /**
   * Get supported languages for translation
   * @returns {Promise} Supported languages list
   */
  getSupportedLanguages: async () => {
    try {
      const response = await api.get('/languages');
      return response.data;
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      // Return fallback languages
      return {
        languages: {
          'auto': 'Auto-detect',
          'en': 'English',
          'es': 'Spanish',
          'fr': 'French',
          'de': 'German',
          'zh': 'Chinese',
          'ru': 'Russian',
          'ar': 'Arabic',
          'pt': 'Portuguese',
          'it': 'Italian',
          'ja': 'Japanese',
          'ko': 'Korean',
          'nl': 'Dutch',
          'hi': 'Hindi',
          'tr': 'Turkish'
        }
      };
    }
  },

  /**
   * Check if user is connected to Gmail
   * @returns {Promise} Connection status
   */
  checkGmailConnection: async () => {
    try {
      const response = await api.get('/inbox/connection');
      return response.data;
    } catch (error) {
      console.error('Failed to check Gmail connection:', error);
      throw error;
    }
  },

  /**
   * Connect to Gmail using OAuth
   * @returns {Promise} Connection status
   */
  connectGmail: async () => {
    try {
      const response = await api.get('/inbox/connect');
      return response.data;
    } catch (error) {
      console.error('Failed to start Gmail connection:', error);
      throw error;
    }
  },

  /**
   * Fetch emails from Gmail
   * @param {Object} options - Filter options
   * @param {number} options.limit - Maximum number of emails to fetch
   * @param {string} options.query - Gmail search query
   * @param {boolean} options.skipIfCached - Skip request if cached data exists
   * @returns {Promise} List of emails
   */
  fetchGmailEmails: async (options = {}) => {
    try {
      const { limit = 50, query = '', skipIfCached = false } = options;
      
      // Add cache busting
      const timestamp = Date.now();
      
      const response = await api.get('/inbox/emails', {
        params: { 
          limit, 
          query,
          _t: timestamp,
          skipIfCached: skipIfCached ? 'true' : 'false'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch Gmail emails:', error);
      throw error;
    }
  },

  /**
   * Get a single email by ID
   * @param {string} emailId - Gmail email ID
   * @returns {Promise} Email data
   */
  getEmailById: async (emailId) => {
    try {
      const response = await api.get(`/inbox/emails/${emailId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch email:', error);
      throw error;
    }
  },

  /**
   * Scan a specific Gmail email
   * @param {string} emailId - Gmail email ID
   * @returns {Promise} Scan results
   */
  scanGmailEmail: async (emailId) => {
    try {
      const response = await api.post(`/inbox/scan/${emailId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to scan Gmail email:', error);
      throw error;
    }
  },

  /**
   * Get scan results for a Gmail email
   * @param {string} emailId - Gmail email ID
   * @returns {Promise} Scan results
   */
  getEmailScanResult: async (emailId) => {
    try {
      const response = await api.get(`/inbox/scan-result/${emailId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get scan result:', error);
      throw error;
    }
  },

  /**
   * Disconnect Gmail for current user
   * @returns {Promise} Disconnection result
   */
  disconnectGmail: async () => {
    try {
      const response = await api.post('/inbox/disconnect');
      return response.data;
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error);
      throw error;
    }
  }
};

export default apiService; 