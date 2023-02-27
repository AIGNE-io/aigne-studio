import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import Footer from '@blocklet/ui-react/lib/Footer';
import Header from '@blocklet/ui-react/lib/Header';
import { Global, css } from '@emotion/react';
import { Box, CssBaseline } from '@mui/material';
import { ReactNode, Suspense } from 'react';
import { Navigate, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import Loading from './components/loading';
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

      <ToastProvider>
        <LocaleProvider translations={translations}>
          <SessionProvider serviceHost={basename}>
            <Suspense fallback={<Loading />}>
              <AppRoutes basename={basename} />
            </Suspense>
          </SessionProvider>
        </LocaleProvider>
      </ToastProvider>
    </CssBaseline>
  );
}

function AppRoutes({ basename }: { basename: string }) {
  const isAdmin = useIsRole('owner', 'admin');

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route>
        <Route index element={<HomeLazy />} />
        <Route path="playground" element={isAdmin ? undefined : <Navigate to="/" />}>
          <Route index element={<Navigate to="/playground/chat" />} />
          <Route path="template" element={<TemplatePageLazy />} />
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
      </Route>
    ),
    { basename }
  );

  return <RouterProvider router={router} />;
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header maxWidth={null} />

      {children}

      <Footer />
    </>
  );
}
