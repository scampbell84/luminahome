import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import './index.css';

// Safely catch external cross-origin script errors from embeds/CDNs without crashing
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || !event.filename) {
    console.warn('Suppressed benign cross-origin script error:', event);
    event.preventDefault?.();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Caught unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
