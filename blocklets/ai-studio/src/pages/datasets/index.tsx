import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

export default function DatasetsRoutes() {
  return (
    <AdminLayout
      footerProps={{ className: 'dashboard-footer' }}
      // FIXME: remove following undefined props after issue https://github.com/ArcBlock/ux/issues/1136 solved
      meta={undefined}
      fallbackUrl={undefined}
      invalidPathFallback={undefined}
      headerAddons={undefined}
      sessionManagerProps={undefined}
      links={undefined}>
      <Routes>
        <Route index element={<DatasetsPageLazy />} />
        <Route path=":datasetId">
          <Route index element={<Navigate to="documents" replace />} />
          <Route path="documents">
            <Route index element={<DatasetPageLazy />} />
            <Route path="create" element={<AddFilePageLazy />} />
          </Route>
        </Route>
      </Routes>
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

const DatasetsPageLazy = lazy(() => import('./datasets'));

const DatasetPageLazy = lazy(() => import('./dataset'));

const AddFilePageLazy = lazy(() => import('./add-file'));
