import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import Footer from '@blocklet/ui-react/lib/Footer';
import Header from '@blocklet/ui-react/lib/Header';
import { Global, css } from '@emotion/react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ReactNode, Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

import ErrorBoundary from './components/error/error-boundary';
import Loading from './components/loading';
import { DatasetsProvider } from './contexts/datasets';
import { SessionProvider, useIsRole } from './contexts/session';
import { translations } from './locales';
import { HomeLazy } from './pages/home';

export default function App() {
  const basename = window.blocklet?.prefix || '/';

  const theme = useMemo(() => {
    return createTheme({
      typography: {
        button: {
          textTransform: 'none',
        },
      },
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <Global
          styles={css`
            #app {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
          `}
        />

        <RecoilRoot>
          <ToastProvider>
            <LocaleProvider translations={translations} fallbackLocale="en">
              <BrowserRouter basename={basename}>
                <SessionProvider serviceHost={basename}>
                  <Suspense fallback={<Loading />}>
                    <AppRoutes />
                  </Suspense>
                </SessionProvider>
              </BrowserRouter>
            </LocaleProvider>
          </ToastProvider>
        </RecoilRoot>
      </CssBaseline>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const isAdmin = useIsRole('owner', 'admin');

  const errorBoundary = useRef<ErrorBoundary>(null);

  const location = useLocation();
  useEffect(() => {
    errorBoundary.current?.reset();
  }, [location]);

  return (
    <ErrorBoundary ref={errorBoundary}>
      <Routes>
        <Route index element={<HomeLazy />} />
        <Route
          path="*"
          element={
            isAdmin ? (
              <DatasetsProvider>
                <Outlet />
              </DatasetsProvider>
            ) : (
              <Navigate to="/" />
            )
          }>
          <Route path="playground/*" element={<Navigate to="../projects" replace />} />
          <Route path="projects/*" element={<ProjectsRoutes />} />
          <Route path="datasets/*" element={<DatasetsRoutes />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

const ProjectsRoutes = lazy(() => import('./pages/projects'));

const DatasetsRoutes = lazy(() => import('./pages/datasets'));

function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header maxWidth={null} />

      {children}

      <Footer />
    </>
  );
}

function NotFound() {
  return (
    <Layout>
      <Box flexGrow={1} textAlign="center">
        <div>Not Found.</div>
      </Box>
    </Layout>
  );
}
