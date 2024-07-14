import ReactDOM from 'react-dom/client';

import App from './app';
import ErrorBoundary from './components/error/error-boundary';

const SUPPRESSED_WARNINGS = ['Support for defaultProps will be removed'];
const { error } = console;
console.error = (msg, ...args: any[]) => {
  if (typeof msg === 'string' && !SUPPRESSED_WARNINGS.some((entry) => msg.includes(entry))) {
    error(msg, ...args);
  }
};

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
