/**
 * Real-time updates service for coordinating state changes between components
 */

// Event system for component communication
const listeners = {
  scanCompleted: [],
  analyticsUpdated: []
};

/**
 * Notify that a scan was completed
 * @param {Object} scanResult - The scan result data
 */
export const notifyScanCompleted = (scanResult) => {
  console.log('Scan completed notification sent', scanResult.verdict);
  
  // Mark analytics as needing refresh with exact timestamp
  sessionStorage.setItem('analytics_needs_refresh', 'true');
  sessionStorage.setItem('last_scan_time', Date.now().toString());
  sessionStorage.setItem('last_scan_verdict', scanResult.verdict);
  
  // Store scan ID if available
  if (scanResult.id) {
    sessionStorage.setItem('last_scan_id', scanResult.id);
  }
  
  // Call all registered listeners
  listeners.scanCompleted.forEach(callback => {
    try {
      callback(scanResult);
    } catch (error) {
      console.error('Error in scan completed listener:', error);
    }
  });
};

/**
 * Listen for scan completions
 * @param {Function} callback - Function to call when scan completes
 * @returns {Function} Unsubscribe function
 */
export const onScanCompleted = (callback) => {
  listeners.scanCompleted.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = listeners.scanCompleted.indexOf(callback);
    if (index > -1) {
      listeners.scanCompleted.splice(index, 1);
    }
  };
};

/**
 * Notify that analytics were updated
 * @param {Object} analyticsData - The updated analytics data
 */
export const notifyAnalyticsUpdated = (analyticsData) => {
  console.log('Analytics updated notification sent');
  
  // Call all registered listeners
  listeners.analyticsUpdated.forEach(callback => {
    try {
      callback(analyticsData);
    } catch (error) {
      console.error('Error in analytics updated listener:', error);
    }
  });
};

/**
 * Listen for analytics updates
 * @param {Function} callback - Function to call when analytics update
 * @returns {Function} Unsubscribe function
 */
export const onAnalyticsUpdated = (callback) => {
  listeners.analyticsUpdated.push(callback);
  
  // Return unsubscribe function
  return () => {
    const index = listeners.analyticsUpdated.indexOf(callback);
    if (index > -1) {
      listeners.analyticsUpdated.splice(index, 1);
    }
  };
};

/**
 * Force immediate refresh of analytics
 */
export const forceAnalyticsRefresh = () => {
  sessionStorage.setItem('analytics_needs_refresh', 'true');
  sessionStorage.setItem('force_immediate_refresh', 'true');
  sessionStorage.setItem('last_scan_time', Date.now().toString());
}; 