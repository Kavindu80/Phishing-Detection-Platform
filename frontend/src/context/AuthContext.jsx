import { useState, useEffect } from 'react';
import { AuthContext } from './auth-context';
import apiService from '../services/api';
import cacheService from '../services/cacheService';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Clear any lingering analytics refresh flags when app initializes
    try {
      sessionStorage.removeItem('analytics_needs_refresh');
      sessionStorage.removeItem('force_immediate_refresh');
      sessionStorage.removeItem('last_scan_time');
      sessionStorage.removeItem('last_scan_id');
      sessionStorage.removeItem('last_scan_verdict');
    } catch {
      // Ignore sessionStorage errors (e.g., in private mode)
    }

    // Check if user data exists in localStorage
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('User loaded from localStorage:', parsedUser.username);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
  }, []);
  
  const login = async (username, password) => {
    try {
      console.log('Attempting login for:', username);
      const response = await apiService.login(username, password);
      console.log('Login successful:', response.user.username);
      setUser(response.user);
      setIsAuthenticated(true);

      // Clear analytics refresh flags so a new session starts clean
      try {
        sessionStorage.removeItem('analytics_needs_refresh');
        sessionStorage.removeItem('force_immediate_refresh');
        sessionStorage.removeItem('last_scan_time');
        sessionStorage.removeItem('last_scan_id');
        sessionStorage.removeItem('last_scan_verdict');
      } catch {
        // Ignore sessionStorage errors
      }

      // Critical: clear Gmail connection and inbox caches so sessions don't leak across users
      try {
        cacheService.clearCache('gmail_connection');
        cacheService.clearCache(cacheService.CACHE_KEYS.INBOX_EMAILS);
        sessionStorage.removeItem('last_inbox_update');
      } catch {
        // Ignore sessionStorage errors
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  
  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };
  
  const logout = () => {
    console.log('Logging out user');
    apiService.logout();
    setUser(null);
    setIsAuthenticated(false);

    // Clear Gmail caches on logout to prevent next user seeing previous inbox
    try {
      cacheService.clearCache('gmail_connection');
      cacheService.clearCache(cacheService.CACHE_KEYS.INBOX_EMAILS);
      sessionStorage.removeItem('last_inbox_update');
    } catch {
      // Ignore sessionStorage errors
    }
  };
  
  const updateProfile = async (userId, userData) => {
    try {
      const updatedUser = await apiService.updateUser(userId, userData);
      setUser({ ...user, ...updatedUser });
      // Update stored user data
      localStorage.setItem('user', JSON.stringify({ ...user, ...updatedUser }));
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };
  
  const value = {
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    login,
    register,
    logout,
    updateProfile
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 