import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock the components that might not be available in test environment
jest.mock('./components/layout/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('./components/layout/Footer', () => {
  return function MockFooter() {
    return <div data-testid="footer">Footer</div>;
  };
});

// Mock the pages
jest.mock('./pages/HomePage', () => {
  return function MockHomePage() {
    return <div data-testid="home-page">Home Page</div>;
  };
});

jest.mock('./pages/DashboardPage', () => {
  return function MockDashboardPage() {
    return <div data-testid="dashboard-page">Dashboard Page</div>;
  };
});

jest.mock('./pages/ScannerPage', () => {
  return function MockScannerPage() {
    return <div data-testid="scanner-page">Scanner Page</div>;
  };
});

jest.mock('./pages/AnalyticsPage', () => {
  return function MockAnalyticsPage() {
    return <div data-testid="analytics-page">Analytics Page</div>;
  };
});

jest.mock('./pages/LoginPage', () => {
  return function MockLoginPage() {
    return <div data-testid="login-page">Login Page</div>;
  };
});

jest.mock('./pages/RegisterPage', () => {
  return function MockRegisterPage() {
    return <div data-testid="register-page">Register Page</div>;
  };
});

jest.mock('./pages/InboxPage', () => {
  return function MockInboxPage() {
    return <div data-testid="inbox-page">Inbox Page</div>;
  };
});

jest.mock('./pages/PublicScannerPage', () => {
  return function MockPublicScannerPage() {
    return <div data-testid="public-scanner-page">Public Scanner Page</div>;
  };
});

jest.mock('./pages/ScanDetailPage', () => {
  return function MockScanDetailPage() {
    return <div data-testid="scan-detail-page">Scan Detail Page</div>;
  };
});

// Mock the context providers
jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    isAuthenticated: false,
    loading: false
  })
}));

jest.mock('./context/AnalyticsContext', () => ({
  AnalyticsProvider: ({ children }) => <div data-testid="analytics-provider">{children}</div>,
  useAnalytics: () => ({
    analytics: [],
    loading: false,
    fetchAnalytics: jest.fn()
  })
}));

// Test wrapper component
const TestWrapper = ({ children }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('App Component', () => {
  test('renders without crashing', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
  });

  test('renders analytics provider', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    expect(screen.getByTestId('analytics-provider')).toBeInTheDocument();
  });

  test('renders header component', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  test('renders footer component', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  test('has basic app structure', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    
    // Check that the app has the basic structure
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-provider')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
}); 