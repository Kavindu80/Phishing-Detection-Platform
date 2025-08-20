import React, { createContext, useState, useCallback, useEffect } from 'react';
import apiService from '../services/api';
import { onScanCompleted, notifyAnalyticsUpdated } from '../services/realTimeUpdates';
import cacheService from '../services/cacheService';
const { clearCache } = cacheService;

// Create the context
const AnalyticsContext = createContext();

export const AnalyticsProvider = ({ children }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  
  // Tracking refresh state internally only (not exposed in context)
  const [_isForcedRefresh, setIsForcedRefresh] = useState(false);

  const fetchAnalyticsData = useCallback(async (showLoading = true, forceRefresh = false) => {
    // Check cache first unless forced refresh is requested
    if (!forceRefresh) {
      const cachedData = cacheService.getCache(cacheService.CACHE_KEYS.ANALYTICS_DATA);
      const cachedHistory = cacheService.getCache(cacheService.CACHE_KEYS.SCAN_HISTORY);
      
      if (cachedData && cachedHistory) {
        setAnalyticsData(cachedData);
        setScanHistory(cachedHistory);
        setLastUpdated(new Date(cacheService.getCache('last_analytics_update') || Date.now()));
        return;
      }
    }
    
    if (showLoading) setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getAnalytics(timeRange);
      const historyData = await apiService.getScanHistory(timeRange);

      // If backend returns empty/fallback, normalize to a graceful empty dataset
      const normalized = data && !data.isErrorFallback ? data : {
        verdictDistribution: { safe: 0, suspicious: 0, phishing: 0 },
        languageDistribution: {},
        topPhishingDomains: [],
        accuracyMetrics: { currentAccuracy: 0, falsePositives: 0, falseNegatives: 0, totalFeedbackCount: 0 },
        scansOverTime: [],
        accuracyTrend: [],
        gmailIntegrationActive: false,
        totalScans: 0,
        lastScanDate: null,
        refreshedAt: new Date().toISOString()
      };

      setAnalyticsData(normalized);
      setScanHistory(historyData.history || []);
      
      // Cache the data
      cacheService.setCache(cacheService.CACHE_KEYS.ANALYTICS_DATA, normalized);
      cacheService.setCache(cacheService.CACHE_KEYS.SCAN_HISTORY, historyData.history || []);
      
      // Store update timestamp
      const now = Date.now();
      cacheService.setCache('last_analytics_update', now);
      setLastUpdated(new Date(now));
      
      // Clear refresh flags
      sessionStorage.removeItem('analytics_needs_refresh');
      sessionStorage.removeItem('force_immediate_refresh');
      
      // Notify listeners about the analytics update
      notifyAnalyticsUpdated(normalized);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      // Graceful fallback for new users/no data instead of error UI
      const emptyData = {
        verdictDistribution: { safe: 0, suspicious: 0, phishing: 0 },
        languageDistribution: {},
        topPhishingDomains: [],
        accuracyMetrics: { currentAccuracy: 0, falsePositives: 0, falseNegatives: 0, totalFeedbackCount: 0 },
        scansOverTime: [],
        accuracyTrend: [],
        gmailIntegrationActive: false,
        totalScans: 0,
        lastScanDate: null,
        refreshedAt: new Date().toISOString(),
        isEmpty: true,
      };
      setAnalyticsData(emptyData);
      setScanHistory([]);
      setError(null); // clear error so the page renders with empty state
    } finally {
      if (showLoading) setIsLoading(false);
      setIsForcedRefresh(false);
    }
  }, [timeRange]);

  // Check if analytics data needs refresh
  const checkForRefresh = useCallback(() => {
    const needsRefresh = sessionStorage.getItem('analytics_needs_refresh') === 'true';
    const lastScanTime = sessionStorage.getItem('last_scan_time');
    const forceImmediate = sessionStorage.getItem('force_immediate_refresh') === 'true';
    
    // Check if there was a recent scan (within the last 10 seconds)
    const isRecentScan = lastScanTime && (Date.now() - parseInt(lastScanTime, 10)) < 10000;
    
    if (forceImmediate) {
      setIsForcedRefresh(true);
      fetchAnalyticsData(true, true);
      return;
    }
    
    // Only refresh once per flag
    if (needsRefresh || isRecentScan) {
      setIsForcedRefresh(true);
      fetchAnalyticsData(false, true);
      sessionStorage.removeItem('analytics_needs_refresh');
    }
  }, [fetchAnalyticsData]);

  // Listen for scan completion events
  useEffect(() => {
    const unsubscribe = onScanCompleted(() => {
      sessionStorage.setItem('force_immediate_refresh', 'true');
      sessionStorage.setItem('analytics_needs_refresh', 'true');
      sessionStorage.setItem('last_scan_time', Date.now().toString());
      setIsForcedRefresh(true);
      checkForRefresh();
    });
    
    return () => unsubscribe();
  }, [checkForRefresh]);

  // Initial fetch; avoid aggressive polling for brand-new sessions
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Fetch when time range changes
  useEffect(() => {
    fetchAnalyticsData(true, true);
  }, [timeRange, fetchAnalyticsData]);

  const refreshData = () => {
    setIsForcedRefresh(true);
    fetchAnalyticsData(true, true);
  };

  const changeTimeRange = (range) => {
    // Clear cached analytics to avoid stale data across ranges
    clearCache(cacheService.CACHE_KEYS.ANALYTICS_DATA);
    clearCache(cacheService.CACHE_KEYS.SCAN_HISTORY);
    setTimeRange(range);
  };

  return (
    <AnalyticsContext.Provider
      value={{
        analyticsData,
        scanHistory,
        isLoading,
        error,
        lastUpdated,
        timeRange,
        refreshData,
        changeTimeRange
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsContext; 