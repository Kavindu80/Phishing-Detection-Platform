import { useState, useEffect } from 'react';
import { FiMail, FiRefreshCw, FiTrash2, FiAlertCircle, FiAlertTriangle, FiCheck, FiSearch, FiFilter, FiInfo } from 'react-icons/fi';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Spinner from '../components/common/Spinner';
import apiService from '../services/api';
import cacheService from '../services/cacheService';
import { notifyScanCompleted } from '../services/realTimeUpdates';
import UrlDisplay from '../components/common/UrlDisplay';

const InboxPage = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showConnect, setShowConnect] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Handle OAuth redirect params e.g., /inbox?connected=true or ?error=true
    try {
      const params = new URLSearchParams(window.location.search);
      const justConnected = params.get('connected') === 'true';
      const hadError = params.get('error') === 'true';

      if (justConnected) {
        // Clear any stale connection/email cache and avoid showing connect card
        cacheService.clearCache('gmail_connection');
        cacheService.clearCache(cacheService.CACHE_KEYS.INBOX_EMAILS);
        setShowConnect(false);
        setConnected(true); // optimistic until verified
        setInitialLoading(true);
      }

      if (hadError) {
        // Ensure connect card is shown if callback reported an error
        cacheService.clearCache('gmail_connection');
        setShowConnect(true);
        setConnected(false);
      }

      // Clean the URL so refreshes don't repeat this logic
      if (justConnected || hadError) {
        window.history.replaceState({}, '', '/inbox');
      }
    } catch {
      // Ignore URL parsing errors
    }

    checkGmailConnection();
  }, []);

  const checkGmailConnection = async () => {
    try {
      setInitialLoading(true);
      
      // Try to get cached connection status first
      const cachedConnection = cacheService.getCache('gmail_connection');
      
      if (cachedConnection) {
        setConnected(cachedConnection.connected);
        
        if (cachedConnection.connected) {
          // Check for cached emails
          const cachedEmails = cacheService.getCache(cacheService.CACHE_KEYS.INBOX_EMAILS);
          
          if (cachedEmails) {
            setEmails(cachedEmails);
            setLastUpdated(new Date(cacheService.getCache('last_inbox_update') || Date.now()));
            setInitialLoading(false);
            return;
          }
        } else {
          setShowConnect(true);
          setInitialLoading(false);
          return;
        }
      }
      
      // If no cached data or it's expired, fetch fresh data
      const response = await apiService.checkGmailConnection();
      setConnected(response.connected);
      
      // Cache the connection status
      cacheService.setCache('gmail_connection', response);
      
      if (response.connected) {
        await fetchEmails(true);
      } else {
        setShowConnect(true);
        setInitialLoading(false);
      }
    } catch (err) {
      console.error('Error checking Gmail connection:', err);
      setError('Could not verify Gmail connection status');
      setInitialLoading(false);
    }
  };

  const connectGmail = async () => {
    try {
      setLoading(true);
      // Get the authorization URL from the backend
      const response = await apiService.connectGmail();
      
      if (response && response.auth_url) {
        // Redirect to Google's OAuth page
        window.location.href = response.auth_url;
      } else {
        setError('Failed to get Gmail authorization URL');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error connecting to Gmail:', err);
      setError('Could not connect to Gmail. Please try again.');
      setLoading(false);
    }
  };

  const fetchEmails = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setInitialLoading(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiService.fetchGmailEmails();
      setEmails(response.emails || []);
      setError('');
      
      // Cache the emails and update timestamp
      cacheService.setCache(cacheService.CACHE_KEYS.INBOX_EMAILS, response.emails || []);
      const now = Date.now();
      cacheService.setCache('last_inbox_update', now);
      setLastUpdated(new Date(now));
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Could not fetch emails from Gmail');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const scanEmail = async (emailId) => {
    try {
      setScanning(true);
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const result = await apiService.scanGmailEmail(emailId);
      
      // Ensure confidence is properly normalized
      let confidenceValue = result.confidence;
      if (typeof confidenceValue === 'string') {
        confidenceValue = parseFloat(confidenceValue);
      }
      
      // Normalize confidence to be between 0-100
      if (confidenceValue > 100) {
        confidenceValue = 100;
      } else if (confidenceValue > 1) {
        // Already a percentage, no need to modify
      } else {
        confidenceValue = confidenceValue * 100;
      }
      
      // Update the result with normalized confidence
      const normalizedResult = {
        ...result,
        confidence: confidenceValue
      };
      
      setScanResult(normalizedResult);
      
      // Update email in list with scan result
      const updatedEmails = emails.map(e => {
        if (e.id === emailId) {
          return { ...e, scanned: true, verdict: result.verdict, confidence: confidenceValue };
        }
        return e;
      });
      setEmails(updatedEmails);
      cacheService.setCache(cacheService.CACHE_KEYS.INBOX_EMAILS, updatedEmails);
      cacheService.setCache('last_inbox_update', Date.now());

      // Notify analytics and dashboard to refresh immediately
      notifyScanCompleted({ ...normalizedResult, id: result.id || emailId });
      sessionStorage.setItem('analytics_needs_refresh', 'true');
      sessionStorage.setItem('force_immediate_refresh', 'true');
      sessionStorage.setItem('last_scan_time', Date.now().toString());
      
    } catch (err) {
      console.error('Error scanning email:', err);
      setError('Could not scan this email');
    } finally {
      setScanning(false);
    }
  };

  const selectEmail = (email) => {
    setSelectedEmail(email);
    
    // If the email has already been scanned, show the result
    if (email.scanned) {
      // Fetch the detailed scan result for this email
      fetchScanResult(email.id);
    } else {
      setScanResult(null);
    }
  };

  const fetchScanResult = async (emailId) => {
    try {
      // This would be an API call to get detailed scan results
      // For now, we're just using the basic verdict from the email
      const email = emails.find(e => e.id === emailId);
      if (!email || !email.scanned) return;
      
      // Format confidence value correctly
      let confidenceValue = email.confidence;
      if (typeof confidenceValue === 'string') {
        confidenceValue = parseFloat(confidenceValue);
      }
      
      // Normalize confidence to be between 0-100
      if (confidenceValue > 1) {
        confidenceValue = Math.min(100, confidenceValue);
      } else {
        confidenceValue = confidenceValue * 100;
      }
      
      // In a real implementation, fetch detailed results from the backend
      // For now, we'll simulate it
      setScanResult({
        verdict: email.verdict,
        confidence: confidenceValue,
        suspiciousElements: [],
        explanation: `This email was detected as ${email.verdict} with ${Math.round(confidenceValue)}% confidence.`,
        recommendedAction: email.verdict === 'phishing' 
          ? 'We recommend deleting this email and not clicking any links.' 
          : 'This email appears to be safe, but always remain vigilant.'
      });
      
    } catch (err) {
      console.error('Error fetching scan result:', err);
    }
  };

  const handleRefresh = () => {
    fetchEmails(false);
  };

  // Filter and search emails
  const filteredEmails = emails.filter(email => {
    const matchesSearch = searchTerm === '' || 
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.snippet?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'phishing' && email.verdict === 'phishing') ||
      (filterStatus === 'safe' && email.verdict === 'safe') ||
      (filterStatus === 'suspicious' && email.verdict === 'suspicious') ||
      (filterStatus === 'unscanned' && !email.scanned);
      
    return matchesSearch && matchesFilter;
  });
  
  const getVerdictBadge = (verdict) => {
    if (!verdict) return null;
    
    let icon = <FiInfo />;
    let colorClass = 'bg-gray-100 text-gray-800';
    
    if (verdict === 'phishing') {
      icon = <FiAlertCircle />;
      colorClass = 'bg-red-100 text-red-800';
    } else if (verdict === 'suspicious') {
      icon = <FiAlertTriangle />;
      colorClass = 'bg-yellow-100 text-yellow-800';
    } else if (verdict === 'safe') {
      icon = <FiCheck />;
      colorClass = 'bg-green-100 text-green-800';
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
        <span className="mr-1">{icon}</span>
        <span className="capitalize">{verdict}</span>
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gmail Inbox</h1>
        <div className="flex space-x-3">
          {lastUpdated && (
            <div className="text-sm text-gray-500 self-center mr-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          {connected && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setLoading(true);
                  await apiService.disconnectGmail();
                  // Clear inbox caches for this session
                  cacheService.clearCache(cacheService.CACHE_KEYS.INBOX_EMAILS);
                  cacheService.setCache('gmail_connection', { connected: false });
                  setConnected(false);
                  setShowConnect(true);
                  setEmails([]);
                } catch {
                  setError('Failed to disconnect Gmail');
                } finally {
                  setLoading(false);
                }
              }}
              className="flex items-center"
            >
              Disconnect Gmail
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={loading || !connected}
            className="flex items-center"
          >
            <FiRefreshCw className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          type="danger"
          message={error}
          onClose={() => setError('')}
          className="mb-6"
        />
      )}

      {showConnect && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6 text-center">
          <FiMail className="mx-auto h-12 w-12 text-primary-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Gmail Account</h2>
          <p className="text-gray-600 mb-4">
            Connect your Gmail account to scan and analyze your emails for phishing threats.
            PhishGuard will only read your emails to protect you and won't store your credentials.
          </p>
          <Button variant="primary" onClick={connectGmail}>
            Connect Gmail
          </Button>
        </div>
      )}

      {connected && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List Panel */}
          <div className="lg:col-span-1">
            <Card 
              title="Emails" 
              className="h-full"
              footer={
                <div className="text-xs text-gray-500">
                  {filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''} found
                </div>
              }
            >
              <div className="mb-4 flex flex-col space-y-3">
                <div className="flex space-x-2 items-center">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Search emails..."
                      className="form-input pl-9 pr-4 py-2 w-full"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FiSearch className="absolute left-3 top-3 text-gray-400" />
                  </div>
                </div>

                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${filterStatus === 'all' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('phishing')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${filterStatus === 'phishing' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    Phishing
                  </button>
                  <button
                    onClick={() => setFilterStatus('suspicious')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${filterStatus === 'suspicious' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    Suspicious
                  </button>
                  <button
                    onClick={() => setFilterStatus('safe')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${filterStatus === 'safe' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    Safe
                  </button>
                  <button
                    onClick={() => setFilterStatus('unscanned')}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${filterStatus === 'unscanned' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    Unscanned
                  </button>
                </div>
              </div>

              {initialLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Spinner size="md" />
                  <span className="ml-3 text-gray-500">Loading inbox...</span>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No emails found.
                </div>
              ) : (
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      className={`p-3 border border-gray-100 rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${selectedEmail?.id === email.id ? 'bg-gray-50 border-primary-200' : ''}`}
                      onClick={() => selectEmail(email)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-sm text-gray-900 truncate max-w-[70%]">
                          {email.subject || '(No Subject)'}
                        </div>
                        <div>
                          {email.scanned ? (
                            getVerdictBadge(email.verdict)
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Unscanned
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-1">
                        From: {email.from}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {email.snippet || 'No preview available'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(email.date).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Email Content and Analysis Panel */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <div className="space-y-4">
                <Card title="Email Content">
                  <div className="mb-4 border-b border-gray-200 pb-4">
                    <div className="text-xl font-medium text-gray-900 mb-2">
                      {selectedEmail.subject || '(No Subject)'}
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <div>
                        From: <span className="font-medium">{selectedEmail.from}</span>
                      </div>
                      <div>{new Date(selectedEmail.date).toLocaleString()}</div>
                    </div>
                    {selectedEmail.to && (
                      <div className="text-sm text-gray-600 mt-1">
                        To: <span className="font-medium">{selectedEmail.to}</span>
                      </div>
                    )}
                  </div>

                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.body || selectedEmail.snippet }} />
                    
                    {!selectedEmail.body && !selectedEmail.content && (
                      <div className="text-gray-500 italic">
                        Full email content not available. Only preview snippet is shown.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    {!selectedEmail.scanned && (
                      <Button 
                        variant="primary" 
                        onClick={() => scanEmail(selectedEmail.id)} 
                        disabled={scanning}
                        isLoading={scanning}
                      >
                        Scan for Threats
                      </Button>
                    )}
                  </div>
                </Card>

                {scanResult && (
                  <Card title="Phishing Analysis">
                    <div className={`rounded-md p-4 mb-4 ${
                      scanResult.verdict === 'phishing' ? 'bg-red-50 border border-red-200' :
                      scanResult.verdict === 'suspicious' ? 'bg-yellow-50 border border-yellow-200' :
                      'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 mr-3 ${
                          scanResult.verdict === 'phishing' ? 'text-red-500' :
                          scanResult.verdict === 'suspicious' ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {scanResult.verdict === 'phishing' ? <FiAlertCircle className="h-5 w-5" /> :
                           scanResult.verdict === 'suspicious' ? <FiAlertTriangle className="h-5 w-5" /> :
                           <FiCheck className="h-5 w-5" />}
                        </div>
                        <div>
                          <h3 className={`font-medium ${
                            scanResult.verdict === 'phishing' ? 'text-red-800' :
                            scanResult.verdict === 'suspicious' ? 'text-yellow-800' :
                            'text-green-800'
                          } capitalize`}>
                            {scanResult.verdict} Email Detected
                          </h3>
                          <p className={`mt-1 text-sm ${
                            scanResult.verdict === 'phishing' ? 'text-red-700' :
                            scanResult.verdict === 'suspicious' ? 'text-yellow-700' :
                            'text-green-700'
                          }`}>
                            Confidence: {(() => {
                              // Ensure confidence is displayed correctly
                              let confidenceValue = scanResult.confidence;
                              if (typeof confidenceValue === 'string') {
                                confidenceValue = parseFloat(confidenceValue);
                              }
                              // If confidence is already a percentage (>1), cap it at 100
                              if (confidenceValue > 1 && confidenceValue <= 100) {
                                return Math.round(confidenceValue);
                              } 
                              // If confidence is >100, cap it at 100
                              else if (confidenceValue > 100) {
                                return 100;
                              } 
                              // If confidence is a probability (≤1), convert to percentage
                              else {
                                return Math.round(confidenceValue * 100);
                              }
                            })()}%
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Analysis</h4>
                      <p className="text-gray-700">{scanResult.explanation}</p>
                    </div>

                    {scanResult.suspiciousElements && scanResult.suspiciousElements.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Suspicious Elements</h4>
                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200 container-responsive">
                          <ul className="space-y-2">
                            {scanResult.suspiciousElements.map((element, index) => (
                              <li key={index} className="flex items-start container-responsive">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                                  {element.type}
                                </span>
                                <div className="w-full min-w-0">
                                  {(
                                    ['url','domain','url_warning','verification_warning'].includes(String(element.type).toLowerCase()) ||
                                    (typeof element.value === 'string' && element.value.startsWith('http'))
                                  ) ? (
                                    <UrlDisplay url={element.value} />
                                  ) : (
                                    <code className="text-sm bg-gray-100 px-1 py-0.5 rounded force-wrap url-text-container">{element.value}</code>
                                  )}
                                  <p className="text-xs text-gray-600 mt-0.5 break-anywhere">{element.reason}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recommended Action</h4>
                      <p className="text-gray-700">{scanResult.recommendedAction}</p>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="h-full flex flex-col items-center justify-center py-12">
                <FiMail className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Email Selected</h3>
                <p className="mt-1 text-gray-500">
                  Select an email from the list to view its content and analyze it for threats.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxPage; 