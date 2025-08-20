import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown, FiMinus, FiShield, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import Card from '../common/Card';
import Spinner from '../common/Spinner';

const ThreatOverview = ({ analyticsData, isLoading }) => {
  const [threatLevel, setThreatLevel] = useState('low');
  const [trends, setTrends] = useState({
    phishing: { value: 0, change: 0, direction: 'stable' },
    suspicious: { value: 0, change: 0, direction: 'stable' },
    safe: { value: 0, change: 0, direction: 'stable' }
  });

  useEffect(() => {
    if (analyticsData) {
      calculateThreatMetrics();
    }
  }, [analyticsData]);

  const calculateThreatMetrics = () => {
    const scansOverTime = analyticsData?.scansOverTime || [];

    // Derive scansByVerdict when not provided by backend
    let scansByVerdict = analyticsData?.scansByVerdict;
    if (!scansByVerdict || typeof scansByVerdict !== 'object') {
      scansByVerdict = { safe: 0, suspicious: 0, phishing: 0 };
      for (const point of scansOverTime) {
        scansByVerdict.safe += point.safe || 0;
        scansByVerdict.suspicious += point.suspicious || 0;
        scansByVerdict.phishing += point.phishing || 0;
      }
    }

    // Derive verdictTrend when not provided
    let verdictTrend = analyticsData?.verdictTrend;
    if (!Array.isArray(verdictTrend) || verdictTrend.length === 0) {
      verdictTrend = scansOverTime.map(p => ({
        phishing: p.phishing || 0,
        suspicious: p.suspicious || 0,
        safe: p.safe || 0,
      }));
    }

    const totalScans = Object.values(scansByVerdict).reduce((sum, count) => sum + count, 0);
    const phishingCount = scansByVerdict.phishing || 0;

    // Calculate threat level based on phishing percentage
    const phishingPercentage = totalScans > 0 ? (phishingCount / totalScans) * 100 : 0;

    let level = 'low';
    if (phishingPercentage > 15) level = 'high';
    else if (phishingPercentage > 8) level = 'medium';

    setThreatLevel(level);

    // Calculate trends (comparing last two periods if available)
    if (verdictTrend.length >= 2) {
      const current = verdictTrend[verdictTrend.length - 1];
      const previous = verdictTrend[verdictTrend.length - 2];

      const calculateTrendDirection = (curr, prev) => {
        if (curr > prev) return 'up';
        if (curr < prev) return 'down';
        return 'stable';
      };

      setTrends({
        phishing: {
          value: current.phishing || 0,
          change: previous.phishing ? ((current.phishing - previous.phishing) / previous.phishing * 100) : 0,
          direction: calculateTrendDirection(current.phishing || 0, previous.phishing || 0)
        },
        suspicious: {
          value: current.suspicious || 0,
          change: previous.suspicious ? ((current.suspicious - previous.suspicious) / previous.suspicious * 100) : 0,
          direction: calculateTrendDirection(current.suspicious || 0, previous.suspicious || 0)
        },
        safe: {
          value: current.safe || 0,
          change: previous.safe ? ((current.safe - previous.safe) / previous.safe * 100) : 0,
          direction: calculateTrendDirection(current.safe || 0, previous.safe || 0)
        }
      });
    } else if (verdictTrend.length === 1) {
      // Single period: show current values without change
      const current = verdictTrend[0];
      setTrends({
        phishing: { value: current.phishing || 0, change: 0, direction: 'stable' },
        suspicious: { value: current.suspicious || 0, change: 0, direction: 'stable' },
        safe: { value: current.safe || 0, change: 0, direction: 'stable' }
      });
    } else {
      setTrends({ phishing: { value: 0, change: 0, direction: 'stable' }, suspicious: { value: 0, change: 0, direction: 'stable' }, safe: { value: 0, change: 0, direction: 'stable' } });
    }
  };

  const getThreatLevelConfig = (level) => {
    switch (level) {
      case 'high':
        return {
          color: 'text-danger-600',
          bgColor: 'bg-danger-100',
          borderColor: 'border-danger-200',
          icon: FiAlertTriangle,
          label: 'High Risk',
          description: 'Increased phishing activity detected'
        };
      case 'medium':
        return {
          color: 'text-warning-600',
          bgColor: 'bg-warning-100',
          borderColor: 'border-warning-200',
          icon: FiShield,
          label: 'Medium Risk',
          description: 'Moderate threat activity observed'
        };
      default:
        return {
          color: 'text-success-600',
          bgColor: 'bg-success-100',
          borderColor: 'border-success-200',
          icon: FiShield,
          label: 'Low Risk',
          description: 'Normal security levels maintained'
        };
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up':
        return <FiTrendingUp className="h-4 w-4 text-danger-500" />;
      case 'down':
        return <FiTrendingDown className="h-4 w-4 text-success-500" />;
      default:
        return <FiMinus className="h-4 w-4 text-gray-400" />;
    }
  };

  const threatConfig = getThreatLevelConfig(threatLevel);
  const ThreatIcon = threatConfig.icon;

  if (isLoading) {
    return (
      <Card title="Threat Overview" className="lg:col-span-1">
        <div className="flex items-center justify-center h-48">
          <Spinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Threat Overview" className="lg:col-span-1">
      <div className="space-y-6">
        {/* Threat Level Indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-lg border-2 ${threatConfig.bgColor} ${threatConfig.borderColor}`}
        >
          <div className="flex items-center space-x-3">
            <ThreatIcon className={`h-6 w-6 ${threatConfig.color}`} />
            <div>
              <h3 className={`font-semibold ${threatConfig.color}`}>
                {threatConfig.label}
              </h3>
              <p className="text-sm text-gray-600">
                {threatConfig.description}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Threat Trends */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Recent Trends</h4>
          <div className="space-y-2">
            {['phishing', 'suspicious', 'safe'].map(key => (
              <motion.div key={key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="capitalize text-sm text-gray-700">{key}</span>
                    {getTrendIcon(trends[key]?.direction)}
                  </div>
                  <div className="text-sm text-gray-800">
                    {trends[key]?.value || 0}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Security Tips */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Security Tip</h4>
          <p className="text-sm text-blue-700">
            {threatLevel === 'high' 
              ? "Be extra cautious with emails. Verify sender identity through alternative channels."
              : threatLevel === 'medium'
              ? "Stay alert for suspicious emails. When in doubt, don't click links or attachments."
              : "Maintain good email hygiene. Continue monitoring for threats."
            }
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ThreatOverview; 