import { useState, useEffect, useCallback } from 'react';
import { useAnalytics } from './useAnalytics';
import apiService from '../services/api';

/**
 * Custom hook for dashboard data management
 * Handles dashboard-specific state, calculations, and data fetching
 */
export function useDashboard() {
  const { analyticsData, isLoading: analyticsLoading, refreshData } = useAnalytics();
  
  const [dashboardStats, setDashboardStats] = useState({
    totalScans: 0,
    phishingDetected: 0,
    accuracy: 0,
    pendingReports: 0,
    todayScans: 0,
    todayPhishing: 0,
    weeklyTrend: 0,
    monthlyTrend: 0,
    threatLevel: 'low'
  });
  
  const [modelStatus, setModelStatus] = useState(null);
  const [systemHealth, setSystemHealth] = useState({
    api: 'connected',
    database: 'connected',
    model: 'unknown'
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState('');

  // Calculate dashboard statistics from analytics data
  const calculateDashboardStats = useCallback((data) => {
    if (!data) return;

    const {
      totalScans = 0,
      verdictDistribution = {},
      scansOverTime = [],
      accuracyMetrics = {},
    } = {
      totalScans: data.totalScans,
      verdictDistribution: data.verdictDistribution || data.scansByVerdict || {},
      scansOverTime: data.scansOverTime || data.scansByDay || [],
      accuracyMetrics: data.accuracyMetrics || {},
    };

    // Derive daily totals from scansOverTime
    const dailyTotals = (scansOverTime || []).map(day => ({
      date: day.date,
      count: (day.safe || 0) + (day.suspicious || 0) + (day.phishing || 0),
      phishing: day.phishing || 0,
      suspicious: day.suspicious || 0,
    }));

    // Get today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayData = dailyTotals.find(day => day.date === today) || { count: 0, phishing: 0 };
    const todayScans = todayData.count;
    const todayPhishing = todayData.phishing;

    // Weekly trend (based on total daily counts)
    const lastWeekScans = dailyTotals.slice(-7).reduce((total, day) => total + (day.count || 0), 0);
    const previousWeekScans = dailyTotals.slice(-14, -7).reduce((total, day) => total + (day.count || 0), 0);
    const weeklyTrend = previousWeekScans > 0 
      ? ((lastWeekScans - previousWeekScans) / previousWeekScans) * 100 
      : 0;

    // Monthly trend (last 30 vs previous 30 days)
    const lastMonthScans = dailyTotals.slice(-30).reduce((total, day) => total + (day.count || 0), 0);
    const previousMonthScans = dailyTotals.slice(-60, -30).reduce((total, day) => total + (day.count || 0), 0);
    const monthlyTrend = previousMonthScans > 0 
      ? ((lastMonthScans - previousMonthScans) / previousMonthScans) * 100 
      : 0;

    // Latest accuracy
    let latestAccuracy = 0;
    if (Array.isArray(data.accuracyTrend) && data.accuracyTrend.length > 0) {
      // Use the latest point from the accuracy trend for real-time behavior
      const last = data.accuracyTrend[data.accuracyTrend.length - 1];
      latestAccuracy = typeof last.accuracy === 'number' ? last.accuracy : 0;
    } else if (typeof accuracyMetrics.currentAccuracy === 'number') {
      latestAccuracy = accuracyMetrics.currentAccuracy;
    } else {
      latestAccuracy = 0;
    }

    // Compute phishing detected count (sum over timeRange)
    const phishingDetected = dailyTotals.reduce((sum, day) => sum + (day.phishing || 0), 0);

    // Threat level from percentages if available
    const phishingPercent = typeof verdictDistribution.phishing === 'number'
      ? verdictDistribution.phishing
      : (totalScans > 0 ? (phishingDetected / totalScans) * 100 : 0);

    let threatLevel = 'low';
    if (phishingPercent > 15) threatLevel = 'high';
    else if (phishingPercent > 8) threatLevel = 'medium';

    // Pending reports based on suspicious counts (cap for UI)
    const suspiciousTotal = dailyTotals.reduce((sum, day) => sum + (day.suspicious || 0), 0);
    const pendingReports = Math.min(suspiciousTotal, 10);

    setDashboardStats({
      totalScans,
      phishingDetected,
      accuracy: latestAccuracy,
      pendingReports,
      todayScans,
      todayPhishing,
      weeklyTrend,
      monthlyTrend,
      threatLevel
    });
  }, []);

  // Fetch model status and system health
  const fetchSystemStatus = useCallback(async () => {
    try {
      // Check model status
      const modelResponse = await apiService.checkModelStatus();
      setModelStatus(modelResponse);

      // Check API health
      await apiService.checkHealth();
      
      setSystemHealth({
        api: 'connected',
        database: 'connected',
        model: modelResponse.model_loaded ? 'active' : 'fallback'
      });
    } catch (err) {
      console.error('Error fetching system status:', err);
      setSystemHealth(prev => ({
        ...prev,
        api: 'error'
      }));
    }
  }, []);

  // Main refresh function
  const refreshDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    setError('');

    try {
      await Promise.all([
        refreshData(),
        fetchSystemStatus()
      ]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setError('Failed to refresh dashboard data. Please try again.');
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, [refreshData, fetchSystemStatus]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDashboard(false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [refreshDashboard]);

  // Calculate stats when analytics data changes
  useEffect(() => {
    if (analyticsData) {
      calculateDashboardStats(analyticsData);
    }
  }, [analyticsData, calculateDashboardStats]);

  // Initial system status fetch
  useEffect(() => {
    fetchSystemStatus();
  }, [fetchSystemStatus]);

  // Utility functions
  const formatChange = useCallback((value, type = 'number') => {
    if (!value || Math.abs(value) < 0.1) return null;
    
    const isPositive = value > 0;
    const prefix = isPositive ? '+' : '';
    const suffix = type === 'percentage' ? '%' : '';
    
    return `${prefix}${value.toFixed(1)}${suffix}`;
  }, []);

  const getChangeType = useCallback((stat, value) => {
    if (!value || Math.abs(value) < 0.1) return 'neutral';
    
    // For scans and accuracy, positive change is good
    // For phishing detected, positive change might be concerning
    if (stat === 'phishingDetected') {
      return value > 0 ? 'negative' : 'positive';
    }
    return value > 0 ? 'positive' : 'negative';
  }, []);

  const getSystemHealthStatus = useCallback(() => {
    const { api, database, model } = systemHealth;
    
    if (api === 'error') return 'error';
    if (model === 'fallback') return 'warning';
    if (api === 'connected' && database === 'connected' && model === 'active') return 'healthy';
    return 'unknown';
  }, [systemHealth]);

  return {
    // Data
    dashboardStats,
    analyticsData,
    modelStatus,
    systemHealth,
    
    // Status
    isLoading: analyticsLoading,
    isRefreshing,
    lastUpdated,
    error,
    
    // Actions
    refreshDashboard,
    
    // Utilities
    formatChange,
    getChangeType,
    getSystemHealthStatus
  };
}

export default useDashboard; 