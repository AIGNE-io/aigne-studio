import { getErrorMessage } from '@app/libs/api';
import { getCategories } from '@app/libs/category';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, Button, Container, Stack, Typography, styled } from '@mui/material';
import { DataGrid, GridColDef, gridClasses } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo, useState } from 'react';

import { deleteDeployment, getAllDeployments } from '../../libs/deployment';
import type { Deployment } from '../../libs/deployment';
import DeploymentDialog from '../deployments/dialog';
import { useProjectStore } from '../project/yjs-state';

function ProjectAgentName({ projectId, gitRef, agentId }: { projectId: string; gitRef: string; agentId: string }) {
  const { getFileById } = useProjectStore(projectId, gitRef, true);
  return <Box>{getFileById(agentId)?.name}</Box>;
}

const pageSize = 10;

function DeploymentList() {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'popper' });

  const { dialog, showDialog } = useDialog();
  const [deployment, setDeployment] = useState<Deployment | null>(null);

  const { data, loading, run, refresh } = useRequest(getAllDeployments, {
    defaultParams: [{ page: 1, pageSize }],
    refreshDeps: [],
  });

  const { data: categories, loading: categoriesLoading } = useRequest(getCategories, {
    defaultParams: [{ page: 1, pageSize: 1000 }],
    refreshDeps: [],
  });

  const columns = useMemo<GridColDef<Deployment>[]>(
    () => [
      {
        field: 'title',
        headerName: t('agentName'),
        flex: 1,
        renderCell: (params) => (
          <ProjectAgentName
            projectId={params?.row?.projectId!}
            gitRef={params?.row?.projectRef!}
            agentId={params?.row?.agentId!}
          />
        ),
      },
      {
        field: 'access',
        headerName: t('deployments.visibility'),
        flex: 1,
        renderCell: (params) => t(params?.row?.access),
      },
      {
        field: 'createdAt',
        headerName: t('createdAt'),
        flex: 1,
        renderCell: (params) => dayjs(params?.row?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        field: 'categories',
        headerName: t('category.title'),
        flex: 1,
        renderCell: (params) => {
          return params.row.categories
            .map((category) => categories?.list?.find((c) => c.id === category)?.name)
            .join(', ');
        },
      },
      {
        field: 'action',
        headerName: t('actions'),
        align: 'center',
        headerAlign: 'center',
        flex: 1,
        renderCell: (params) => {
          return (
            <Box display="flex" alignItems="center" height={1} justifyContent="center">
              <Button
                onClick={() => {
                  setDeployment(params.row);
                  dialogState.open();
                }}>
                {t('edit')}
              </Button>
              <Button
                variant="text"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();

                  showDialog({
                    formSx: {
                      '.MuiDialogTitle-root': {
                        border: 0,
                      },
                      '.MuiDialogActions-root': {
                        border: 0,
                      },
                    },
                    maxWidth: 'sm',
                    fullWidth: true,
                    title: <Box sx={{ wordWrap: 'break-word' }}>{t('deployments.deleteTitle')}</Box>,
                    content: (
                      <Box>
                        <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                          {t('deployments.deleteDescription')}
                        </Typography>
                      </Box>
                    ),
                    okText: t('alert.delete'),
                    okColor: 'error',
                    cancelText: t('cancel'),
                    onOk: async () => {
                      try {
                        await deleteDeployment({ id: params.row.id });
                        run({ page: 1, pageSize });
                        Toast.success(t('deployments.deleteSuccess'));
                      } catch (error) {
                        Toast.error(getErrorMessage(error));
                      }
                    },
                  });
                }}>
                {t('delete')}
              </Button>
            </Box>
          );
        },
      },
    ],
    [t, categories, dialogState, run, showDialog]
  );

  const handlePageChange = (newPage: number) => run({ page: newPage + 1, pageSize });

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
              rows={data?.list || []}
              columns={columns as any}
              rowCount={data?.totalCount || 0}
              pageSizeOptions={[20]}
              paginationModel={{ page: (data?.currentPage || 1) - 1, pageSize: data?.pageSize || 20 }}
              paginationMode="server"
              onPaginationModelChange={({ page }) => handlePageChange(page)}
              getRowClassName={() => 'document-row'}
              loading={loading || categoriesLoading}
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

      {dialog}

      <DeploymentDialog
        dialogState={dialogState}
        id={deployment?.id!}
        access={deployment?.access!}
        categories={deployment?.categories!}
        run={refresh}
      />
    </Container>
  );
}

export default DeploymentList;

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
