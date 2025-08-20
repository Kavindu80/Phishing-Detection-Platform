import { render, screen } from '@testing-library/react';
import App from './App';

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