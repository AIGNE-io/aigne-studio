import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import { Box, Button, CircularProgress, Stack, Tooltip, Typography, styled } from '@mui/material';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import { useReactive } from 'ahooks';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useDocuments } from '../../contexts/datasets/documents';
import { reloadEmbedding, watchDatasetEmbeddings } from '../../libs/dataset';
import useDialog from '../../utils/use-dialog';
import Pending from './pending';

export default function KnowledgeDocuments() {
  const { t } = useLocaleContext();
  const { datasetId } = useParams();

  const navigate = useNavigate();

  const { state, remove, refetch } = useDocuments(datasetId || '');
  if (state.error) throw state.error;

  const embeddings = useReactive<{ [key: string]: { [key: string]: any } }>({});

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      const res = await watchDatasetEmbeddings({ datasetId: datasetId || '', signal: abortController.signal });
      const reader = res.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (value) {
          switch (value.type) {
            case 'change': {
              const { type, ...rest } = value;
              embeddings[value.documentId] = rest;
              break;
            }
            case 'complete': {
              const { type, ...rest } = value;
              embeddings[value.documentId] = rest;
              break;
            }
            case 'error': {
              const { type, message, ...rest } = value;
              embeddings[value.documentId] = rest;
              Toast.error(message);
              break;
            }
            default:
              console.warn('Unsupported event', value);
          }
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [datasetId]);

  const rows = (state.items ?? []).map((i) => {
    return { ...i, ...(embeddings[i.id] || {}) };
  });

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: t('knowledge.documents.name'),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{params.row.name}</Box>;
        },
      },
      {
        field: 'type',
        headerName: t('knowledge.documents.type'),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{t(params.row.type)}</Box>;
        },
      },
      {
        field: 'embeddingStatus',
        headerName: t('embeddingStatus'),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          const colors: any = {
            idle: '##D97706',
            uploading: '#D97706',
            success: '#059669',
            error: '#E11D48',
          };

          function isSymmetricAroundSlash(str: string = '') {
            const [before, after] = str.split('/');
            return before === after;
          }

          if (['idle', 'uploading', 'success', 'error'].includes(params.row.embeddingStatus)) {
            return (
              <Box
                borderRadius={20}
                border="1px solid #E5E7EB"
                p="4px 12px"
                color="#030712"
                fontSize={13}
                display="flex"
                alignItems="center"
                gap={1}>
                <Box width={6} height={6} borderRadius={6} bgcolor={colors[params.row.embeddingStatus]} />
                <Box display="flex" alignItems="center">
                  {t(`embeddingStatus_${params.row.embeddingStatus}`)}
                  {params.row.embeddingStatus === 'uploading' && <Pending mt={1} />}
                </Box>
              </Box>
            );
          }

          return (
            <Box
              borderRadius={20}
              border="1px solid #E5E7EB"
              p="4px 12px"
              color="#030712"
              fontSize={13}
              display="flex"
              alignItems="center"
              gap={1}>
              <Box
                width={6}
                height={6}
                borderRadius={6}
                bgcolor={isSymmetricAroundSlash(params.row.embeddingStatus) ? colors.success : colors.uploading}
              />
              {params.row.embeddingStatus}
            </Box>
          );
        },
      },
      {
        field: 'actions',
        headerName: t('form.actions'),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => (
          <Actions
            id={params.row.id}
            type={params.row.type}
            datasetId={datasetId || ''}
            error={params.row?.error}
            onRemove={remove}
            onRefetch={refetch}
            onEdit={() => {
              navigate(`edit?type=${params.row.type}&id=${params.row.id}`, { replace: true });
            }}
            onEmbedding={async (e) => {
              e.stopPropagation();
              try {
                await reloadEmbedding(params.row.datasetId, params.row.id);
              } catch (error) {
                Toast.error(error?.message);
              }
            }}
            onLink={() => {
              const id = params.row.data?.id;
              const prefix = (window?.blocklet?.componentMountPoints || []).find(
                (x) => x.name === 'did-comments'
              )?.mountPoint;
              let url = joinURL(window?.blocklet?.appUrl || '', prefix || '/', 'discussions');

              if (id) {
                url = joinURL(url, id);
              }

              window.open(url, '_blank');
            }}
          />
        ),
      },
    ],
    [t]
  );

  if (state.loading) {
    return (
      <Box width={1} height={1} className="center">
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Stack bgcolor="background.paper" p={2.5} height={1} gap={2.5}>
      <Stack flexDirection="row" className="between">
        <Box>
          <Box
            display="flex"
            alignItems="center"
            sx={{ cursor: 'pointer' }}
            onClick={() => {
              navigate(joinURL('..'));
            }}>
            <Box component={Icon} icon="tabler:chevron-left" width={20} />
            <Typography variant="subtitle2" mb={0}>
              {state.dataset?.name}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center">
            <Box width={20} />
            <Typography variant="subtitle2" color="#4B5563" fontWeight={400} mb={0}>
              {state.dataset?.description}
            </Typography>
          </Box>
        </Box>

        <Button variant="contained" size="small" onClick={() => navigate('add')}>
          {t('knowledge.documents.add')}
        </Button>
      </Stack>

      <Stack flex={1} height={0}>
        <Table
          sx={{
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
          getRowId={(v) => v.id}
          rows={rows}
          columns={columns as any}
          rowCount={state.total ?? 0}
          pageSizeOptions={[20]}
          paginationModel={{ page: state.page, pageSize: state.size }}
          paginationMode="server"
          onPaginationModelChange={({ page, pageSize: size }) => refetch({ page, size })}
          // onRowClick={(params) => {
          //   const rowId = params.row.id;
          //   if (params.row.type !== 'fullSite') {
          //     navigate(`document/${rowId}`, { replace: true });
          //   }
          // }}
          slots={{
            noRowsOverlay: () => (
              <Box className="center" height={1}>
                <Stack alignItems="center">
                  <Typography variant="subtitle1">💻</Typography>
                  <Typography variant="subtitle4">{t('No Document Here')}</Typography>
                  <Typography variant="subtitle5">{t('Your document list is currently empty. ')}</Typography>

                  <Button variant="text" size="small" onClick={() => navigate('add')}>
                    {t('knowledge.documents.add')}
                  </Button>
                </Stack>
              </Box>
            ),
          }}
        />
      </Stack>
    </Stack>
  );
}

function Actions({
  type,
  id,
  error,
  datasetId,
  onRefetch,
  onRemove,
  onEdit,
  onEmbedding,
  onLink,
}: {
  type: string;
  id: string;
  error?: string;
  datasetId: string;
  onRemove: (datasetId: string, documentId: string) => void;
  onRefetch: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onEmbedding: (e: React.MouseEvent) => void;
  onLink: () => void;
}) {
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  return (
    <>
      <Stack flexDirection="row">
        {['text', 'file'].includes(type) ? (
          <>
            <Button onClick={onEdit}>{t('edit')}</Button>
            {error ? (
              <Button onClick={onEmbedding} color="error">
                <Tooltip placement="top" arrow title={t('refreshTip')}>
                  <Box>{t('refresh')}</Box>
                </Tooltip>
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button onClick={onLink}>
              <Tooltip placement="top" arrow title={t('shareTip')}>
                <Box>{t('share')}</Box>
              </Tooltip>
            </Button>
            <Button onClick={onEmbedding}>
              <Tooltip placement="top" arrow title={t('refreshTip')}>
                <Box>{t('refresh')}</Box>
              </Tooltip>
            </Button>
          </>
        )}

        <Button
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
                '.save': {
                  background: '#d32f2f',
                },
              },
              maxWidth: 'sm',
              fullWidth: true,
              title: <Box sx={{ wordWrap: 'break-word' }}>{t('knowledge.documents.deleteTitle')}</Box>,
              content: (
                <Box>
                  <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                    {t('knowledge.documents.deleteDescription')}
                  </Typography>
                </Box>
              ),
              okText: t('alert.delete'),
              okColor: 'error',
              cancelText: t('alert.cancel'),
              onOk: async () => {
                await onRemove(datasetId, id);
                await onRefetch();
              },
            });
          }}>
          {t('delete')}
        </Button>
      </Stack>

      {dialog}
    </>
  );
}

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
`;
