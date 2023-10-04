import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import { Dashboard } from '@blocklet/studio-ui';
import Footer from '@blocklet/ui-react/lib/Footer';
import { Box, CssBaseline, GlobalStyles, ThemeProvider, createTheme } from '@mui/material';
import { ReactNode, Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

import ErrorBoundary from './components/error/error-boundary';
import Loading from './components/loading';
import { DatasetsProvider } from './contexts/datasets';
import { SessionProvider, useInitialized, useIsPromptEditor } from './contexts/session';
import { translations } from './locales';

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
        <GlobalStyles
          styles={{
            html: {
              height: '100%',
              width: '100%',
            },
            body: {
              height: '100%',
              width: '100%',
            },
            '#app': {
              height: '100%',
              width: '100%',
            },
            '*': {
              WebkitTapHighlightColor: 'transparent',
            },
          }}
        />

        <RecoilRoot>
          <ToastProvider>
            <LocaleProvider translations={translations} fallbackLocale="en">
              <BrowserRouter basename={basename}>
                <SessionProvider serviceHost={basename} protectedRoutes={[`${basename}/*`]}>
                  <Suspense fallback={<Loading fixed />}>
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

const ExportRoutes = lazy(() => import('./pages/export'));

function AppRoutes() {
  const errorBoundary = useRef<ErrorBoundary>(null);

  const location = useLocation();
  useEffect(() => {
    errorBoundary.current?.reset();
  }, [location]);

  const initialized = useInitialized();
  const isPromptEditor = useIsPromptEditor();

  if (!initialized) return <Loading fixed />;

  return (
    <ErrorBoundary ref={errorBoundary}>
      <Routes>
        <Route index element={isPromptEditor ? <Navigate to="projects" replace /> : <Home />} />
        {isPromptEditor ? (
          <>
            <Route path="playground/*" element={<Navigate to="../projects" replace />} />
            <Route path="projects/*" element={<ProjectsRoutes />} />
            <Route
              path="datasets/*"
              element={
                <DatasetsProvider>
                  <DatasetsRoutes />
                </DatasetsProvider>
              }
            />
            <Route path="/admin/resource/component/export" element={<ExportRoutes />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/" />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

const Home = lazy(() => import('./pages/home/home'));

const ProjectsRoutes = lazy(() => import('./pages/project'));

const DatasetsRoutes = lazy(() => import('./pages/datasets'));

function Layout({ children }: { children: ReactNode }) {
  return <Dashboard>{children}</Dashboard>;
}

function NotFound() {
  return (
    <Layout>
      <Box flexGrow={1} textAlign="center">
        <div>Not Found.</div>
      </Box>

      <Footer />
    </Layout>
  );
}
