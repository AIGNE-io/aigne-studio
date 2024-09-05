import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Container, Stack, Typography, styled } from '@mui/material';
import { DataGrid, GridColDef, gridClasses } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { getDeployments } from '../../libs/deployment';
import { useProjectStore } from '../project/yjs-state';

const pageSize = 10;

function Deployments() {
  const { projectId, ref: gitRef } = useParams();
  const { t } = useLocaleContext();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { getFileById } = useProjectStore(projectId, gitRef, true);
  const navigate = useNavigate();

  const { data, loading, run } = useRequest(getDeployments, {
    defaultParams: [{ projectId: projectId!, projectRef: gitRef!, page: 1, pageSize }],
    refreshDeps: [projectId, gitRef],
  });

  const columns = useMemo<
    GridColDef<{
      createdBy: string;
      updatedBy: string;
      projectId: string;
      projectRef: string;
      agentId: string;
      createdAt: string;
      updatedAt: string;
      access: 'public' | 'private';
    }>[]
  >(
    () => [
      {
        field: 'title',
        headerName: t('deployments.name'),
        flex: 1,
        renderCell: (params) => getFileById(params?.row?.agentId)?.name || t('unnamed'),
      },
      {
        field: 'access',
        headerName: t('deployments.visibility'),
        flex: 1,
        renderCell: (params) => t(params?.row?.access),
      },
      {
        field: 'action',
        headerName: t('createdAt'),
        flex: 1,
        renderCell: (params) => dayjs(params?.row?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      },
    ],
    [t]
  );

  const handlePageChange = (newPage: number) => {
    run({ projectId: projectId!, projectRef: gitRef!, page: newPage + 1, pageSize });
  };

  return (
    <Container>
      <Box className="between" mt={2.5} mb={1.5}>
        <Box sx={{ fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#030712' }}>
          {t('deployments.deployApp')}
        </Box>
      </Box>
      <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5 }}>
        <Box
          sx={{
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}>
          <Stack flex={1} minHeight={400} sx={{ overflowX: 'auto' }}>
            <Table
              sx={{
                minWidth: 600,
                border: 0,
                [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: { outline: 'none' },
                [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]: {
                  outline: 'none',
                },
                [`& .${gridClasses.footerContainer}`]: { border: 0 },
              }}
              disableColumnMenu
              columnHeaderHeight={30}
              rowHeight={40}
              getRowId={(row) => row.id}
              rows={data?.deployments || []}
              columns={columns as any}
              rowCount={data?.totalCount || 0}
              pageSizeOptions={[20]}
              paginationModel={{ page: (data?.currentPage || 1) - 1, pageSize: data?.pageSize || 20 }}
              paginationMode="server"
              onPaginationModelChange={({ page }) => handlePageChange(page)}
              getRowClassName={() => 'document-row'}
              loading={loading}
              onRowClick={(params) => {
                navigate(`/projects/${projectId}/deployments/${gitRef}/${params.row.id}`);
              }}
              slots={{
                noRowsOverlay: () => (
                  <Box className="center" height={1}>
                    <Stack alignItems="center">
                      <Typography variant="subtitle1">💻</Typography>
                      <Typography variant="subtitle4">{t('deployments.noDeployments')}</Typography>
                    </Stack>
                  </Box>
                ),
              }}
            />
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}

export default Deployments;

const Table = styled(DataGrid)`
  .MuiDataGrid-columnSeparator {
    display: none;
  }

  .MuiDataGrid-columnHeader {
    padding: 0;
    &:last-child {
      padding-left: 16px;
    }
  }

  .MuiDataGrid-cell {
    padding: 0;
  }

  .MuiDataGrid-main {
    .MuiDataGrid-row--borderBottom {
      background: transparent;
    }
  }
`;
