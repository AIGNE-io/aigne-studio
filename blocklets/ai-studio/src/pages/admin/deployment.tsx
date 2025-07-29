import { getErrorMessage } from '@app/libs/api';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { Box, Button, Chip, Container, Stack, Typography, buttonClasses, styled } from '@mui/material';
import { DataGrid, GridColDef, gridClasses } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { useEffect, useMemo, useState } from 'react';
import { joinURL } from 'ufo';

import { deleteDeployment, getDeployments } from '../../libs/deployment';
import type { Deployment } from '../../libs/deployment';
import DeploymentDialog from '../deployments/dialog';

const pageSize = 50;

function DeploymentList() {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'popper' });

  const { dialog, showDialog } = useDialog();
  const [deployment, setDeployment] = useState<Deployment | null>(null);

  const [page, setPage] = useState(0);
  const params = useMemo(() => ({ page: page + 1, pageSize }), [page, pageSize]);

  const { data, loading, run, refresh } = useRequest(getDeployments, { manual: true });

  useEffect(() => {
    run(params);
  }, [params, run]);

  const columns = useMemo<GridColDef<Deployment & { project: ProjectSettings }>[]>(
    () => [
      {
        field: 'title',
        headerName: t('agentName'),
        flex: 1,
        renderCell: (params) => <Box>{params.row.project?.name}</Box>,
      },
      {
        field: 'access',
        headerName: t('deployments.visibility'),
        renderCell: (params) => t(params?.row?.access),
      },
      {
        field: 'createdAt',
        width: 150,
        headerName: t('createdAt'),
        renderCell: (params) => dayjs(params?.row?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        field: 'categories',
        headerName: t('category.title'),
        renderCell: (params) => {
          return (
            <Box>
              {params.row.categories.map((category) => {
                return <Chip label={category.name} sx={{ mr: 1 }} key={category.id} size="small" />;
              })}
            </Box>
          );
        },
      },
      {
        field: 'action',
        headerName: t('actions'),
        align: 'center',
        headerAlign: 'center',
        minWidth: 180,
        renderCell: (params) => {
          return (
            <Box sx={{ [`.${buttonClasses.root}`]: { px: 1, py: 0.5, minWidth: 0 } }}>
              <Button
                data-testid="edit-deployment-button"
                onClick={(e) => {
                  e.stopPropagation();

                  setDeployment(params.row);
                  dialogState.open();
                }}>
                {t('edit')}
              </Button>
              <Button
                data-testid="share-deployment-button"
                variant="text"
                onClick={(e) => {
                  e.stopPropagation();

                  window.open(
                    joinURL(globalThis.location.origin, window.blocklet.prefix, '/apps', params.row.id),
                    '_blank'
                  );
                }}>
                {t('share')}
              </Button>
              <Button
                data-testid="delete-deployment-button"
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
                        <Typography
                          sx={{
                            fontWeight: 500,
                            fontSize: 16,
                            lineHeight: "28px",
                            color: "#4B5563"
                          }}>
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
                        setPage(0);
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
    [t, dialogState, showDialog]
  );

  return (
    <Container>
      <Box
        className="between"
        sx={{
          mt: 2.5,
          mb: 1.5
        }}>
        <Box sx={{ fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#030712' }}>{t('deployments.title')}</Box>
      </Box>
      <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5 }}>
        <Box
          sx={{
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}>
          <Stack
            sx={{
              flex: 1,
              overflowX: 'auto'
            }}>
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
              autosizeOnMount
              autosizeOptions={{ includeHeaders: true }}
              disableColumnMenu
              columnHeaderHeight={44}
              rowHeight={44}
              getRowId={(row) => row.id}
              rows={data?.list || []}
              columns={columns as any}
              rowCount={data?.totalCount || 0}
              pageSizeOptions={[10, 20, 50, 100]}
              paginationModel={{ page, pageSize }}
              paginationMode="server"
              onPaginationModelChange={({ page }) => setPage(page)}
              getRowClassName={() => 'deployment-row'}
              loading={loading}
              slots={{
                noRowsOverlay: () => (
                  <Box className="center" sx={{
                    height: 1
                  }}>
                    <Stack sx={{
                      alignItems: "center"
                    }}>
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
        showVisibility={false}
        dialogState={dialogState}
        id={deployment?.id!}
        access={deployment?.access!}
        categories={deployment?.categories! || []}
        orderIndex={deployment?.orderIndex}
        productHuntUrl={deployment?.productHuntUrl}
        productHuntBannerUrl={deployment?.productHuntBannerUrl}
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
