import ErrorBoundary from '@app/components/error/error-boundary';
import { useSessionContext } from '@app/contexts/session';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import { styled } from '@mui/material';
import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function ExploreAdminRoutes() {
  const { session } = useSessionContext();

  useEffect(() => {
    if (!session.user) {
      session.login(() => {}, { openMode: 'redirect', redirect: window.location.href });
    }
  }, [session.user]);

  return (
    // @ts-ignore
    <AdminLayout
      footerProps={{ className: 'dashboard-footer' }}
      sx={{ bgcolor: 'background.paper' }}
      // FIXME: remove following undefined props after issue https://github.com/ArcBlock/ux/issues/1136 solved
      meta={undefined}
      fallbackUrl={undefined}
      invalidPathFallback={undefined}
      headerAddons={undefined}
      sessionManagerProps={undefined}
      links={undefined}>
      <ErrorBoundary>
        <Routes>
          <Route index element={<Navigate to="explore" replace />} />
          <Route path="explore" element={<AdminDeployment />} />
          <Route path="category" element={<AdminCategory />} />
        </Routes>
      </ErrorBoundary>
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

const AdminDeployment = lazy(() => import('./deployment'));
const AdminCategory = lazy(() => import('./category'));
