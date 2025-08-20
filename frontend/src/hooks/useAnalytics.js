import { useContext } from 'react';
import AnalyticsContext from '../context/AnalyticsContext';

/**
 * Custom hook to access the analytics context
 * @returns {Object} The analytics context value
 */
export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

export default useAnalytics; 