import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SkipLink } from './components/common/SkipLink';
import './index.css';

// Initialize accessibility in development
if (import.meta.env.DEV) {
  // Dynamically import axe-core for accessibility testing
  import('@axe-core/react')
    .then((axe) => {
      import('react').then((React) => {
        import('react-dom/client').then((ReactDOM) => {
          // Initialize axe-core for accessibility testing
          if (axe.default && React.default && ReactDOM.default) {
            axe.default(React.default, ReactDOM.default, 1000);
          }
        });
      });
    })
    .catch(() => {
      // Silently fail if axe-core is not available
    });
}

const root = createRoot(document.getElementById('root')!);

root.render(
  <ErrorBoundary>
    <SkipLink />
    <App />
  </ErrorBoundary>
);
