import { render, screen } from '@testing-library/react';
import App from '../../App';

// Mock React Router
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }) => <div data-testid="routes">{children}</div>,
  Route: ({ children }) => <div data-testid="route">{children}</div>,
}));

// Mock components that might cause issues
jest.mock('../../components/layout/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header</div>;
  };
});

jest.mock('../../components/layout/Footer', () => {
  return function MockFooter() {
    return <div data-testid="footer">Footer</div>;
  };
});

test('renders app without crashing', () => {
  render(<App />);
  // Basic test to ensure the app renders without crashing
  expect(document.body).toBeInTheDocument();
});

test('app has basic structure', () => {
  render(<App />);
  // Check if the app has some basic structure
  const appElement = document.querySelector('#root');
  expect(appElement).toBeInTheDocument();
});

test('renders router component', () => {
  render(<App />);
  expect(screen.getByTestId('router')).toBeInTheDocument();
});

test('renders routes component', () => {
  render(<App />);
  expect(screen.getByTestId('routes')).toBeInTheDocument();
}); 