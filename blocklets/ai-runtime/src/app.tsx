import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ThemeProvider } from '@arcblock/ux/lib/Theme';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import withTracker from '@arcblock/ux/lib/withTracker';
import { GlobalStyles, ThemeOptions, css } from '@mui/material';
import { Suspense } from 'react';
import { Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router-dom';

import Loading from './components/loading';
import { SessionProvider } from './contexts/session';
import { translations } from './locales';
import ApplicationPage from './pages/application';
import HomePage from './pages/home';
import MessagePage from './pages/message';
import PreviewPage from './pages/preview';

const themeConfig: ThemeOptions = { typography: { button: { textTransform: 'none' } } };
const basename = window.blocklet?.prefix || '/';

const App = () => {
  return (
    <ThemeProvider theme={themeConfig}>
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
        <LocaleProvider
          translations={translations}
          fallbackLocale="en"
          locale={undefined}
          onLoadingTranslation={undefined}
          languages={undefined}>
          <Suspense fallback={<Loading />}>
            <SessionProvider serviceHost={basename}>
              <Outlet />
            </SessionProvider>
          </Suspense>
        </LocaleProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
const AppWithTracker = withTracker(App);

export default function WrappedApp() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route element={<AppWithTracker />}>
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
