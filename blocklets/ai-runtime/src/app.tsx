import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import { CssBaseline, GlobalStyles, StyledEngineProvider, ThemeProvider, createTheme, css } from '@mui/material';
import { Suspense } from 'react';
import { Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import Loading from './components/loading';
import { SessionProvider } from './contexts/session';
import Home from './pages/home';

const theme = createTheme();

export default function WrappedApp() {
  const basename = window.blocklet?.prefix || '/';

  const baseAdminPath = basename.endsWith('/') ? `${basename}admin` : `${basename}/admin`;

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route
        element={
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={theme}>
              <CssBaseline />

              <GlobalStyles
                styles={css`
                  html {
                    height: 100%;
                  }

                  body {
                    min-height: 100%;
                    overflow: unset;
                    display: flex;
                    flex-direction: column;
                  }

                  #app {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                  }
                `}
              />

              <ToastProvider>
                <LocaleProvider translations={{}} fallbackLocale="en">
                  <Suspense fallback={<Loading />}>
                    <SessionProvider serviceHost={basename} protectedRoutes={[`${baseAdminPath}/*`]}>
                      <Outlet />
                    </SessionProvider>
                  </Suspense>
                </LocaleProvider>
              </ToastProvider>
            </ThemeProvider>
          </StyledEngineProvider>
        }>
        <Route path="/" element={<Home />} />
      </Route>
    ),
    { basename }
  );

  return <RouterProvider router={router} />;
}
