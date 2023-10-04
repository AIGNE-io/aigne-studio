import { Dashboard } from '@blocklet/studio-ui';
import { backdropClasses, drawerClasses } from '@mui/material';
import { ComponentProps, Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useRoutes } from 'react-router-dom';

import ErrorBoundary from '../../components/error/error-boundary';
import Loading from '../../components/loading';
import HeaderActions from './header-actions';
import MainMenus from './main-menus';
import { defaultBranch } from './state';

export default function ProjectRoutes() {
  const errorBoundary = useRef<ErrorBoundary>(null);

  const location = useLocation();
  useEffect(() => {
    errorBoundary.current?.reset();
  }, [location]);

  return (
    <ErrorBoundary ref={errorBoundary}>
      <Dashboard
        HeaderProps={{ brandAddon: <BrandRoutes />, addons: (exists) => [<AddonsRoutes />, ...exists] }}
        menus={<MenuRoutes />}
        MenusDrawerProps={{
          sx: {
            [`.${backdropClasses.root}`]: {
              top: 64,
            },

            [`> .${drawerClasses.paper}`]: {
              borderRightStyle: 'dashed',
            },
          },
        }}
        sx={{
          '.dashboard-header': {
            border: 'none',
            bgcolor: 'grey.200',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
          },
        }}>
        <Suspense fallback={<Loading fixed />}>
          <Routes>
            <Route index element={<ProjectsPage />} />
            <Route path=":projectId/*">
              <Route index element={<Navigate to="prompts" replace />} />
              <Route path="home" element={<ProjectsPage />} />
              <Route path="prompts">
                <Route index element={<Navigate to={defaultBranch} replace />} />
                <Route path=":ref/*" element={<ProjectPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </Dashboard>
    </ErrorBoundary>
  );
}

function BrandRoutes() {
  const element = useRoutes([{ path: ':projectId/*', element: <ProjectBrand /> }]);
  return <Suspense>{element}</Suspense>;
}

function AddonsRoutes() {
  const element = useRoutes([
    {
      path: ':projectId/*',
      children: [
        {
          path: 'prompts',
          children: [
            {
              path: ':ref/*',
              element: <HeaderActions />,
            },
            {
              path: '*',
              element: null,
            },
          ],
        },
        {
          path: '*',
          element: null,
        },
      ],
    },
  ]);
  return <Suspense>{element}</Suspense>;
}

function MenuRoutes({ ...props }: ComponentProps<typeof MainMenus>) {
  const element = useRoutes([{ path: ':projectId?/*', element: <MainMenus {...props} /> }]);

  return <Suspense>{element}</Suspense>;
}

const ProjectsPage = lazy(() => import('./projects-page'));

const ProjectPage = lazy(() => import('./project-page'));

const ProjectBrand = lazy(() => import('./project-brand'));
