import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import { Dashboard } from '@blocklet/studio-ui';
import Footer from '@blocklet/ui-react/lib/Footer';
import { Box, CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { ReactNode, Suspense, lazy, useEffect, useRef } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useLocation,
} from 'react-router-dom';
import { RecoilRoot } from 'recoil';

import ErrorBoundary from './components/error/error-boundary';
import Loading from './components/loading';
import { DatasetsProvider } from './contexts/datasets';
import { SessionProvider, useInitialized, useIsPromptEditor } from './contexts/session';
import { translations } from './locales';
import { theme } from './theme/theme';

export default function App() {
  const basename = window.blocklet?.prefix || '/';

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
              fontSize: '0.875rem',
            },
            '*': {
              WebkitTapHighlightColor: 'transparent',
            },
          }}
        />

        <RecoilRoot>
          <ToastProvider>
            <LocaleProvider translations={translations} fallbackLocale="en">
              <SessionProvider serviceHost={basename} protectedRoutes={[`${basename}/*`]}>
                <Suspense fallback={<Loading fixed />}>
                  <AppRoutes basename={basename} />
                </Suspense>
              </SessionProvider>
            </LocaleProvider>
          </ToastProvider>
        </RecoilRoot>
      </CssBaseline>
    </ThemeProvider>
  );
}

function LocationListener({ errorBoundaryRef }: { errorBoundaryRef: React.RefObject<ErrorBoundary> }) {
  const location = useLocation();

  useEffect(() => {
    errorBoundaryRef.current?.reset();
  }, [location]);

  return <Outlet />;
}

function AppRoutes({ basename }: { basename: string }) {
  const errorBoundary = useRef<ErrorBoundary>(null);

  const initialized = useInitialized();
  const isPromptEditor = useIsPromptEditor();

  if (!initialized) return <Loading fixed />;

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<LocationListener errorBoundaryRef={errorBoundary} />}>
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
            <Route path="embed/*" element={<EmbedRoutes />} />
            <Route path="billing/*" element={<BillingRoutes />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/" />} />
        )}
        <Route path="*" element={<NotFound />} />
      </Route>
    ),
    { basename }
  );

  return (
    <ErrorBoundary ref={errorBoundary}>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

const Home = lazy(() => import('./pages/home/home'));

const ProjectsRoutes = lazy(() => import('./pages/project'));

const DatasetsRoutes = lazy(() => import('./pages/datasets'));

const EmbedRoutes = lazy(() => import('./pages/embed'));

const BillingRoutes = lazy(() => import('./pages/billing'));

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
