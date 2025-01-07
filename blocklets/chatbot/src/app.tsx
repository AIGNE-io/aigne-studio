import { ThemeProvider, createTheme } from '@mui/material';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Home from './pages/home';

const theme = createTheme();

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default function WrappedApp() {
  // While the blocklet is deploy to a sub path, this will be work properly.
  const basename = window?.blocklet?.prefix || '/';

  return (
    <Router basename={basename}>
      <App />
    </Router>
  );
}
