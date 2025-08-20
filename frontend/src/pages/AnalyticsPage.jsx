import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { VerdictBarChart, AccuracyLineChart, LanguagePieChart, ScansTimeChart } from '../components/analytics/ChartComponents';
import TopPhishingDomains from '../components/analytics/TopPhishingDomains';
import ExportData from '../components/analytics/ExportData';
import { useAnalytics } from '../hooks/useAnalytics';
import { forceAnalyticsRefresh, onScanCompleted } from '../services/realTimeUpdates';
import { formatConfidence } from '../utils/formatUtils';
import apiService from '../services/api';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// Custom CircularProgress component with label
function CircularProgressWithLabel({ value, label, color = '#6366f1', size = 60 }) {
  return (
    <div className="flex flex-col items-center">
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress 
          variant="determinate" 
          value={value} 
          size={size}
          thickness={4}
          sx={{
            color: color,
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="caption"
            component="div"
            sx={{ color: color, fontWeight: 'bold', fontSize: '12px' }}
          >
            {`${Math.round(value)}%`}
          </Typography>
        </Box>
      </Box>
      <p className="text-xs text-gray-600 mt-2 text-center">{label}</p>
    </div>
  );
}

const AnalyticsPage = () => {
  const location = useLocation();
  const {
    analyticsData,
    scanHistory,
    isLoading,
    error,
    lastUpdated,
    timeRange,
    refreshData,
    changeTimeRange
  } = useAnalytics();

  // Local state for paginated history
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await apiService.getScanHistory(timeRange || 'all', page, limit);
      setHistory(res.history || []);
      const p = res.pagination || { page: 1, total_pages: 1, total_count: (res.history || []).length };
      setPage(p.page || page);
      setTotalPages(p.total_pages || 1);
      setTotalCount(p.total_count || (res.history || []).length);
    } catch (e) {
      console.error('Failed to load scan history page:', e);
      // Fallback to context history if available
      setHistory(scanHistory || []);
      setTotalPages(1);
      setTotalCount((scanHistory || []).length);
    } finally {
      setLoadingHistory(false);
    }
  }, [timeRange, page, limit, scanHistory]);

  // Load on initial mount and when timeRange/page changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reload history when a refresh occurs
  useEffect(() => {
    if (lastUpdated) {
      loadHistory();
    }
  }, [lastUpdated, loadHistory]);

  // Add state for active tab
  const [activeTab, setActiveTab] = useState('charts');
  // On mount, respect ?tab=history
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    }
  }, [location.search]);
  
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    // The actual data fetching is now handled by the context
  }, []);
  
  const handleTimeRangeChange = (e) => {
    setPage(1); // reset pagination on range change
    changeTimeRange(e.target.value);
  };
  
  // Updated refresh handler to use the force refresh functionality
  const handleRefresh = () => {
    // Force immediate analytics refresh
    forceAnalyticsRefresh();
    // Also call the regular refresh function from context
    refreshData();
    // Refresh current history page too
    loadHistory();
  };

  // Add effect to listen for new scans
  useEffect(() => {
    // Get last scan ID to check if we need to update scan history
    const lastScanId = sessionStorage.getItem('last_scan_id');
    const lastScanTime = sessionStorage.getItem('last_scan_time');
    
    // If we have a recent scan
    if (lastScanId && lastScanTime) {
      const timeSinceScan = Date.now() - parseInt(lastScanTime, 10);
      
      // Only do this for recent scans (less than 30 seconds old)
      if (timeSinceScan < 30000) {
        // Force refresh the scan history
        loadHistory();
      }
    }
    
    // Subscribe to scan completions
    const unsubscribe = onScanCompleted(() => {
      // Trigger a refresh after a short delay
      setTimeout(() => {
        loadHistory();
      }, 1000);
    });
    
    return () => unsubscribe();
  }, [scanHistory, loadHistory]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'safe':
        return 'bg-success-100 text-success-800';
      case 'suspicious':
        return 'bg-warning-100 text-warning-800';
      case 'phishing':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Compute real-time accuracy metrics based on latest trend and latest day counts
  const latestAccuracy = (() => {
    const trend = analyticsData?.accuracyTrend || [];
    if (trend.length > 0) return Math.round(trend[trend.length - 1].accuracy * 10) / 10;
    return analyticsData?.accuracyMetrics?.currentAccuracy || 0;
  })();

  const { fprDisplay, fnrDisplay } = (() => {
    const metrics = analyticsData?.accuracyMetrics;
    const hasFeedback = metrics && metrics.totalFeedbackCount > 0;
    if (hasFeedback) {
      return {
        fprDisplay: metrics.falsePositives || 0,
        fnrDisplay: metrics.falseNegatives || 0,
      };
    }
    // Estimate from the most recent day for near-real-time update when no feedback exists
    const series = analyticsData?.scansOverTime || [];
    const last = series.length > 0 ? series[series.length - 1] : null;
    const total = last ? (last.safe || 0) + (last.suspicious || 0) + (last.phishing || 0) : 0;
    if (!total) return { fprDisplay: 0, fnrDisplay: 0 };
    const fpr = ((last.suspicious || 0) / total) * 100;
    const fnr = ((last.phishing || 0) / total) * 100;
    return {
      fprDisplay: Math.round(fpr * 10) / 10,
      fnrDisplay: Math.round(fnr * 10) / 10,
    };
  })();

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalCount || (history?.length || 0));

  return (
    <div className="container mx-auto px-4 py-4 md:py-5 lg:py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600">View detailed statistics and scan history</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <select
            className="form-input"
            value={timeRange}
            onChange={handleTimeRangeChange}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center" disabled={isLoading || loadingHistory}>
            <FiRefreshCw className={`mr-2 ${isLoading || loadingHistory ? 'animate-spin' : ''}`} />
            {(isLoading || loadingHistory) ? 'Loading...' : 'Refresh'}
          </Button>
          <ExportData data={analyticsData} scanHistory={history} timeRange={timeRange} />
        </div>
      </div>

      {/* Last updated info */}
      {lastUpdated && (
        <div className="mb-4 text-sm text-gray-600 flex items-center">
          <span>Last updated: {formatDate(lastUpdated)}</span>
          {(isLoading || loadingHistory) && (
            <div className="ml-4 flex items-center">
              <Spinner size="sm" className="mr-2" />
              <span>Updating data...</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 lg:mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            id="charts-tab"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'charts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange('charts')}
          >
            Charts & Metrics
          </button>
          <button
            id="history-tab"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => handleTabChange('history')}
          >
            Scan History
          </button>
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-600">Loading data...</span>
        </div>
      ) : error ? (
        <div className="bg-danger-50 text-danger-700 p-4 rounded-md border border-danger-200">
          {error}
        </div>
      ) : activeTab === 'charts' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Chart with real data */}
          <Card title="Scans Over Time">
            <div className="h-64">
              <ScansTimeChart data={analyticsData} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <CircularProgressWithLabel 
                value={analyticsData?.verdictDistribution?.safe || 0}
                label="Safe"
                color="#22c55e"
                size={50}
              />
              <CircularProgressWithLabel 
                value={analyticsData?.verdictDistribution?.suspicious || 0}
                label="Suspicious"
                color="#eab308"
                size={50}
              />
              <CircularProgressWithLabel 
                value={analyticsData?.verdictDistribution?.phishing || 0}
                label="Phishing"
                color="#dc2626"
                size={50}
              />
            </div>
          </Card>

          <Card title="Detection Accuracy">
            <div className="h-64">
              <AccuracyLineChart data={analyticsData} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <CircularProgressWithLabel 
                value={latestAccuracy}
                label="Current Accuracy"
                color="#22c55e"
                size={45}
              />
              <CircularProgressWithLabel 
                value={fprDisplay}
                label="False Positives"
                color="#eab308"
                size={45}
              />
              <CircularProgressWithLabel 
                value={fnrDisplay}
                label="False Negatives"
                color="#dc2626"
                size={45}
              />
            </div>
          </Card>

          <Card title="Language Distribution">
            <div className="h-64">
              <LanguagePieChart data={analyticsData} />
            </div>
          </Card>

          <Card title="Top Phishing Domains">
            <TopPhishingDomains data={analyticsData} />
          </Card>
        </div>
      ) : (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Scan History</h3>
            <Button variant="outline" size="sm" onClick={loadHistory} disabled={loadingHistory}>
              <FiFilter className="mr-2" />
              Reload
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sender
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verdict
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length > 0 ? (
                  history.map((scan) => (
                    <tr key={scan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(scan.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {scan.subject}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 font-mono truncate max-w-xs">
                          {scan.sender}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getVerdictColor(scan.verdict)}`}>
                          {scan.verdict}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatConfidence(scan.confidence)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {scan.language === 'en' ? 'English' : scan.language}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="outline" size="xs" to={`/scanner/history/${scan.id}`}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                      No scan history found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{totalCount === 0 ? 0 : startIndex}</span> to <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{totalCount}</span> results
            </div>
            <div className="flex-1 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1 || loadingHistory}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loadingHistory}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsPage; 