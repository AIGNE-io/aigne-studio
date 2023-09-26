import { Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import ErrorBoundary from '../../components/error/error-boundary';
import Loading from '../../components/loading';

export default function ProjectsRoutes() {
  const errorBoundary = useRef<ErrorBoundary>(null);

  const location = useLocation();
  useEffect(() => {
    errorBoundary.current?.reset();
  }, [location]);

  return (
    <ErrorBoundary ref={errorBoundary}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<ProjectsPage />} />
          <Route path=":projectId">
            <Route index element={<Navigate to="main" replace />} />
            <Route path=":ref/*" element={<ProjectPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

const ProjectsPage = lazy(() => import('./projects'));

const ProjectPage = lazy(() => import('../project/project-page'));
