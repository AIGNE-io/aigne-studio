import { LocaleProvider } from '@arcblock/ux/lib/Locale/context';
import { ToastProvider } from '@arcblock/ux/lib/Toast';
import withTracker from '@arcblock/ux/lib/withTracker';
import { SubscribeButton } from '@blocklet/ai-kit/components';
import { Dashboard } from '@blocklet/studio-ui';
import Footer from '@blocklet/ui-react/lib/Footer';
import { Box, CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { ReactNode, Suspense, lazy } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  useRouteError,
} from 'react-router-dom';
import { RecoilRoot } from 'recoil';

import AigneLogo from './components/aigne-logo';
import ErrorBoundary from './components/error/error-boundary';
import Loading from './components/loading';
import { PlanUpgrade } from './components/multi-tenant-restriction';
import { PrivateRoute } from './components/private-route';
import { SessionProvider, useInitialized, useIsPromptEditor } from './contexts/session';
import { Config } from './libs/env';
import { translations } from './locales';
import { theme } from './theme/theme';

const basename = window.blocklet?.prefix || '/';

export default function App() {
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
              minHeight: '100%',
              height: '100%',
              width: '100%',
              overflow: 'unset',
              display: 'flex',
              flexDirection: 'column',
            },
            '#app': {
              height: '100%',
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              fontSize: '0.875rem',
            },
            '*': {
              WebkitTapHighlightColor: 'transparent',
            },

            '.between': {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            },

            '.center': {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            },

            '.ellipsis': {
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            },

            '.multi-line-ellipsis': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
            },
          }}
        />

        <RecoilRoot>
          <ToastProvider>
            <LocaleProvider
              translations={translations}
              fallbackLocale="en"
              locale={undefined}
              onLoadingTranslation={undefined}
              languages={undefined}>
              <SessionProvider serviceHost={basename} protectedRoutes={[`${basename}/*`]}>
                <Suspense fallback={<Loading fixed />}>
                  <ErrorBoundary>
                    <PlanUpgrade />
                    <AppRoutes />
                  </ErrorBoundary>
                </Suspense>
              </SessionProvider>
            </LocaleProvider>
          </ToastProvider>
        </RecoilRoot>
      </CssBaseline>
    </ThemeProvider>
  );
}

function Root() {
  return <Outlet />;
}

const TrackedRoot = withTracker(Root);

const ExploreAdmin = lazy(() => import('./pages/admin'));

const ExploreCategory = lazy(() => import('./pages/explore'));

const AppPage = lazy(() => import('./pages/explore/app'));

const Home = lazy(() => import('./pages/home/home'));

const ProjectsRoutes = lazy(() => import('./pages/project'));

const EmbedRoutes = lazy(() => import('./pages/embed'));

function HomeRoute() {
  const isPromptEditor = useIsPromptEditor();
  return isPromptEditor ? <Navigate to="projects" replace /> : <Home />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<TrackedRoot />} ErrorBoundary={RouterErrorBoundary}>
      <Route index element={<HomeRoute />} />
      <Route path="explore/*" element={<ExploreCategory />} />
      <Route path="apps/:appId" element={<AppPage />} />
      <Route element={<PrivateRoute roles={['owner', 'admin', 'promptsEditor']} />}>
        <Route path="admin/*" element={<ExploreAdmin />} />
      </Route>
      <Route element={<PrivateRoute roles={Config.serviceModePermissionMap.ensurePromptsEditorRoles} />}>
        <Route path="projects/*" element={<ProjectsRoutes />} />
        <Route path="embed/*" element={<EmbedRoutes />} />
      </Route>
      <Route path="/playground/*" element={<Navigate to="/projects" replace />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  ),
  { basename }
);

function AppRoutes() {
  const initialized = useInitialized();
  if (!initialized) return <Loading fixed />;
  return <RouterProvider router={router} />;
}

function RouterErrorBoundary() {
  const error = useRouteError() as Error;
  if (error) throw error;

  return null;
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <Dashboard
      HeaderProps={{
        logo: <AigneLogo />,
        addons: (exists: ReactNode[]) => [<SubscribeButton />, ...exists],
      }}>
      {children}
    </Dashboard>
  );
}

function NotFound() {
  return (
    <Layout>
      <Box
        sx={{
          flexGrow: 1,
          textAlign: "center"
        }}>
        <Box data-testid="not-found">Not Found.</Box>
      </Box>
      <Footer
        // FIXME: remove following undefined props after issue https://github.com/ArcBlock/ux/issues/1136 solved
        meta={undefined}
        theme={undefined}
      />
    </Layout>
  );
}
