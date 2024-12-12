import { KnowledgeDocumentCard } from '@app/libs/knowledge';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, Button, Stack, Tooltip, Typography, styled } from '@mui/material';
import { DataGrid, GridColDef, gridClasses } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import Crawl from '../../../icons/crawl';
import Custom from '../../../icons/custom';
import Documents from '../../../icons/doc';
import JSON from '../../../icons/json';
import PDF from '../../../icons/pdf';
import TXT from '../../../icons/txt';
import Unknown from '../../../icons/unknown';
import Discuss from '../../project/icons/discuss';
import Pending from './pending';

function generateDiscussionUrl(params: any): string {
  const prefix = (window.blocklet?.componentMountPoints || []).find((x) => x.name === 'did-comments')?.mountPoint;
  let url = joinURL(window.blocklet?.appUrl || '', prefix || '/', 'discussions');

  const from = params?.data?.from;
  const id = params?.data?.id;
  const type = params?.data?.type;
  const boardId = params?.data?.boardId;

  const map: Record<string, Record<string, string>> = {
    discussionType: {
      discussion: 'discussions',
      doc: 'docs',
      blog: 'blog',
    },
    board: {
      discussion: 'discussions/boards',
      doc: 'docs',
      blog: 'blog/boards',
    },
    discussion: {
      discussion: 'discussions',
      doc: joinURL('docs', boardId || ''),
      blog: 'blog/en',
    },
  };

  if (from && map[from]) {
    url = joinURL(window.blocklet?.appUrl || '', prefix || '/', map[from][type] || map[from].discussion!, id);
  }

  return url;
}

const KnowledgeDocuments = ({
  disabled,
  rows,
  total,
  page,
  onChangePage,
  onRemove,
  onRefetch,
  onEmbedding,
  embeddings,
}: {
  disabled: boolean;
  rows: KnowledgeDocumentCard[];
  total: number;
  page: number;
  onChangePage: (page: number) => void;
  onRemove: (documentId: string) => void;
  onRefetch: () => void;
  onEmbedding: (documentId: string) => void;
  embeddings: { [key: string]: { [key: string]: any } };
}) => {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const columns = useMemo(() => {
    const list: GridColDef<KnowledgeDocumentCard>[] = [
      {
        field: 'name',
        headerName: t('knowledge.name'),
        flex: 1,
        sortable: false,
        renderCell: (params) => {
          return (
            <Stack width={1} flexDirection="row" alignItems="center" height={1} gap={1}>
              <DocumentIcon document={params.row} />
              <Box flexGrow={1} color="#030712" className="ellipsis">
                {params.row.name}
              </Box>
            </Stack>
          );
        },
      },
      {
        field: 'type',
        headerName: t('knowledge.type'),
        width: 100,
        sortable: false,
        headerAlign: 'center',
        renderCell: (params) => {
          return <Box className="center">{t(params.row.type)}</Box>;
        },
      },
    ];

    if (!disabled) {
      list.push(
        {
          field: 'embeddingStatus',
          headerName: t('embeddingStatus'),
          width: 150,
          sortable: false,
          headerAlign: 'center',
          renderCell: (params) => {
            const colors: any = {
              idle: '#D97706',
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

            if (!params.row.embeddingStatus) {
              return (
                <Stack className="center" height="100%">
                  <Box
                    borderRadius={20}
                    border="1px solid #E5E7EB"
                    p="4px 12px"
                    color="#030712"
                    fontSize={13}
                    display="flex"
                    alignItems="center"
                    lineHeight={1}
                    gap={1}>
                    <Box width={6} height={6} borderRadius={6} bgcolor={colors.idle} />
                    <Box display="flex" alignItems="center">
                      {t('embeddingStatus_idle')}
                    </Box>
                  </Box>
                </Stack>
              );
            }

            if (['idle', 'uploading', 'success', 'error'].includes(params.row.embeddingStatus)) {
              return (
                <Stack className="center" height="100%">
                  <Tooltip title={params.row.error ?? undefined}>
                    <Box
                      borderRadius={20}
                      p="4px 12px"
                      color="#030712"
                      fontSize={13}
                      display="flex"
                      alignItems="center"
                      lineHeight={1}
                      gap={1}>
                      <Box display="flex" alignItems="center">
                        {t(`embeddingStatus_${params.row.embeddingStatus}`)}
                        {params.row.embeddingStatus === 'uploading' && <Pending mt={1} />}
                      </Box>
                      <Box width={6} height={6} borderRadius={6} bgcolor={colors[params.row.embeddingStatus]} />
                    </Box>
                  </Tooltip>
                </Stack>
              );
            }

            return (
              <Stack className="center" height="100%">
                <Box
                  borderRadius={20}
                  p="4px 12px"
                  color="#030712"
                  fontSize={13}
                  display="flex"
                  alignItems="center"
                  lineHeight={1}
                  gap={1}>
                  {params.row.embeddingStatus}
                  <Box
                    width={6}
                    height={6}
                    borderRadius={6}
                    bgcolor={isSymmetricAroundSlash(params.row.embeddingStatus) ? colors.success : colors.uploading}
                  />
                </Box>
              </Stack>
            );
          },
        },
        {
          field: 'actions',
          headerName: t('actions'),
          width: 200,
          sortable: false,
          headerAlign: 'center',
          renderCell: (params) => (
            <Actions
              type={params.row.type}
              error={params.row?.error ?? ''}
              onRemove={() => onRemove(params.row.id)}
              onRefetch={onRefetch}
              onEmbedding={async (e) => {
                e.stopPropagation();
                onEmbedding(params.row.id);
              }}
              onLink={(e) => {
                e.stopPropagation();
                const url = generateDiscussionUrl(params.row.data);
                window.open(url, '_blank');
              }}
            />
          ),
        }
      );
    }

    return list;
  }, [t, disabled]);

  const list = (rows ?? []).map((i) => ({ ...i, ...(embeddings[i.id] || {}) }));
  return (
    <Stack sx={{ overflowX: 'auto', mt: 2.5 }}>
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
        hideFooterSelectedRowCount
        columnHeaderHeight={30}
        rowHeight={44}
        getRowId={(v) => v.id}
        rows={list}
        columns={columns as any}
        rowCount={total ?? 0}
        pageSizeOptions={[10]}
        paginationModel={{ page: page - 1, pageSize: 10 }}
        paginationMode="server"
        onPaginationModelChange={({ page }) => onChangePage(page + 1)}
        getRowClassName={() => 'document-row'}
        disableRowSelectionOnClick={disabled}
        onRowClick={(params) => {
          if (disabled) return;

          navigate(joinURL('document', params.row.id, 'segments'));
        }}
      />
    </Stack>
  );
};

function Actions({
  type,
  error,
  onRefetch,
  onRemove,
  onEmbedding,
  onLink,
}: {
  type: string;
  error?: string;
  onRemove: () => void;
  onRefetch: () => void;
  onEmbedding: (e: React.MouseEvent) => void;
  onLink: (e: React.MouseEvent) => void;
}) {
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  return (
    <>
      <Stack flexDirection="row" alignItems="center" justifyContent="center" height={1}>
        {['text', 'file', 'url'].includes(type) ? (
          <>
            {/* <Button onClick={onEdit}>{t('edit')}</Button> */}

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

            <Button onClick={onEmbedding} color="error">
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
              title: (
                <Box sx={{ wordWrap: 'break-word' }}>
                  {t('knowledge.deleteTitle', { object: t('knowledge.knowledge') })}
                </Box>
              ),
              content: (
                <Box>
                  <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                    {t('knowledge.deleteDescription')}
                  </Typography>
                </Box>
              ),
              okText: t('alert.delete'),
              okColor: 'error',
              cancelText: t('cancel'),
              onOk: async () => {
                try {
                  await onRemove();
                  await onRefetch();
                } catch (error) {
                  Toast.error(error.message);
                }
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

export const DocumentIcon = ({ document }: { document?: KnowledgeDocumentCard }) => {
  if (!document) return <Box component={Unknown} width={20} height={20} />;

  if (document.type === 'text') {
    return <Box component={Custom} width={20} height={20} />;
  }

  if (document.type === 'file') {
    if (document.name) {
      if (document.name.endsWith('.json') || document.name.endsWith('.md')) {
        return <Box component={JSON} width={20} height={20} />;
      }

      if (document.name.endsWith('.pdf')) {
        return <Box component={PDF} width={20} height={20} />;
      }

      if (document.name.endsWith('.txt')) {
        return <Box component={TXT} width={20} height={20} />;
      }

      if (document.name.endsWith('.doc') || document.name.endsWith('.docx')) {
        return <Box component={Documents} width={20} height={20} />;
      }
    }

    return <Box component={Unknown} width={20} height={20} />;
  }

  if (document.type === 'discussKit') {
    return <Box component={Discuss} width={20} height={20} />;
  }

  if (document.type === 'url') {
    return <Box component={Crawl} width={20} height={20} />;
  }

  return <Box component={Unknown} width={20} height={20} />;
};

export default KnowledgeDocuments;

const Table = styled(DataGrid)`
  --DataGrid-rowBorderColor: #eff1f5;

  .MuiDataGrid-columnSeparator {
    display: none;
  }

  .MuiDataGrid-columnHeader {
    padding: 0;
    background: #fff;

    &:last-child {
      padding-left: 16px;
    }
  }

  .MuiDataGrid-cell {
    padding: 0;
  }

  .document-row {
    cursor: pointer;
  }

  .MuiTablePagination-root {
    color: #030712;
  }
`;
