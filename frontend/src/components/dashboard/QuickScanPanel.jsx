import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiUpload, FiX, FiCheck, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../common/Card';
import Button from '../common/Button';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import LanguageInfo from '../scanner/LanguageInfo';
import apiService from '../../services/api';
import { formatConfidence } from '../../utils/formatUtils';

const QuickScanPanel = ({ onScanComplete }) => {
  const [subject, setSubject] = useState('');
  const [emailText, setEmailText] = useState('');
  const [language, setLanguage] = useState('auto');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState({ auto: 'Auto-detect', en: 'English' });
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);

  // Load supported languages from backend
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await apiService.getSupportedLanguages();
        if (isMounted && data.languages) {
          setSupportedLanguages({ auto: 'Auto-detect', ...data.languages });
        }
              } catch {
          // Keep defaults
        } finally {
          setIsLoadingLanguages(false);
        }
    })();
    return () => { isMounted = false; };
  }, []);

  // Auto-extract subject when user pastes content
  useEffect(() => {
    if (!subject) {
      const firstLines = emailText.split('\n').slice(0, 8);
      const explicit = firstLines.find(l => l.toLowerCase().startsWith('subject:'));
      if (explicit) {
        setSubject(explicit.replace(/^subject:\s*/i, '').trim());
        return;
      }
      const firstNonEmpty = firstLines.find(l => l.trim().length > 0);
      if (firstNonEmpty && firstNonEmpty.length < 100) {
        setSubject(firstNonEmpty.trim());
      }
    }
  }, [emailText]);

  const handleScan = async () => {
    if (!emailText.trim()) {
      setError('Please enter email content to scan.');
      return;
    }

    setIsScanning(true);
    setError('');
    setScanResult(null);

    try {
      // Combine subject + body for server parsing without making subject mandatory
      const combinedText = subject ? `Subject: ${subject}\n\n${emailText}` : emailText;
      const result = await apiService.scanEmail(combinedText, language, true);
      
      // Prefer server subject if returned, else use user-entered/auto-extracted
      const enhancedResult = {
        ...result,
        subject: result.subject || subject || 'Quick Scan',
        sender: result.sender || 'Manual Scan',
        timestamp: new Date().toISOString()
      };
      
      setScanResult(enhancedResult);
      onScanComplete?.(enhancedResult);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred while scanning.';
      setError(`Scan failed: ${errorMessage}. Please check if the backend is running.`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setEmailText(event.target.result);
      setScanResult(null);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEmailText(event.target.result);
        setScanResult(null);
        setError('');
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const clearScan = () => {
    setEmailText('');
    setScanResult(null);
    setError('');
  };

  const getVerdictColor = (verdict) => {
    switch (verdict) {
      case 'safe':
        return 'text-success-600 bg-success-100';
      case 'suspicious':
        return 'text-warning-600 bg-warning-100';
      case 'phishing':
        return 'text-danger-600 bg-danger-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getVerdictIcon = (verdict) => {
    switch (verdict) {
      case 'safe':
        return <FiCheck className="h-5 w-5" />;
      case 'suspicious':
        return <FiAlertTriangle className="h-5 w-5" />;
      case 'phishing':
        return <FiAlertCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Card title="Quick Scan" className="lg:col-span-1">
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">
          Quickly check an email for phishing attempts by pasting the content below.
        </p>

        {/* File Upload and Test Button */}
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer text-sm text-primary-600 hover:text-primary-700">
            <FiUpload className="h-4 w-4" />
            <span>Upload email file</span>
            <input
              type="file"
              accept=".txt,.eml,.msg"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => {
              const testEmail = `Subject: Urgent Account Verification Required

Dear Valued Customer,

Your account has been temporarily suspended due to unusual activity. To restore access, please verify your identity immediately by clicking the link below:

http://verify-account-security.com/login

This link will expire in 24 hours. Failure to verify will result in permanent account closure.

Best regards,
Security Team`;
              setEmailText(testEmail);
              setScanResult(null);
              setError('');
            }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Load test email
          </button>
        </div>

        {/* Subject (optional) */}
        <div>
          <label className="form-label">Subject (optional)</label>
          <input
            className="form-input text-sm w-full"
            type="text"
            placeholder="If not present, we'll auto-detect from the content"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isScanning}
          />
        </div>

        {/* Text Area with Drag & Drop */}
        <div
          className={`relative ${isDragOver ? 'border-primary-400 bg-primary-50' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <textarea
            className="form-input font-mono text-sm min-h-[120px] w-full"
            rows={5}
            placeholder="Paste email content here or drag & drop a text file..."
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            disabled={isScanning}
          />
          {emailText && (
            <button
              onClick={clearScan}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Language Selection and Scan Button */}
        <div className="flex justify-between items-center space-x-3">
          <select 
            className="form-input text-sm flex-1"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isScanning || isLoadingLanguages}
          >
            {Object.entries(supportedLanguages).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          <Button 
            variant="primary" 
            size="sm"
            onClick={handleScan}
            disabled={isScanning || !emailText.trim()}
            className="min-w-[100px]"
          >
            {isScanning ? <Spinner size="sm" /> : 'Scan Now'}
          </Button>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Alert type="error" message={error} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scan Result */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 p-4 border rounded-lg bg-gray-50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getVerdictIcon(scanResult.verdict)}
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVerdictColor(scanResult.verdict)}`}>
                    {scanResult.verdict.charAt(0).toUpperCase() + scanResult.verdict.slice(1)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {formatConfidence(scanResult.confidence)} confidence
                </span>
              </div>

              {/* Language info */}
              {scanResult.languageInfo && (
                <div className="mb-3">
                  <LanguageInfo languageInfo={scanResult.languageInfo} />
                </div>
              )}
              
              {scanResult.explanation && (
                <p className="text-sm text-gray-700 mb-2">
                  {scanResult.explanation}
                </p>
              )}
              
              {scanResult.recommendedAction && (
                <p className="text-sm text-primary-600 font-medium">
                  {scanResult.recommendedAction}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Advanced Scanner Link */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <Link 
          to="/scanner" 
          className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center transition-colors"
        >
          Go to Advanced Scanner
          <FiArrowRight className="ml-1" />
        </Link>
      </div>
    </Card>
  );
};

export default QuickScanPanel; 