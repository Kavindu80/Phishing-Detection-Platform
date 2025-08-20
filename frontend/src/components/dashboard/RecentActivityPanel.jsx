import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShield, FiAlertTriangle, FiCheckCircle, FiBarChart2, FiMail, FiArrowRight, FiRefreshCw, FiEye } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../common/Card';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { formatDate, formatConfidence } from '../../utils/formatUtils';
import apiService from '../../services/api';

const RecentActivityPanel = ({ refreshTrigger, newScanResult }) => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchRecentActivity = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');

    try {
      console.log('Fetching recent activity...');
      const response = await apiService.getScanHistory('7d', 1, 20); // Get more to filter recent ones
      console.log('Recent activity response:', response);
      
      const activities = response.history || response.scans || [];
      console.log('Raw activities from backend:', activities.length);
      
      // If there is simply no data yet, treat it as empty state, not an error
      if (!activities || activities.length === 0) {
        setActivities([]);
        setError('');
        setLastUpdated(new Date());
        return;
      }
      
      // Process and normalize the activities data
      const processedActivities = activities.map(activity => {
        const processed = {
          ...activity,
          // Ensure subject is not empty
          subject: activity.subject || activity.email_subject || 'No subject',
          // Ensure sender is available
          sender: activity.sender || activity.email_sender || 'Unknown sender',
          // Normalize confidence - backend sends decimal (0-1), convert to percentage for display
          confidence: activity.confidence <= 1 ? activity.confidence : activity.confidence / 100,
          // Ensure date is in proper format
          date: activity.date || activity.created_at || activity.timestamp,
          // Add type if missing
          type: activity.type || 'scan'
        };
        return processed;
      });

      // Use all activities from database (already sorted by date desc from backend)
      const finalActivities = processedActivities.slice(0, 8);
      console.log('Using database activities:', finalActivities.length);
      
      // Helper to round date to the nearest minute for robust matching
      const makeKey = (activity) => {
        if (activity.id) return `id:${activity.id}`;
        const dateObj = new Date(activity.date);
        const rounded = isNaN(dateObj.getTime())
          ? activity.date
          : new Date(Math.floor(dateObj.getTime() / 60000) * 60000).toISOString();
        const subj = (activity.subject || '').trim();
        const sndr = (activity.sender || '').trim();
        return `ss:${subj}|${sndr}|${rounded}`;
      };
      
      // Preserve any new scans that were added manually and merge with database data
      setActivities(prevActivities => {
        const newScans = prevActivities.filter(activity => activity.isNew);
        
        // Merge and deduplicate by id when available, otherwise by subject+sender+rounded minute
        const merged = [...newScans, ...finalActivities];
        const seen = new Set();
        const unique = [];
        for (const item of merged) {
          const key = makeKey(item);
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }
        const limited = unique.slice(0, 8);
        console.log('Merging activities - New scans:', newScans.length, 'Database scans:', finalActivities.length, 'Unique total:', limited.length);
        return limited;
      });
      setLastUpdated(new Date());
      
      // Use the merged/processed activities set above; do not override here
      console.log('Activities updated from database fetch:', finalActivities.length);
      } catch (err) {
      console.error('Error fetching recent activity:', err);
      // Graceful handling for first-time users or temporary auth issues
      const status = err?.response?.status;
      if (status === 401 || status === 404) {
        setError('');
        setActivities([]);
      } else {
        setError('We could not load your recent activity right now.');
      }
      
      // Don't show any demo data - keep the existing activities if any
      console.log('Backend error - keeping existing activities');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchRecentActivity(false);
    }
  }, [refreshTrigger]);

  // Force re-render every minute to update relative times
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render by updating lastUpdated
      setLastUpdated(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Test event listener for debugging
  useEffect(() => {
    const handleForceAddScan = (event) => {
      const testScan = event.detail;
      console.log('=== FORCE ADD SCAN TEST ===');
      console.log('Test scan data:', testScan);
      
      const now = new Date();
      const newActivity = {
        id: testScan.id,
        type: 'scan',
        verdict: testScan.verdict,
        confidence: testScan.confidence,
        subject: testScan.subject,
        sender: testScan.sender,
        date: now.toISOString(),
        isNew: true,
      };
      
      console.log('Adding test activity with current time:', now.toLocaleString());
      setActivities(prevActivities => [newActivity, ...prevActivities.slice(0, 7)]);
      setLastUpdated(now);
    };

    document.addEventListener('forceAddScan', handleForceAddScan);
    return () => document.removeEventListener('forceAddScan', handleForceAddScan);
  }, []);

  // Handle new scan result - add it immediately to the top of the list
  useEffect(() => {
    if (newScanResult) {
      const now = new Date();
      console.log('=== ADDING NEW SCAN ===');
      console.log('Current time:', now.toISOString(), 'Local:', now.toLocaleString());
      console.log('New scan result:', newScanResult);
      
      const newActivity = {
        id: newScanResult.id || `scan-${Date.now()}`,
        type: 'scan',
        verdict: newScanResult.verdict,
        confidence: newScanResult.confidence,
        subject: newScanResult.subject || 'Email Scan',
        sender: newScanResult.sender || 'Quick Scan',
        date: now.toISOString(), // Current time for real-time display
        isNew: true, // Flag to highlight new items
      };
      
      // Deduplicate: avoid inserting if an identical item is already at the top
      const makeKey = (activity) => {
        if (activity.id) return `id:${activity.id}`;
        const dateObj = new Date(activity.date);
        const rounded = isNaN(dateObj.getTime())
          ? activity.date
          : new Date(Math.floor(dateObj.getTime() / 60000) * 60000).toISOString();
        const subj = (activity.subject || '').trim();
        const sndr = (activity.sender || '').trim();
        return `ss:${subj}|${sndr}|${rounded}`;
      };
      
      const newKey = makeKey(newActivity);
      
      setActivities(prevActivities => {
        const already = prevActivities.some(a => makeKey(a) === newKey);
        if (already) {
          return prevActivities; // skip duplicate
        }
        const newList = [newActivity, ...prevActivities.slice(0, 7)];
        console.log('New activities list:', newList);
        return newList;
      });
      setLastUpdated(now);

      // Remove the "new" flag after 5 seconds
      setTimeout(() => {
        setActivities(prevActivities => 
          prevActivities.map(activity => 
            activity.id === newActivity.id 
              ? { ...activity, isNew: false }
              : activity
          )
        );
      }, 5000);
    }
  }, [newScanResult]);

  const getActivityIcon = (activity) => {
    if (activity.type === 'feedback') {
      return <FiBarChart2 className="h-5 w-5 text-primary-500" />;
    }

    switch (activity.verdict) {
      case 'safe':
        return <FiCheckCircle className="h-5 w-5 text-success-500" />;
      case 'suspicious':
        return <FiAlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'phishing':
        return <FiShield className="h-5 w-5 text-danger-500" />;
      default:
        return <FiMail className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityBadgeColor = (activity) => {
    if (activity.type === 'feedback') {
      return 'bg-primary-100 text-primary-800';
    }

    switch (activity.verdict) {
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

  const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    // Normalize to an ISO string with explicit UTC if missing timezone
    // Many backend dates are in UTC; ensure consistent parsing
    let normalized = dateString;
    if (typeof dateString === 'string') {
      // If it looks like ISO without timezone (no 'Z' and no '+'/'-'), assume UTC
      const noTz = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(dateString);
      if (noTz) normalized = `${dateString}Z`;
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return '';
    const now = new Date(); // Always use fresh current time for accurate calculation
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    // Enhanced debug logging
    console.log('=== TIME CALCULATION DEBUG ===');
    console.log('Input date string:', dateString, 'Normalized:', normalized);
    console.log('Parsed date (UTC):', isNaN(date.getTime()) ? 'Invalid' : date.toISOString());
    console.log('Parsed date (Local):', date.toLocaleString());
    console.log('Current time (UTC):', now.toISOString());
    console.log('Current time (Local):', now.toLocaleString());
    console.log('Difference in seconds:', diffInSeconds);
    console.log('Difference in minutes:', Math.floor(diffInSeconds / 60));
    console.log('Difference in hours:', Math.floor(diffInSeconds / 3600));

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateString);
  };

  return (
    <Card title="Recent Activity" className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => fetchRecentActivity()}
          disabled={isLoading}
          className="flex items-center space-x-1"
        >
          <FiRefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {isLoading && activities.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : error && activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRecentActivity()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <FiShield className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p>You don’t have any scans yet.</p>
          <div className="mt-3">
            <Link to="/scanner" className="text-primary-600 hover:text-primary-800 text-sm inline-flex items-center">
              Start your first scan <FiArrowRight className="ml-1" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden">
          <AnimatePresence>
            <ul className="divide-y divide-gray-200">
              {activities.map((activity, index) => (
                <motion.li
                  key={activity.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`py-4 transition-colors rounded-lg px-2 ${
                    activity.isNew 
                      ? 'bg-primary-50 border-l-4 border-primary-500 hover:bg-primary-100' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.subject || activity.sender || 'No subject'}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActivityBadgeColor(activity)}`}>
                          {activity.type === 'feedback'
                            ? `Feedback: ${activity.originalVerdict} → ${activity.userFeedback}`
                            : `${activity.verdict} (${formatConfidence(activity.confidence)})`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {getRelativeTime(activity.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        variant="outline"
                        size="xs"
                        to={activity.id ? `/scanner/history/${activity.id}` : undefined}
                        disabled={!activity.id}
                        className="flex items-center space-x-1"
                      >
                        <FiEye className="h-3 w-3" />
                        <span>View</span>
                      </Button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>

          {activities.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <FiMail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Start by scanning some emails!</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <Link 
          to="/analytics?tab=history" 
          className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center transition-colors"
        >
          View All Activity
          <FiArrowRight className="ml-1" />
        </Link>
      </div>
    </Card>
  );
};

export default RecentActivityPanel; 