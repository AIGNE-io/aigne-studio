import { KnowledgeDocumentCard } from '@app/libs/dataset';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Button, Stack, Tooltip, Typography, styled } from '@mui/material';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { joinURL } from 'ufo';

import Crawl from '../../../icons/crawl';
import Custom from '../../../icons/custom';
import Documents from '../../../icons/doc';
import JSON from '../../../icons/json';
import PDF from '../../../icons/pdf';
import TXT from '../../../icons/txt';
import Unknown from '../../../icons/unknown';
import Discuss from '../../project/icons/discuss';

const KnowledgeDocuments = ({
  rows,
  knowledgeId,
  total,
  page,
  onChangePage,
}: {
  rows: KnowledgeDocumentCard[];
  knowledgeId: string;
  total: number;
  page: number;
  onChangePage: (page: number) => void;
}) => {
  const { t } = useLocaleContext();

  const columns = useMemo(
    () =>
      [
        {
          field: 'name',
          headerName: t('knowledge.documents.name'),
          flex: 1,
          sortable: false,
          renderCell: (params: any) => {
            return (
              <Stack width={1} flexDirection="row" alignItems="center" gap={1}>
                <DocumentIcon document={params.row} />
                <Box flexGrow={1} color="#030712">
                  {params.row.name}
                </Box>
              </Stack>
            );
          },
        },
        {
          field: 'type',
          headerName: t('knowledge.documents.type'),
          width: 100,
          sortable: false,
          headerAlign: 'center',
          renderCell: (params: any) => {
            return <Box className="center">{t(params.row.type)}</Box>;
          },
        },
        {
          field: 'embeddingStatus',
          headerName: t('embeddingStatus'),
          width: 150,
          sortable: false,
          headerAlign: 'center',
          renderCell: (params: any) => {
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
                        {/* {params.row.embeddingStatus === 'uploading' && <Pending mt={1} />} */}
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
                  border="1px solid #E5E7EB"
                  p="4px 12px"
                  color="#030712"
                  fontSize={13}
                  display="flex"
                  alignItems="center"
                  lineHeight={1}
                  gap={1}>
                  <Box
                    width={6}
                    height={6}
                    borderRadius={6}
                    bgcolor={isSymmetricAroundSlash(params.row.embeddingStatus) ? colors.success : colors.uploading}
                  />
                  {params.row.embeddingStatus}
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
          renderCell: (params: any) => (
            <Actions
              id={params.row.id}
              type={params.row.type}
              datasetId={knowledgeId}
              error={params.row?.error}
              onRemove={() => {}}
              onRefetch={() => {}}
              onEdit={(e) => {
                e.stopPropagation();
              }}
              onEmbedding={async (e) => {
                e.stopPropagation();
              }}
              onLink={(e) => {
                e.stopPropagation();
                const prefix = (window.blocklet?.componentMountPoints || []).find(
                  (x) => x.name === 'did-comments'
                )?.mountPoint;
                let url = joinURL(window.blocklet?.appUrl || '', prefix || '/', 'discussions');

                if (params.row.data?.data?.from === 'discussionType') {
                  const map: Record<string, string> = {
                    discussion: 'discussions',
                    doc: 'docs',
                    blog: 'blog',
                  };

                  url = joinURL(
                    window.blocklet?.appUrl || '',
                    prefix || '/',
                    map[params.row.data?.data?.id] || map.discussion!
                  );
                } else if (params.row.data?.data?.from === 'board') {
                  const map: Record<string, string> = {
                    discussion: 'discussions/boards',
                    doc: 'docs',
                    blog: 'blog/boards',
                  };

                  url = joinURL(
                    window.blocklet?.appUrl || '',
                    prefix || '/',
                    map[params.row.data?.data?.type] || map.discussion!,
                    params.row.data?.data?.id
                  );
                } else if (params.row.data?.data?.from === 'discussion') {
                  const map: Record<string, string> = {
                    discussion: 'discussions',
                    doc: joinURL('docs', params.row.data?.data?.boardId || ''),
                    blog: 'blog/en',
                  };

                  url = joinURL(
                    window.blocklet?.appUrl || '',
                    prefix || '/',
                    map[params.row.data?.data?.type] || map.discussion!,
                    params.row.data?.data?.id
                  );
                } else {
                  url = joinURL(window.blocklet?.appUrl || '', prefix || '/', 'discussions');
                }

                window.open(url, '_blank');
              }}
            />
          ),
        },
      ].filter(Boolean),
    [t]
  );

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
        columnHeaderHeight={30}
        rowHeight={44}
        getRowId={(v) => v.id}
        rows={rows}
        columns={columns as any}
        rowCount={total ?? 0}
        pageSizeOptions={[10]}
        paginationModel={{ page: page - 1, pageSize: 10 }}
        paginationMode="server"
        onPaginationModelChange={({ page }) => onChangePage(page + 1)}
        getRowClassName={() => 'document-row'}
      />
    </Stack>
  );
};

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
      <Stack flexDirection="row" alignItems="center" justifyContent="center" height={1}>
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

const DocumentIcon = ({ document }: { document: KnowledgeDocumentCard }) => {
  if (document.type === 'text') {
    return <Box component={Custom} width={20} height={20} />;
  }

  if (document.type === 'file') {
    if (document.data?.type === 'file') {
      if (document.data?.relativePath.endsWith('.json') || document.data?.relativePath.endsWith('.md')) {
        return <Box component={JSON} width={20} height={20} />;
      }

      if (document.data?.relativePath.endsWith('.pdf')) {
        return <Box component={PDF} width={20} height={20} />;
      }

      if (document.data?.relativePath.endsWith('.txt')) {
        return <Box component={TXT} width={20} height={20} />;
      }

      if (document.data?.relativePath.endsWith('.doc') || document.data?.relativePath.endsWith('.docx')) {
        return <Box component={Documents} width={20} height={20} />;
      }
    }

    return <Box component={Unknown} width={20} height={20} />;
  }

  if (document.type === 'discussKit') {
    return <Box component={Discuss} width={20} height={20} />;
  }

  if (document.type === 'crawl') {
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
