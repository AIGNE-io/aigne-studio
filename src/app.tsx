import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import Footer from '@blocklet/ui-react/lib/Footer';
import Header from '@blocklet/ui-react/lib/Header';
import { Global, css } from '@emotion/react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ReactNode, Suspense, lazy, useMemo } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';
import { RecoilRoot } from 'recoil';

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
            <LocaleProvider translations={translations}>
              <SessionProvider serviceHost={basename}>
                <AppRoutes basename={basename} />
              </SessionProvider>
            </LocaleProvider>
          </ToastProvider>
        </RecoilRoot>
      </CssBaseline>
    </ThemeProvider>
  );
}

function AppRoutes({ basename }: { basename: string }) {
  const isAdmin = useIsRole('owner', 'admin');

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route>
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
          <Route path="projects/*">
            <Route index element={<Navigate to="default" />} />
            <Route path="default/*" element={<ProjectPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="datasets/*" element={<DatasetsRoutes />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    ),
    { basename }
  );

  return (
    <Suspense fallback={<Loading />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

const DatasetsRoutes = lazy(() => import('./pages/datasets'));

const ProjectPage = lazy(() => import('./pages/project/project-page'));

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
