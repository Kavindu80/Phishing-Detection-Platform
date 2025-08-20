import { useState, useEffect } from 'react';
import apiService from '../../services/api';

const ModelStatusNotification = () => {
  const [modelStatus, setModelStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModelStatus = async () => {
      try {
        setLoading(true);
        const status = await apiService.checkModelStatus();
        setModelStatus(status);
      } catch (error) {
        console.error('Error fetching model status:', error);
        // Assume model is not available on error
        setModelStatus({ model_loaded: false, fallback_mode: true });
      } finally {
        setLoading(false);
      }
    };

    fetchModelStatus();
    // Refresh status every 5 minutes
    const interval = setInterval(fetchModelStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading || !modelStatus) {
    return null;
  }

  // If model is working properly, don't show anything
  if (modelStatus.model_loaded && !modelStatus.fallback_mode) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            ML model is not loaded. The system will use rule-based detection, which may be less accurate.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelStatusNotification; 