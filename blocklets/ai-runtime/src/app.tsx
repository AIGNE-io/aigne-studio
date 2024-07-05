import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import { CssBaseline, GlobalStyles, StyledEngineProvider, ThemeProvider, createTheme, css } from '@mui/material';
import { Suspense } from 'react';
import { Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import Loading from './components/loading';
import { SessionProvider } from './contexts/session';
import { translations } from './locales';
import ApplicationPage from './pages/application';
import HomePage from './pages/home';
import MessagePage from './pages/message';
import PreviewPage from './pages/preview';

const theme = createTheme({ typography: { button: { textTransform: 'none' } } });

export default function WrappedApp() {
  const basename = window.blocklet?.prefix || '/';

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
                <LocaleProvider translations={translations} fallbackLocale="en">
                  <Suspense fallback={<Loading />}>
                    <SessionProvider serviceHost={basename}>
                      <Outlet />
                    </SessionProvider>
                  </Suspense>
                </LocaleProvider>
              </ToastProvider>
            </ThemeProvider>
          </StyledEngineProvider>
        }>
        <Route path="/" element={<HomePage />} />
        <Route path="/apps/:aid" element={<ApplicationPage />} />
        <Route path="/preview/:aid" element={<PreviewPage />} />
        <Route path="/messages/:messageId" element={<MessagePage />} />
      </Route>
    ),
    { basename }
  );

  return <RouterProvider router={router} />;
}
