import React, { useState } from 'react';
import { FiSettings, FiCheckCircle, FiXCircle, FiRefreshCw } from 'react-icons/fi';
import Card from '../common/Card';
import Button from '../common/Button';
import apiService from '../../services/api';
import TestDataDisplay from './TestDataDisplay';

const DebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runQuickTests = async () => {
    setIsRunningTests(true);
    const results = {};

    // Test 1: Backend Health
    try {
      await apiService.checkHealth();
      results.health = { status: 'success', message: 'Backend is running' };
    } catch (error) {
      results.health = { status: 'error', message: `Backend error: ${error.message}` };
    }

    // Test 2: Quick Scan
    try {
      const scanResult = await apiService.scanEmail('Test phishing email with urgent account verification required', 'en', false);
      results.scan = { status: 'success', message: `Scan works: ${scanResult.verdict}` };
    } catch (error) {
      results.scan = { status: 'error', message: `Scan error: ${error.message}` };
    }

    // Test 3: Analytics
    try {
      const analyticsResult = await apiService.getAnalytics('30d');
      results.analytics = { status: 'success', message: `Analytics works: ${Object.keys(analyticsResult).length} fields` };
    } catch (error) {
      results.analytics = { status: 'error', message: `Analytics error: ${error.message}` };
    }

    // Test 4: Scan History
    try {
      const historyResult = await apiService.getScanHistory('7d', 1, 5);
      results.history = { status: 'success', message: `History works: ${historyResult.history?.length || 0} scans` };
    } catch (error) {
      results.history = { status: 'error', message: `History error: ${error.message}` };
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <FiCheckCircle className="h-4 w-4 text-success-500" />;
      case 'error':
        return <FiXCircle className="h-4 w-4 text-danger-500" />;
      default:
        return <FiRefreshCw className="h-4 w-4 text-warning-500 animate-spin" />;
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="ghost"
          size="sm"
          className="bg-white shadow-lg border"
        >
          <FiSettings className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card title="Debug Panel" className="shadow-xl">
        <div className="space-y-4">
          {/* Quick Test Button */}
          <Button
            onClick={runQuickTests}
            disabled={isRunningTests}
            variant="primary"
            size="sm"
            className="w-full"
          >
            {isRunningTests ? 'Running Tests...' : 'Run Quick Tests'}
          </Button>

          {/* Test Real-Time Update */}
          <Button
            onClick={() => {
              console.log('=== TESTING REAL-TIME UPDATE ===');
              console.log('Current time:', new Date().toLocaleString());
              
              // Create test scan data
              const testScan = {
                id: `test-${Date.now()}`,
                verdict: 'phishing',
                confidence: 0.95,
                subject: 'DEBUG: Real-Time Test Scan',
                sender: 'test@debug.com'
              };
              
              // Force update the Recent Activity with current time
              const event = new CustomEvent('forceAddScan', { detail: testScan });
              document.dispatchEvent(event);
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🔴 Test Real-Time Now
          </Button>

          {/* Clear Cache */}
          <Button
            onClick={() => {
              console.log('=== CLEARING RECENT ACTIVITY CACHE ===');
              // Force refresh recent activity
              window.location.reload();
            }}
            variant="outline"
            size="xs"
            className="w-full"
          >
            🔄 Refresh Page & Clear Cache
          </Button>

          {/* Test Results */}
          {Object.keys(testResults).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Test Results:</h4>
              {Object.entries(testResults).map(([test, result]) => (
                <div key={test} className="flex items-center space-x-2 text-sm">
                  {getStatusIcon(result.status)}
                  <span className="capitalize font-medium">{test}:</span>
                  <span className="text-gray-600">{result.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Backend URL */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">
              Backend URL: {import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Make sure backend is running on port 5000
            </p>
          </div>

          {/* Test Data Display */}
          <div className="border-t pt-4">
            <TestDataDisplay />
          </div>

          {/* Instructions */}
          <div className="border-t pt-4">
            <h5 className="font-medium text-xs mb-2">Quick Fix Steps:</h5>
            <ol className="text-xs text-gray-600 space-y-1">
              <li>1. Start backend: <code>cd backend && python app.py</code></li>
              <li>2. Check MongoDB is running</li>
              <li>3. Test quick scan with sample email</li>
              <li>4. Check browser console for errors</li>
            </ol>
          </div>

          {/* Close Button */}
          <Button
            onClick={() => setIsVisible(false)}
            variant="outline"
            size="xs"
            className="w-full"
          >
            Close Debug Panel
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DebugPanel; 