import React, { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';
import Card from '../common/Card';
import Button from '../common/Button';
import apiService from '../../services/api';

const BackendIntegrationTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState('pending');

  const tests = [
    { 
      name: 'API Health Check', 
      endpoint: 'checkHealth',
      description: 'Verify backend API is running'
    },
    { 
      name: 'Analytics Data', 
      endpoint: 'getAnalytics',
      description: 'Fetch dashboard analytics data'
    },
    { 
      name: 'Scan History', 
      endpoint: 'getScanHistory',
      description: 'Get recent scan activity'
    },
    { 
      name: 'Model Status', 
      endpoint: 'checkModelStatus',
      description: 'Check ML model status'
    },
    { 
      name: 'Quick Scan Test', 
      endpoint: 'scanEmail',
      description: 'Test email scanning functionality',
      params: ['This is a test email content', 'en', false]
    }
  ];

  const runTest = async (test) => {
    try {
      let result;
      if (test.params) {
        result = await apiService[test.endpoint](...test.params);
      } else if (test.endpoint === 'getScanHistory') {
        result = await apiService[test.endpoint]('7d', 1, 5);
      } else if (test.endpoint === 'getAnalytics') {
        result = await apiService[test.endpoint]('30d');
      } else {
        result = await apiService[test.endpoint]();
      }
      
      return {
        status: 'success',
        data: result,
        message: 'Test passed successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        message: `Test failed: ${error.message}`
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    const results = {};
    let successCount = 0;

    for (const test of tests) {
      setTestResults(prev => ({
        ...prev,
        [test.name]: { status: 'running', message: 'Testing...' }
      }));

      const result = await runTest(test);
      results[test.name] = result;
      
      if (result.status === 'success') {
        successCount++;
      }

      setTestResults(prev => ({ ...prev, ...results }));
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const allPassed = successCount === tests.length;
    setOverallStatus(allPassed ? 'success' : 'error');
    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <FiCheckCircle className="h-5 w-5 text-success-500" />;
      case 'error':
        return <FiXCircle className="h-5 w-5 text-danger-500" />;
      case 'running':
        return <FiClock className="h-5 w-5 text-warning-500 animate-spin" />;
      default:
        return <FiClock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'border-success-200 bg-success-50';
      case 'error':
        return 'border-danger-200 bg-danger-50';
      case 'running':
        return 'border-warning-200 bg-warning-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card title="Backend Integration Test" className="max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Overall Status */}
        <div className={`p-4 rounded-lg border ${getStatusColor(overallStatus)}`}>
          <div className="flex items-center space-x-3">
            {getStatusIcon(overallStatus)}
            <div>
              <h3 className="font-semibold">
                {overallStatus === 'success' && 'All Tests Passed!'}
                {overallStatus === 'error' && 'Some Tests Failed'}
                {overallStatus === 'running' && 'Running Tests...'}
                {overallStatus === 'pending' && 'Ready to Test'}
              </h3>
              <p className="text-sm text-gray-600">
                {overallStatus === 'success' && 'Your dashboard is fully integrated with the backend.'}
                {overallStatus === 'error' && 'Check the failed tests below for issues.'}
                {overallStatus === 'running' && 'Testing backend connectivity and functionality...'}
                {overallStatus === 'pending' && 'Click the button below to test backend integration.'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="text-center">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            variant="primary"
            size="lg"
            className="px-8"
          >
            {isRunning ? 'Running Tests...' : 'Run Integration Tests'}
          </Button>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center">
              <FiAlertTriangle className="h-4 w-4 mr-2" />
              Test Results
            </h4>
            
            {tests.map((test) => {
              const result = testResults[test.name];
              if (!result) return null;

              return (
                <div
                  key={test.name}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium">{test.name}</h5>
                      <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                      <p className="text-sm">{result.message}</p>
                      
                      {result.status === 'success' && result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            View Response Data
                          </summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-32">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      
                      {result.status === 'error' && (
                        <div className="mt-2 p-2 bg-danger-100 rounded text-xs text-danger-800">
                          Error: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Integration Tips */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Integration Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Ensure your backend is running on the correct port (default: 5000)</li>
            <li>• Check that CORS is configured to allow requests from your frontend</li>
            <li>• Verify that the ML model is loaded and functioning</li>
            <li>• Make sure MongoDB is connected and accessible</li>
            <li>• Test with actual email data for realistic results</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default BackendIntegrationTest; 