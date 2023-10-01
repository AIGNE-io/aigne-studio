import { Dashboard, Menus } from '@blocklet/studio-ui';
import { DesignServicesRounded, HomeRounded } from '@mui/icons-material';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import ErrorBoundary from '../../components/error/error-boundary';
import Loading from '../../components/loading';
import { FooterInfo } from './projects-page';
import { defaultBranch } from './state';

export default function ProjectRoutes() {
  const errorBoundary = useRef<ErrorBoundary>(null);

  const location = useLocation();
  useEffect(() => {
    errorBoundary.current?.reset();
  }, [location]);

  return (
    <ErrorBoundary ref={errorBoundary}>
      <Dashboard ContentProps={{ sx: { pr: { xs: 2, sm: 3 } } }} menus={<MenusView />} footer={<FooterView />}>
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

function MenusView() {
  return (
    <Routes>
      <Route index element={<Menus collapsed menus={[{ icon: <HomeRounded />, title: 'Home', url: '.' }]} />} />
      <Route
        path=":projectId/*"
        element={
          <Menus
            collapsed
            menus={[
              { icon: <HomeRounded />, title: 'Home', url: 'home' },
              { icon: <DesignServicesRounded />, title: 'Prompts', url: 'prompts' },
            ]}
          />
        }
      />
    </Routes>
  );
}

function FooterView() {
  return (
    <Routes>
      <Route index element={<FooterInfo />} />
      <Route path=":projectId/*">
        <Route path="home" element={<FooterInfo />} />
      </Route>
    </Routes>
  );
}

const ProjectsPage = lazy(() => import('./projects-page'));

const ProjectPage = lazy(() => import('./project-page'));
