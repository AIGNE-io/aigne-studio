import { Dashboard } from '@blocklet/studio-ui';
import { ComponentProps, Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useRoutes } from 'react-router-dom';

import ErrorBoundary from '../../components/error/error-boundary';
import Loading from '../../components/loading';
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
        ContentProps={{ sx: { pr: { xs: 2, sm: 3 } } }}
        HeaderProps={{ brandAddon: <BrandRoutes /> }}
        menus={<MenuRoutes />}
        footer={<RooterRoutes />}>
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

function MenuRoutes({ ...props }: ComponentProps<typeof MainMenus>) {
  const element = useRoutes([{ path: ':projectId?/*', element: <MainMenus {...props} /> }]);

  return <Suspense>{element}</Suspense>;
}

function RooterRoutes() {
  return (
    <Suspense>
      <Routes>
        <Route index element={<ProjectsFooter />} />
        <Route path=":projectId/*">
          <Route path="home" element={<ProjectsFooter />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

const ProjectsPage = lazy(() => import('./projects-page'));

const ProjectPage = lazy(() => import('./project-page'));

const ProjectsFooter = lazy(() => import('./projects-footer'));

const ProjectBrand = lazy(() => import('./project-brand'));
