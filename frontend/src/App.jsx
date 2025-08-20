import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { AnalyticsProvider } from './context/AnalyticsContext';


// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ScannerPage from './pages/ScannerPage';
import PublicScannerPage from './pages/PublicScannerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import InboxPage from './pages/InboxPage';
import ScanDetailPage from './pages/ScanDetailPage';

// API service for health check
import apiService from './services/api';

function App() {
  const [apiHealthy, setApiHealthy] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(true);

  useEffect(() => {
    // Check API health when app loads
    const checkApiHealth = async () => {
      try {
        setCheckingHealth(true);
        await apiService.checkHealth();
        setApiHealthy(true);
      } catch (error) {
        console.error('API health check failed:', error);
        setApiHealthy(false);
      } finally {
        setCheckingHealth(false);
      }
    };

    checkApiHealth();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AnalyticsProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage apiHealthy={apiHealthy} checkingHealth={checkingHealth} />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                
                {/* Public scanner route - accessible without login */}
                <Route path="public-scanner" element={<PublicScannerPage />} />
                
                {/* Protected routes */}
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="scanner" 
                  element={
                    <ProtectedRoute>
                      <ScannerPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="analytics" 
                  element={
                    <ProtectedRoute>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="scanner/history/:scanId" 
                  element={
                    <ProtectedRoute>
                      <ScanDetailPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="inbox" 
                  element={
                    <ProtectedRoute>
                      <InboxPage />
                    </ProtectedRoute>
                  } 
                />
              </Route>
              
              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
          <ToastContainer position="top-right" autoClose={3000} />
        </AnalyticsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
