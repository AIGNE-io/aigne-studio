import { useFullPage } from '@arcblock/ux/lib/Layout/dashboard/full-page';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { Fullscreen, FullscreenExit } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { ReactNode, Suspense, lazy, useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Loading from '../../components/loading';
import { useAddonsState } from '../../contexts/dashboard';

export default function ProjectsRoutes() {
  const [{ addons }] = useAddonsState();

  const headerAddons = useCallback(
    ([...exists]: ReactNode[]) => {
      exists.unshift(...Object.values(addons));

      exists.unshift(<ToggleFullscreen />);

      return exists;
    },
    [addons]
  );

  return (
    <AdminLayout footerProps={{ className: 'dashboard-footer' }} headerAddons={headerAddons}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<ProjectsPage />} />
          <Route path=":projectId">
            <Route index element={<Navigate to="main" replace />} />
            <Route path=":ref/*" element={<ProjectPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

const AdminLayout = styled(Dashboard)`
  > .dashboard-body > .dashboard-main {
    > .dashboard-content {
      overflow: auto;
      padding: 0;
    }

    > .dashboard-footer {
      margin-top: 0;
      padding: 0;
    }
  }
`;

function ToggleFullscreen() {
  const { inFullPage, toggleFullPage } = useFullPage();

  return <IconButton onClick={toggleFullPage}>{inFullPage ? <FullscreenExit /> : <Fullscreen />}</IconButton>;
}

const ProjectsPage = lazy(() => import('./projects'));

const ProjectPage = lazy(() => import('../project/project-page'));
