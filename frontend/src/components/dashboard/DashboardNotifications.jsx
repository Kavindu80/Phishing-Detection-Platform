import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiShield, FiAlertTriangle, FiCheckCircle, FiInfo, FiBell } from 'react-icons/fi';
import Button from '../common/Button';

const DashboardNotifications = ({ modelStatus, systemHealth, recentScans = [] }) => {
  const [notifications, setNotifications] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  // Generate notifications based on system status and recent activity
  useEffect(() => {
    const newNotifications = [];

    // Model status notifications
    if (modelStatus && !modelStatus.model_loaded) {
      newNotifications.push({
        id: 'model-fallback',
        type: 'warning',
        title: 'ML Model in Fallback Mode',
        message: 'The system is using rule-based detection. Consider restarting the service.',
        timestamp: new Date(),
        persistent: true
      });
    }

    // System health notifications
    if (systemHealth.api === 'error') {
      newNotifications.push({
        id: 'api-error',
        type: 'error',
        title: 'API Connection Error',
        message: 'Unable to connect to the backend service. Some features may be limited.',
        timestamp: new Date(),
        persistent: true
      });
    }

    // Recent high-risk detections
    const recentPhishing = recentScans
      .filter(scan => scan.verdict === 'phishing' && 
        new Date(scan.date) > new Date(Date.now() - 60 * 60 * 1000)) // Last hour
      .slice(0, 3);

    recentPhishing.forEach((scan, index) => {
      newNotifications.push({
        id: `phishing-${scan.id}-${index}`,
        type: 'alert',
        title: 'High-Risk Email Detected',
        message: `Phishing attempt blocked: "${scan.subject || 'No subject'}"`,
        timestamp: new Date(scan.date),
        autoHide: true,
        hideAfter: 10000 // 10 seconds
      });
    });

    // Success notifications for recent clean scans
    const recentSafe = recentScans
      .filter(scan => scan.verdict === 'safe' && 
        new Date(scan.date) > new Date(Date.now() - 30 * 60 * 1000)) // Last 30 minutes
      .length;

    if (recentSafe >= 5) {
      newNotifications.push({
        id: 'clean-streak',
        type: 'success',
        title: 'Clean Email Streak',
        message: `${recentSafe} safe emails processed in the last 30 minutes.`,
        timestamp: new Date(),
        autoHide: true,
        hideAfter: 8000
      });
    }

    setNotifications(newNotifications);
    setIsVisible(newNotifications.length > 0);
  }, [modelStatus, systemHealth, recentScans]);

  // Auto-hide notifications
  useEffect(() => {
    const timers = notifications
      .filter(notif => notif.autoHide)
      .map(notif => 
        setTimeout(() => {
          dismissNotification(notif.id);
        }, notif.hideAfter || 5000)
      );

    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  const dismissNotification = (id) => {
    setNotifications(prev => {
      const updated = prev.filter(notif => notif.id !== id);
      if (updated.length === 0) {
        setIsVisible(false);
      }
      return updated;
    });
  };

  const dismissAll = () => {
    setNotifications([]);
    setIsVisible(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <FiAlertTriangle className="h-5 w-5 text-danger-500" />;
      case 'warning':
        return <FiAlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'alert':
        return <FiShield className="h-5 w-5 text-danger-500" />;
      case 'success':
        return <FiCheckCircle className="h-5 w-5 text-success-500" />;
      default:
        return <FiInfo className="h-5 w-5 text-primary-500" />;
    }
  };

  const getNotificationColors = (type) => {
    switch (type) {
      case 'error':
        return 'border-danger-200 bg-danger-50';
      case 'warning':
        return 'border-warning-200 bg-warning-50';
      case 'alert':
        return 'border-danger-200 bg-danger-50';
      case 'success':
        return 'border-success-200 bg-success-50';
      default:
        return 'border-primary-200 bg-primary-50';
    }
  };

  if (!isVisible || notifications.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 right-4 z-50 w-96 max-w-sm"
    >
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <FiBell className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-900">Notifications</span>
            <span className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={dismissAll}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          <AnimatePresence>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 border-l-4 ${getNotificationColors(notification.type)} border-b border-gray-100 last:border-b-0`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => dismissNotification(notification.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 ml-2"
                  >
                    <FiX className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardNotifications; 