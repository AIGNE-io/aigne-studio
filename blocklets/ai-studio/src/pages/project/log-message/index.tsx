import { useProjectStore } from '@app/pages/project/yjs-state';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import LeftArrowIcon from '@iconify-icons/tabler/chevron-left';
import { Box, Button, Chip, Container, Stack, Theme, Typography, styled, useMediaQuery } from '@mui/material';
import { DataGrid, GridColDef, gridClasses } from '@mui/x-data-grid';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { getLogHistories } from '../../../libs/message';
import { MessageView } from '../debug-view';

const useFetchLogsList = (
  projectId: string,
  sessionId: string | null = '',
  agentId: string | null = '',
  date: string | null = ''
) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, loading, refresh } = useRequest(
    async () => {
      const { messages, count } = await getLogHistories({ projectId, sessionId, agentId, date, page, size: pageSize });
      return { list: messages || [], count };
    },
    {
      refreshDeps: [page, pageSize, date],
    }
  );

  return { data, loading, page, pageSize, setPage, setPageSize, refresh };
};

const LogMessages = () => {
  const navigate = useNavigate();
  const { projectId, ref: gitRef } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const agentId = searchParams.get('agentId');
  const [date, setDate] = useState<string | undefined>(undefined);
  const location = useLocation();

  if (!projectId || !gitRef) {
    throw new Error('projectId is required');
  }

  const { dialog, showDialog } = useDialog();
  const { t } = useLocaleContext();
  const { getFileById } = useProjectStore(projectId, gitRef || 'main');
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const { data, loading, page, pageSize, setPage, setPageSize } = useFetchLogsList(projectId, sessionId, agentId, date);
  const logs = data?.list || [];
  const totals = data?.count || 0;

  const hasAppHistory = location.state && location.state.fromApp;

  const agentName = () => {
    if (agentId) {
      const agent = getFileById(agentId);
      return agent?.name ? `${agent.name} ${t('log')}` : t('agentLog');
    }

    return t('agentLog');
  };

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'agent',
        headerName: t('agent'),
        flex: 1,
        renderCell: (params) => <Box>{getFileById(params.row.agentId!)?.name || ''}</Box>,
      },
      {
        field: 'runType',
        headerName: t('triggerType'),
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.runType || 'agent'}
            variant="filled"
            color="default"
            sx={{ borderRadius: '4px', textTransform: 'capitalize' }}
          />
        ),
      },
      {
        field: 'status',
        headerName: t('status'),
        width: 100,
        renderCell: (params) => (
          <Chip
            variant="filled"
            size="small"
            label={params.row.error ? t('failed') : t('success')}
            color={params.row.error ? 'error' : 'success'}
            sx={{ borderRadius: '4px', textTransform: 'capitalize', fontSize: 12 }}
          />
        ),
      },
      {
        field: 'tokenCount',
        headerName: t('tokenCount'),
        renderCell: (params) => params.row?.usage?.totalTokens || '-',
      },
      {
        field: 'createdAt',
        headerName: t('executionTime'),
        width: 180,
        renderCell: (params) => dayjs(params.row.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      },
    ],
    [t, getFileById, showDialog, isMobile, projectId, gitRef]
  );

  return (
    <>
      <Box overflow="auto" height="100%">
        <Container maxWidth="lg" sx={{ height: '100%' }}>
          {hasAppHistory && (
            <Button
              onClick={() => navigate(-1)}
              sx={{
                p: 0,
                mt: 2.5,
                display: 'flex',
                justifyContent: 'flex-start',
                '&:hover': {
                  background: 'transparent',
                },
              }}>
              <Box component={Icon} icon={LeftArrowIcon} sx={{ fontSize: 24, color: 'text.secondary' }} />
            </Button>
          )}

          <Header pt={2.5}>
            <Typography variant="h5">{agentName()}</Typography>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label={t('logDate')}
                value={date ? dayjs(date) : null}
                onChange={(value) => setDate(value?.format('YYYY-MM-DD') || '')}
                format="YYYY/MM/DD"
                slotProps={{
                  field: { clearable: true, onClear: () => setDate(undefined) },
                }}
              />
            </LocalizationProvider>
          </Header>

          <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5, mt: 2 }}>
            <Stack flex={1} sx={{ overflowX: 'auto' }}>
              <Table
                sx={{
                  minWidth: 800,
                  border: 0,
                  [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: { outline: 'none' },
                  [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]: {
                    outline: 'none',
                  },
                  [`& .${gridClasses.footerContainer}`]: { border: 0 },
                }}
                autoHeight
                disableColumnMenu
                columnHeaderHeight={44}
                rowHeight={44}
                getRowId={(row) => row.id}
                rows={logs}
                columns={columns}
                rowCount={totals || 0}
                pageSizeOptions={[10, 20, 50]}
                paginationModel={{ page: page - 1, pageSize }}
                paginationMode="server"
                onPaginationModelChange={({ page, pageSize: newPageSize }) => {
                  setPage(page + 1);
                  setPageSize(newPageSize);
                }}
                loading={loading}
                slots={{
                  noRowsOverlay: () => (
                    <Box className="center" height={200}>
                      <Typography color="text.secondary" fontSize={16}>
                        {t('noLogs')}
                      </Typography>
                    </Box>
                  ),
                }}
                onRowClick={(params) => {
                  showDialog({
                    formSx: {
                      '.MuiDialogTitle-root': {
                        border: 0,
                      },
                      '.MuiDialogActions-root': {
                        border: 0,
                      },
                      '.MuiDialogContent-root': {
                        padding: '12px 0 !important',
                      },
                    },
                    maxWidth: 'lg',
                    fullWidth: true,
                    fullScreen: isMobile,
                    title: <Box sx={{ wordWrap: 'break-word' }}>{t('viewLog')}</Box>,
                    content: (
                      <Box>
                        {(params.row.logs || []).map((message: any, index: number) => (
                          <MessageView
                            key={`message-${index}`}
                            index={index}
                            message={message}
                            projectId={projectId}
                            gitRef={gitRef}
                          />
                        ))}
                      </Box>
                    ),
                    okText: t('confirm'),
                    cancelText: t('cancel'),
                    onOk: () => {},
                  });
                }}
              />
            </Stack>
          </Box>
        </Container>
      </Box>

      {dialog}
    </>
  );
};

export default LogMessages;

const Header = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

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
