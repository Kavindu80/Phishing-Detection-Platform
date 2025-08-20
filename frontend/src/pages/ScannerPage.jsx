import { useState, useEffect } from 'react';
import { FiUpload, FiCheck, FiAlertTriangle, FiAlertCircle, FiExternalLink, FiDownload, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Spinner from '../components/common/Spinner';
import ModelStatusNotification from '../components/scanner/ModelStatusNotification';
import ModelInfoPanel from '../components/scanner/ModelInfoPanel';
import LanguageInfo from '../components/scanner/LanguageInfo';
import UrlDisplay from '../components/common/UrlDisplay';
import apiService from '../services/api';
import { formatConfidence, extractDomain } from '../utils/formatUtils';
import { notifyScanCompleted } from '../services/realTimeUpdates';
import useAuth from '../hooks/useAuth';

const ScannerPage = () => {
  const { isAuthenticated } = useAuth();
  const [emailText, setEmailText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [language, setLanguage] = useState('auto');
  const [error, setError] = useState('');
  const [modelStatus, setModelStatus] = useState(null);
  const [isCheckingModel, setIsCheckingModel] = useState(true);
  const [supportedLanguages, setSupportedLanguages] = useState({
    'auto': 'Auto-detect',
    'en': 'English'
  });
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);

  useEffect(() => {
    // Check model status and load languages when component mounts
    checkModelStatus();
    loadSupportedLanguages();
  }, []);

  const loadSupportedLanguages = async () => {
    setIsLoadingLanguages(true);
    try {
      const languageData = await apiService.getSupportedLanguages();
      if (languageData.languages) {
        // Add auto-detect option
        const languages = { 'auto': 'Auto-detect', ...languageData.languages };
        setSupportedLanguages(languages);
      }
    } catch (err) {
      console.error('Error loading supported languages:', err);
      // Keep default languages on error
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  const checkModelStatus = async () => {
    setIsCheckingModel(true);
    try {
      const status = await apiService.checkModelStatus();
      setModelStatus(status);
      
      // Show warning if model is not loaded
      if (!status.model_loaded) {
        setError('ML model is not loaded. The system will use rule-based detection, which may be less accurate.');
      }
    } catch (err) {
      console.error('Error checking model status:', err);
      setError('Could not verify ML model status. The system may use fallback detection methods.');
    } finally {
      setIsCheckingModel(false);
    }
  };

  const handleScan = async () => {
    if (!emailText.trim()) {
      setError('Please enter email content to scan.');
      return;
    }

    setIsScanning(true);
    setError('');

    try {
      // Use authenticated endpoint when logged in so scans are saved to history/analytics
      const result = await apiService.scanEmail(emailText, language, !!isAuthenticated);
      setScanResult(result);
      
      // Notify about the completed scan for real-time updates
      notifyScanCompleted(result);
      
      // Force analytics update by setting session storage flag
      sessionStorage.setItem('analytics_needs_refresh', 'true');
      sessionStorage.setItem('last_scan_time', Date.now().toString());
      
      // Log success
      console.log('Scan completed and analytics refresh triggered');
    } catch (err) {
      setError('An error occurred while scanning. Please try again.');
      console.error(err);
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
    };
    reader.readAsText(file);
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

  const getVerdictBgClass = (verdict) => {
    switch (verdict) {
      case 'safe':
        return 'bg-success-50 border-success-200';
      case 'suspicious':
        return 'bg-warning-50 border-warning-200';
      case 'phishing':
        return 'bg-danger-50 border-danger-200';
      default:
        return 'bg-primary-50 border-primary-200';
    }
  };

  const getVerdictTextClass = (verdict) => {
    switch (verdict) {
      case 'safe':
        return 'text-success-800';
      case 'suspicious':
        return 'text-warning-800';
      case 'phishing':
        return 'text-danger-800';
      default:
        return 'text-primary-800';
    }
  };

  const getVerdictIconClass = (verdict) => {
    switch (verdict) {
      case 'safe':
        return 'text-success-600';
      case 'suspicious':
        return 'text-warning-600';
      case 'phishing':
        return 'text-danger-600';
      default:
        return 'text-primary-600';
    }
  };

  const getVerdictSubTextClass = (verdict) => {
    switch (verdict) {
      case 'safe':
        return 'text-success-700';
      case 'suspicious':
        return 'text-warning-700';
      case 'phishing':
        return 'text-danger-700';
      default:
        return 'text-primary-700';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-danger-100 text-danger-800 border-danger-300';
      case 'medium':
        return 'bg-warning-100 text-warning-800 border-warning-300';
      case 'low':
        return 'bg-info-100 text-info-800 border-info-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'url':
        return 'URL';
      case 'domain':
        return 'Domain';
      case 'url_path':
        return 'Path';
      case 'domain_mismatch':
        return 'Mismatch';
      case 'nonexistent_domain':
        return 'Invalid';
      case 'keyword':
        return 'Keyword';
      case 'url_warning':
        return 'URL Warning';
      case 'verification_warning':
        return 'Verification';
      default:
        return type;
    }
  };

  const handleFeedback = async (isPositive) => {
    if (!scanResult) return;
    
    try {
      // In a real app with proper scan IDs, we would use:
      // await apiService.submitFeedback(scanResult.id, isPositive);
      
      // For now, just show a message
      alert(`Thank you for your feedback! ${isPositive ? 'Glad we got it right.' : 'We\'ll improve our detection.'}`);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  };

  const handleExport = () => {
    if (!scanResult) return;
    
    const dataStr = JSON.stringify(scanResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'scan-result.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Phishing Scanner</h1>
          <p className="mt-2 text-gray-600">
            Paste an email or upload an .eml file to scan for phishing attempts
          </p>
          {modelStatus && modelStatus.model_loaded && (
            <div className="mt-2 text-xs text-success-600">
              ML model loaded and ready for analysis
            </div>
          )}
        </div>

        <ModelStatusNotification />
        <ModelInfoPanel />

        {error && (
          <Alert
            type="danger"
            message={error}
            onClose={() => setError('')}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div>
            <Card title="Email Content" className="h-full">
              <div className="space-y-4">
                <div>
                  <label htmlFor="language" className="form-label">
                    Language
                  </label>
                  <div className="flex items-center mt-1">
                    <select
                      id="language"
                      className="form-input"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      disabled={isLoadingLanguages}
                    >
                      {Object.entries(supportedLanguages).map(([code, name]) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {isLoadingLanguages && (
                      <div className="ml-2">
                        <Spinner size="sm" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="emailContent" className="form-label">
                    Paste email content
                  </label>
                  <textarea
                    id="emailContent"
                    rows={12}
                    className="form-input font-mono text-sm"
                    placeholder="Paste the full email content here..."
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                  ></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      id="emailFile"
                      accept=".eml,.txt,.msg"
                      className="sr-only"
                      onChange={handleFileUpload}
                    />
                    <label
                      htmlFor="emailFile"
                      className="btn btn-outline flex items-center justify-center cursor-pointer"
                    >
                      <FiUpload className="mr-2" />
                      Upload Email File
                    </label>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleScan}
                    isLoading={isScanning}
                    disabled={isScanning || !emailText.trim() || isCheckingModel}
                    className="flex-1"
                  >
                    {isScanning ? 'Scanning...' : 'Scan Email'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            {isScanning || isCheckingModel ? (
              <Card className="h-full flex flex-col items-center justify-center py-12">
                <Spinner size="lg" />
                <p className="mt-4 text-gray-600">Analyzing email content...</p>
              </Card>
            ) : scanResult ? (
              <Card 
                title="Scan Results" 
                className="h-full"
                footer={
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Was this analysis helpful?</span>
                      <button 
                        onClick={() => handleFeedback(true)}
                        className="p-1.5 rounded-full hover:bg-gray-100"
                        title="Yes, this was correct"
                      >
                        <FiThumbsUp className="h-5 w-5 text-gray-600" />
                      </button>
                      <button 
                        onClick={() => handleFeedback(false)}
                        className="p-1.5 rounded-full hover:bg-gray-100"
                        title="No, this was incorrect"
                      >
                        <FiThumbsDown className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleExport}
                    >
                      <FiDownload className="mr-1" /> Export Results
                    </Button>
                  </div>
                }
              >
                <div className="space-y-6">
                  {/* Verdict */}
                  <div className={`${getVerdictBgClass(scanResult.verdict)} rounded-md p-4 flex items-start`}>
                    <div className={`flex-shrink-0 mr-3 ${getVerdictIconClass(scanResult.verdict)}`}>
                      {getVerdictIcon(scanResult.verdict)}
                    </div>
                    <div>
                      <h3 className={`${getVerdictTextClass(scanResult.verdict)} font-medium capitalize`}>
                        {scanResult.verdict} Email Detected
                      </h3>
                      <p className={`mt-1 text-sm ${getVerdictSubTextClass(scanResult.verdict)}`}>
                        Confidence: {formatConfidence(scanResult.confidence)}
                      </p>
                      <p className={`mt-2 text-sm ${getVerdictSubTextClass(scanResult.verdict)}`}>
                        {scanResult.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Suspicious Elements */}
                  {scanResult.suspiciousElements && scanResult.suspiciousElements.length > 0 && (
                    <div className="container-responsive">
                      <h4 className="font-medium text-gray-900 mb-2">Suspicious Elements</h4>
                      <div className="bg-gray-50 rounded-md p-4 border border-gray-200 container-responsive">
                        <ul className="space-y-5">
                          {scanResult.suspiciousElements.map((element, index) => (
                            <li key={index} className="flex flex-col container-responsive">
                              <div className="flex flex-wrap items-center mb-2">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${element.severity ? getSeverityColor(element.severity) : 'bg-gray-100 text-gray-800'} mr-2`}>
                                  {getTypeLabel(element.type)}
                                </span>
                                {element.severity && (
                                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${getSeverityColor(element.severity)}`}>
                                    {element.severity}
                                  </span>
                                )}
                              </div>
                              
                              <div className="w-full container-responsive">
                                {(element.type === 'url' || 
                                  element.type === 'url_warning' || 
                                  element.type === 'verification_warning' ||
                                  element.value.startsWith('http')) ? (
                                  <UrlDisplay url={element.value} />
                                ) : (
                                  <div className="url-display-wrapper">
                                    <div className="bg-white px-3 py-2 rounded border border-gray-200 container-responsive">
                                      <code className="text-sm force-wrap url-text-container">{element.value}</code>
                                    </div>
                                  </div>
                                )}
                                <div className="mt-2 text-sm text-gray-600">
                                  {element.reason}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Recommended Action */}
                  {scanResult.recommendedAction && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommended Action</h4>
                      <p className="text-sm text-gray-700">{scanResult.recommendedAction}</p>
                    </div>
                  )}

                  {/* Language Information */}
                  {scanResult.languageInfo && (
                    <LanguageInfo languageInfo={scanResult.languageInfo} />
                  )}

                  {/* Links */}
                  {scanResult.suspiciousElements && scanResult.suspiciousElements.some(el => 
                    el.type === 'url' || 
                    el.type === 'domain' || 
                    el.type === 'url_warning' || 
                    el.type === 'verification_warning' ||
                    el.value.startsWith('http')
                  ) && (
                    <div className="mt-5 container-responsive">
                      <h4 className="font-medium text-gray-900 mb-2">Link Analysis</h4>
                      <div className="bg-gray-50 rounded-md p-4 border border-gray-200 container-responsive">
                        <ul className="space-y-5">
                          {scanResult.suspiciousElements
                            .filter(el => 
                              el.type === 'url' || 
                              el.type === 'domain' || 
                              el.type === 'url_warning' || 
                              el.type === 'verification_warning' ||
                              el.value.startsWith('http')
                            )
                            .map((element, index) => (
                              <li key={index} className="flex flex-col container-responsive">
                                <div className="flex flex-wrap items-center mb-2">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium mr-2 ${element.severity ? getSeverityColor(element.severity) : 'bg-gray-100 text-gray-800'}`}>
                                    {getTypeLabel(element.type)}
                                  </span>
                                  {element.severity && (
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${getSeverityColor(element.severity)}`}>
                                      {element.severity}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="w-full mb-3 container-responsive">
                                  <UrlDisplay url={element.value} />
                                  <div className="mt-2 text-sm text-gray-600">
                                    {element.reason}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <button 
                                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center bg-white px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                                    onClick={() => alert(`This would check ${extractDomain(element.value)} against safe browsing databases`)}
                                  >
                                    Safe Browsing <FiExternalLink className="ml-1 h-3 w-3" />
                                  </button>
                                  <button 
                                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center bg-white px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                                    onClick={() => alert(`This would show WHOIS information for ${extractDomain(element.value)}`)}
                                  >
                                    WHOIS <FiExternalLink className="ml-1 h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="h-full flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-100 p-4 rounded-full">
                  <FiAlertTriangle className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Scan Results</h3>
                <p className="mt-2 text-gray-600 max-w-md">
                  Paste an email in the text area or upload an email file and click "Scan Email" to check for phishing attempts.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage; 