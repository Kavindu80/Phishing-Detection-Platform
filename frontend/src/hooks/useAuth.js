import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/auth-context';
import apiService from '../services/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check if we have a token in localStorage
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    const validateAuth = async () => {
      try {
        if (!token || !storedUser) {
          // No token or user data, clear any leftover state
          context.logout();
          setIsLoading(false);
          return;
        }
        
        // Parse stored user data
        const user = JSON.parse(storedUser);
        
        // Set user in context first to avoid flicker
        if (user && !context.user) {
          context.setUser(user);
          context.setIsAuthenticated(true);
        }
        
        // Validate token by calling getCurrentUser
        await apiService.getCurrentUser();
        // Token is valid, ensure authentication state is set
        context.setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth validation error:', error);
        // If token validation fails, logout
        context.logout();
      } finally {
        setIsLoading(false);
      }
    };
    
    validateAuth();
  }, [context]);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return { ...context, isLoading };
};

export default useAuth; 