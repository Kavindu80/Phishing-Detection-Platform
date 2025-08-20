import { useState, useEffect } from 'react';
import { FiInfo, FiCpu, FiCheck, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import apiService from '../../services/api';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

const ModelInfoPanel = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchModelInfo = async () => {
      setLoading(true);
      try {
        const status = await apiService.checkModelStatus();
        setModelInfo(status);
        setError(null);
      } catch (err) {
        console.error('Error fetching model info:', err);
        setError('Could not load model information');
      } finally {
        setLoading(false);
      }
    };

    fetchModelInfo();
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <div className="flex justify-center items-center p-4">
          <Spinner size="md" />
          <span className="ml-2 text-gray-600">Loading model information...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 bg-red-50 border-red-200">
        <div className="p-4 flex items-start">
          <FiAlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-medium text-red-800">Model Information Unavailable</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!modelInfo) {
    return null;
  }

  const getStatusIcon = () => {
    if (modelInfo.model_loaded) {
      return <FiCheck className="text-green-500 mr-2 flex-shrink-0" />;
    } else {
      return <FiAlertTriangle className="text-amber-500 mr-2 flex-shrink-0" />;
    }
  };

  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FiCpu className="text-primary-500 mr-2" />
            <h3 className="font-medium text-gray-900">Machine Learning Model</h3>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        <div className="mt-3 flex items-center">
          {getStatusIcon()}
          <span className={modelInfo.model_loaded ? 'text-green-700' : 'text-amber-700'}>
            {modelInfo.model_loaded ? 'Model loaded and active' : 'Model not loaded'}
          </span>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-medium">Version:</span> {modelInfo.model_version || 'Unknown'}
            </div>
            {modelInfo.last_loaded && (
              <div>
                <span className="font-medium">Last Loaded:</span> {new Date(modelInfo.last_loaded).toLocaleString()}
              </div>
            )}
            {modelInfo.model_type && (
              <div>
                <span className="font-medium">Model Type:</span> {modelInfo.model_type}
              </div>
            )}
            {modelInfo.vocabulary_size && (
              <div>
                <span className="font-medium">Vocabulary Size:</span> {modelInfo.vocabulary_size.toLocaleString()} features
              </div>
            )}

            {modelInfo.top_phishing_indicators && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-1">Top Phishing Indicators</h4>
                <div className="bg-gray-50 p-2 rounded border border-gray-200 max-h-36 overflow-y-auto">
                  {Object.entries(modelInfo.top_phishing_indicators)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([term, weight]) => (
                      <div key={term} className="flex justify-between text-xs py-1">
                        <code className="bg-gray-100 px-1 rounded">{term}</code>
                        <span className="font-mono">{parseFloat(weight).toFixed(4)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="pt-2 text-gray-500 text-xs italic">
              This model analyzes email content to identify potential phishing attempts based on language patterns, suspicious URLs, and other indicators.
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ModelInfoPanel; 