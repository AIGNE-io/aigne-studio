import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import ChevronLeftIcon from '@iconify-icons/tabler/chevron-left';
import PlusIcon from '@iconify-icons/tabler/plus';
import SearchIcon from '@iconify-icons/tabler/search';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import { useReactive, useRequest, useThrottle } from 'ahooks';
import dayjs from 'dayjs';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useDocuments } from '../../contexts/datasets/documents';
import { reloadEmbedding, searchKnowledge, watchDatasetEmbeddings } from '../../libs/dataset';
import useDialog from '../../utils/use-dialog';
import Close from '../project/icons/close';
import Pending from './pending';
import { SegmentsItem } from './segments';

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

  useEffect(() => {
    refetch();
  }, []);

  const [search, setSearch] = useState('');
  const s = useThrottle(search, { wait: 1000 });

  const { data, loading } = useRequest(
    () => {
      if (s) return searchKnowledge({ datasetId: datasetId || '', message: s });

      return Promise.resolve({ docs: [] });
    },
    { refreshDeps: [s] }
  );

  const rows = (state.items ?? []).map((i) => {
    return { ...i, ...(embeddings[i.id] || {}) };
  });

  const getParamsName = (params: any) => {
    if (params?.row?.type === 'discussKit') {
      if (params.row.data?.data.from === 'discussionType') {
        return `${t(params.row.data?.data.id)}${t('data')}`;
      }

      if (params.row.data?.data.from === 'board') {
        return `${params.row.data?.data.title}${t('board')}`;
      }

      return `${params.row.data?.data.title}${t('data')}`;
    }

    return params?.row?.name;
  };

  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: t('knowledge.documents.name'),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          console.log(getParamsName(params));
          return (
            <Tooltip title={getParamsName(params)}>
              <Box pr={2} className="ellipsis">
                {getParamsName(params)}
              </Box>
            </Tooltip>
          );
        },
      },
      {
        field: 'type',
        headerName: t('knowledge.documents.type'),
        width: 100,
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{t(params.row.type)}</Box>;
        },
      },
      {
        field: 'embeddingStatus',
        headerName: t('embeddingStatus'),
        width: 150,
        sortable: false,
        renderCell: (params: any) => {
          const colors: any = {
            idle: '##D97706',
            uploading: '#D97706',
            success: '#059669',
            error: '#E11D48',
          };

          function isSymmetricAroundSlash(str: string = '') {
            try {
              const [before, after] = (str || '').split('/');
              return before === after;
            } catch (error) {
              return false;
            }
          }

          if (['idle', 'uploading', 'success', 'error'].includes(params.row.embeddingStatus)) {
            return (
              <Tooltip title={params.row.error ?? undefined}>
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
              </Tooltip>
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
        field: 'time',
        headerName: t('knowledge.documents.time'),
        width: 200,
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{dayjs(params.row.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Box>;
        },
      },
      {
        field: 'actions',
        headerName: t('actions'),
        width: 200,
        sortable: false,
        renderCell: (params: any) => (
          <Actions
            id={params.row.id}
            type={params.row.type}
            datasetId={datasetId || ''}
            error={params.row?.error}
            onRemove={remove}
            onRefetch={refetch}
            onEdit={(e) => {
              e.stopPropagation();
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
            onLink={(e) => {
              e.stopPropagation();
              const prefix = (window?.blocklet?.componentMountPoints || []).find(
                (x) => x.name === 'did-comments'
              )?.mountPoint;
              let url = joinURL(window?.blocklet?.appUrl || '', prefix || '/', 'discussions');

              if (params.row.data?.data?.from === 'discussionType') {
                const map: any = {
                  discussion: 'discussions',
                  doc: 'docs',
                  blog: 'blog',
                };

                url = joinURL(
                  window?.blocklet?.appUrl || '',
                  prefix || '/',
                  map[params.row.data?.data?.id] || map.discussion
                );
              } else if (params.row.data?.data?.from === 'board') {
                const map: any = {
                  discussion: 'discussions/boards',
                  doc: 'docs',
                  blog: 'blog/boards',
                };

                url = joinURL(
                  window?.blocklet?.appUrl || '',
                  prefix || '/',
                  map[params.row.data?.data?.type] || map.discussion,
                  params.row.data?.data?.id
                );
              } else if (params.row.data?.data?.from === 'discussion') {
                const map: any = {
                  discussion: 'discussions',
                  doc: joinURL('docs', params.row.data?.data?.boardId || ''),
                  blog: 'blog/en',
                };

                url = joinURL(
                  window?.blocklet?.appUrl || '',
                  prefix || '/',
                  map[params.row.data?.data?.type] || map.discussion,
                  params.row.data?.data?.id
                );
              } else {
                url = joinURL(window?.blocklet?.appUrl || '', prefix || '/', 'discussions');
              }

              window.open(url, '_blank');
            }}
          />
        ),
      },
    ],
    [t, getParamsName]
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
            <Box component={Icon} icon={ChevronLeftIcon} width={20} />
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

        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            placeholder={t('alert.search')}
            hiddenLabel
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <Box component={Icon} icon={SearchIcon} />,
            }}
          />

          <Button variant="contained" size="small" startIcon={<Icon icon={PlusIcon} />} onClick={() => navigate('add')}>
            {t('knowledge.documents.add')}
          </Button>
        </Box>
      </Stack>

      {!s && (
        <Stack flex={1} height={0} sx={{ overflowX: 'auto' }}>
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
            getRowId={(v) => v.id}
            rows={rows}
            columns={columns as any}
            rowCount={state.total ?? 0}
            pageSizeOptions={[20]}
            paginationModel={{ page: state.page, pageSize: state.size }}
            paginationMode="server"
            onPaginationModelChange={({ page, pageSize: size }) => refetch({ page, size })}
            onRowClick={(params) => {
              const rowId = params.row.id;
              navigate(`document/${rowId}`, { replace: true });
            }}
            slots={{
              noRowsOverlay: () => (
                <Box className="center" height={1}>
                  <Stack alignItems="center">
                    <Typography variant="subtitle1">💻</Typography>
                    <Typography variant="subtitle4">{t('noDocument')}</Typography>
                    <Typography variant="subtitle5">{t('noDocumentDesc')}</Typography>

                    <Button variant="text" size="small" onClick={() => navigate('add')}>
                      {t('knowledge.documents.add')}
                    </Button>
                  </Stack>
                </Box>
              ),
            }}
          />
        </Stack>
      )}

      {!!s && <KnowledgeSearchContent loading={loading} data={data} />}
    </Stack>
  );
}

function KnowledgeSearchContent({ loading, data }: { loading: boolean; data?: { docs: { content: string }[] } }) {
  const { t } = useLocaleContext();
  const segmentDialogState = usePopupState({ variant: 'dialog', popupId: 'segment' });
  const form = useForm<{ content: string }>({ defaultValues: { content: '' } });

  if (loading) {
    return (
      <Stack flex={1} height={0} className="center">
        <CircularProgress size={20} />
      </Stack>
    );
  }

  return (
    <>
      <ListContainer gap={1.25}>
        {(data?.docs || []).map((item, index) => {
          return (
            <SegmentsItem
              key={item.content}
              index={index + 1}
              content={item.content}
              onClick={() => {
                form.setValue('content', item.content || '');
                segmentDialogState.open();
              }}
              className="listItem"
            />
          );
        })}
      </ListContainer>

      <Dialog {...bindDialog(segmentDialogState)} maxWidth="sm" fullWidth component="form">
        <DialogTitle className="between">
          <Box>{t('knowledge.segments.content')}</Box>

          <IconButton size="small" onClick={segmentDialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Controller
            control={form.control}
            name="content"
            rules={{
              required: t('validation.fieldRequired'),
            }}
            render={({ field, fieldState }) => {
              return (
                <TextField
                  label={t('knowledge.segments.content')}
                  placeholder={t('knowledge.segments.content')}
                  sx={{ width: 1 }}
                  multiline
                  rows={10}
                  InputProps={{ readOnly: true }}
                  {...field}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </>
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
  onLink: (e: React.MouseEvent) => void;
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
                <Box>{t('view')}</Box>
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
              cancelText: t('cancel'),
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

const ListContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
`;
