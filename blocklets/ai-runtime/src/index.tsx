import ReactDOM from 'react-dom/client';

import App from './app';

(window as any).AI_RUNTIME_API_PREFIX = window.blocklet.prefix;

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(<App />);
