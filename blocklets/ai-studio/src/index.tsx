import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import App from './app';
import DynamicModuleErrorView from './components/DynamicModuleErrorView';

const SUPPRESSED_WARNINGS = ['Support for defaultProps will be removed'];
const { error } = console;
console.error = (msg, ...args: any[]) => {
  if (typeof msg === 'string' && !SUPPRESSED_WARNINGS.some((entry) => msg.includes(entry))) {
    error(msg, ...args);
  }
};

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(
  <ErrorBoundary FallbackComponent={DynamicModuleErrorView}>
    <App />
  </ErrorBoundary>
);
