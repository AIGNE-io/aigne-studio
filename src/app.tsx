import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import Footer from '@blocklet/ui-react/lib/Footer';
import Header from '@blocklet/ui-react/lib/Header';
import { Global, css } from '@emotion/react';
import { Box, CssBaseline } from '@mui/material';
import { ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { RecoilRoot } from 'recoil';

import Loading from './components/loading';
import { DatasetsProvider } from './contexts/datasets';
import { SessionProvider, useIsRole } from './contexts/session';
import { translations } from './locales';
import { HomeLazy } from './pages/home';
import { TemplatePageLazy } from './pages/playground';

export default function App() {
  const basename = window.blocklet?.prefix || '/';

  return (
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
        <BrowserRouter basename={basename}>
          <ToastProvider>
            <LocaleProvider translations={translations}>
              <SessionProvider serviceHost={basename}>
                <Suspense fallback={<Loading />}>
                  <AppRoutes />
                </Suspense>
              </SessionProvider>
            </LocaleProvider>
          </ToastProvider>
        </BrowserRouter>
      </RecoilRoot>
    </CssBaseline>
  );
}

function AppRoutes() {
  const isAdmin = useIsRole('owner', 'admin');

  return (
    <Routes>
      <Route index element={<HomeLazy />} />
      <Route
        path="playground"
        element={
          isAdmin ? (
            <DatasetsProvider>
              <Outlet />
            </DatasetsProvider>
          ) : (
            <Navigate to="/" />
          )
        }>
        <Route index element={<Navigate to="/playground/template" />} />
        <Route path="template" element={<TemplatePageLazy />} />
        <Route path="datasets/*" element={<DatasetsRoutes />} />
      </Route>
      <Route
        path="*"
        element={
          <Layout>
            <Box flexGrow={1} textAlign="center">
              <div>Not Found.</div>
            </Box>
          </Layout>
        }
      />
    </Routes>
  );
}

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
