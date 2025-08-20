import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiShield, FiCheckCircle, FiClock, FiRefreshCw, FiSettings, FiTrendingUp, FiAlertTriangle, FiBarChart2 } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import useDashboard from '../hooks/useDashboard';
import StatCard from '../components/dashboard/StatCard';
import QuickScanPanel from '../components/dashboard/QuickScanPanel';
import RecentActivityPanel from '../components/dashboard/RecentActivityPanel';
import ThreatOverview from '../components/dashboard/ThreatOverview';
import DashboardNotifications from '../components/dashboard/DashboardNotifications';
import DebugPanel from '../components/dashboard/DebugPanel';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Spinner from '../components/common/Spinner';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    dashboardStats,
    analyticsData,
    modelStatus,
    systemHealth,
    isLoading,
    isRefreshing,
    lastUpdated,
    error,
    refreshDashboard,
    formatChange,
    getSystemHealthStatus
  } = useDashboard();
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [latestScanResult, setLatestScanResult] = useState(null);

  // Generate personalized welcome message
  useEffect(() => {
    if (user) {
      const hour = new Date().getHours();
      let greeting = 'Good evening';
      if (hour < 12) greeting = 'Good morning';
      else if (hour < 18) greeting = 'Good afternoon';
      
      setWelcomeMessage(`${greeting}, ${user.username || user.email}!`);
    }
  }, [user]);

  // Extract recent scans for notifications
  useEffect(() => {
    if (analyticsData && analyticsData.recentScans) {
      setRecentScans(analyticsData.recentScans || []);
    }
  }, [analyticsData]);

  // Handle scan completion from quick scan
  const handleScanComplete = useCallback((scanResult) => {
    console.log('=== DASHBOARD: SCAN COMPLETED ===');
    console.log('Scan result received:', scanResult);
    console.log('Time of completion:', new Date().toLocaleString());
    
    // Set the latest scan result for immediate display
    setLatestScanResult(scanResult);
    console.log('Latest scan result set for RecentActivityPanel');
    
    // Trigger immediate refresh of analytics data and recent activity
    setRefreshTrigger(prev => {
      console.log('Refresh trigger updated:', prev + 1);
      return prev + 1;
    });
    
    // Refresh dashboard data
    setTimeout(() => {
      console.log('Refreshing dashboard data...');
      refreshDashboard(false);
    }, 1000);

    // Clear the scan result after a delay to avoid duplicate adds
    setTimeout(() => {
      console.log('Clearing latest scan result to prevent duplicates');
      setLatestScanResult(null);
    }, 2000);
  }, [refreshDashboard]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    await refreshDashboard(true);
    setRefreshTrigger(prev => prev + 1);
  }, [refreshDashboard]);

  // Get system health status display
  const systemHealthStatus = getSystemHealthStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Real-time Notifications */}
      <DashboardNotifications
        modelStatus={modelStatus}
        systemHealth={systemHealth}
        recentScans={recentScans}
      />

    <div className="container mx-auto px-4 py-4 md:py-5 lg:py-6">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-6 lg:mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {welcomeMessage} Here's your email security overview.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="flex items-center space-x-2"
              >
                <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/analytics')}
                className="flex items-center space-x-2"
              >
                <FiBarChart2 className="h-4 w-4" />
                <span>Analytics</span>
              </Button>
            </div>
          </div>

          {/* System Status Alert */}
          <AnimatePresence>
            {systemHealthStatus === 'warning' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Alert
                  type="warning"
                  message="ML model is running in fallback mode. Detection accuracy may be reduced."
                />
              </motion.div>
            )}
            {systemHealthStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Alert
                  type="error"
                  message="System connectivity issues detected. Some features may be limited."
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Alert type="error" message={error} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

                {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6 lg:mb-8">
          <div className="h-full">
            <StatCard
              title="Total Scans"
              value={isLoading ? '...' : dashboardStats.totalScans.toLocaleString()}
              icon={FiMail}
              gradient="primary"
              change={formatChange(dashboardStats.weeklyTrend, 'percentage') || 'This week'}
              isLoading={isLoading}
              onClick={() => navigate('/analytics')}
            />
          </div>

          <div className="h-full">
            <StatCard
              title="Threats Detected"
              value={isLoading ? '...' : dashboardStats.phishingDetected.toLocaleString()}
              icon={FiShield}
              gradient="danger"
              change={`${dashboardStats.todayPhishing} detected today`}
              isLoading={isLoading}
              onClick={() => navigate('/analytics?filter=phishing')}
            />
          </div>

          <div className="h-full">
            <StatCard
              title="Detection Accuracy"
              value={isLoading ? '...' : `${dashboardStats.accuracy.toFixed(1)}%`}
              icon={FiCheckCircle}
              gradient="success"
              change={modelStatus?.model_loaded ? 'ML Model Active' : 'Fallback Mode'}
              isLoading={isLoading}
              onClick={() => navigate('/scanner')}
            />
          </div>

          <div className="h-full">
            <StatCard
              title="Pending Reviews"
              value={isLoading ? '...' : dashboardStats.pendingReports.toString()}
              icon={FiClock}
              gradient="warning"
              change="Manual review needed"
              isLoading={isLoading}
              onClick={() => navigate('/analytics')}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6 lg:mb-8">
          {/* Quick Scan Panel */}
          <QuickScanPanel onScanComplete={handleScanComplete} />

          {/* Recent Activity Panel */}
                              <RecentActivityPanel 
                      refreshTrigger={refreshTrigger} 
                      newScanResult={latestScanResult}
                    />
      </div>

        {/* Secondary Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Threat Overview */}
          <ThreatOverview 
            analyticsData={analyticsData} 
            isLoading={isLoading} 
          />

          {/* Quick Actions & System Status */}
          <Card title="Quick Actions & System Status" className="lg:col-span-1">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/scanner')}
                    className="flex items-center justify-center space-x-2 py-3"
                  >
                    <FiMail className="h-4 w-4" />
                    <span>Advanced Scanner</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/inbox')}
                    className="flex items-center justify-center space-x-2 py-3"
                  >
                    <FiShield className="h-4 w-4" />
                    <span>Inbox Monitor</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/analytics')}
                    className="flex items-center justify-center space-x-2 py-3"
                  >
                    <FiTrendingUp className="h-4 w-4" />
                    <span>View Analytics</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/settings')}
                    className="flex items-center justify-center space-x-2 py-3"
                  >
                    <FiSettings className="h-4 w-4" />
                    <span>Settings</span>
              </Button>
            </div>
          </div>

              {/* System Status */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">System Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ML Model</span>
                    <div className="flex items-center space-x-2">
                      {modelStatus ? (
                        <>
                          <div className={`h-2 w-2 rounded-full ${
                            modelStatus.model_loaded ? 'bg-success-500' : 'bg-warning-500'
                          }`}></div>
                          <span className="text-sm font-medium">
                            {modelStatus.model_loaded ? 'Active' : 'Fallback'}
                          </span>
                        </>
                      ) : (
                        <Spinner size="sm" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Connection</span>
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${
                        systemHealth.api === 'connected' ? 'bg-success-500' : 'bg-danger-500'
                      }`}></div>
                      <span className="text-sm font-medium">
                        {systemHealth.api === 'connected' ? 'Connected' : 'Error'}
                        </span>
                      </div>
                    </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Data Sync</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-success-500"></div>
                      <span className="text-sm font-medium">Up to date</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Tips */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <FiAlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                  Security Reminder
                </h4>
                <p className="text-sm text-gray-600">
                  Always verify sender identity before clicking links or downloading attachments. 
                  When in doubt, contact the sender through a different communication channel.
                </p>
          </div>
          </div>
                  </Card>
        </div>

        {/* Debug Panel for Development */}
        {import.meta.env.MODE === 'development' && <DebugPanel />}
      </div>
    </div>
  );
};

export default DashboardPage; 