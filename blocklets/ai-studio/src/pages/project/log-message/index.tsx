import { useProjectStore } from '@app/pages/project/yjs-state';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import LeftArrowIcon from '@iconify-icons/tabler/chevron-left';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  List,
  Typography,
  styled,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import dayjs from 'dayjs';
import { groupBy } from 'lodash';
import React, { useState } from 'react';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import History from '../../../../api/src/store/models/history';
import { getLogHistories } from '../../../libs/message';
import { MessageView } from '../debug-view';

const useFetchLogsList = (
  projectId: string,
  sessionId: string | null = '',
  agentId: string | null = '',
  date: string | null = ''
) => {
  const dataState = useInfiniteScroll(
    async (
      d: { list: History[]; next: boolean; size: number; page: number } = { list: [], next: false, size: 10, page: 1 }
    ) => {
      const { page, size } = d || {};
      const { messages } = await getLogHistories({ projectId, sessionId, agentId, date, page, size });

      return { list: messages || [], next: messages.length >= size, size, page: (d?.page || 1) + 1 };
    },
    { isNoMore: (d) => !d?.next, reloadDeps: [date] }
  );

  const [loadingRef] = useInfiniteScrollHook({
    loading: dataState.loading || dataState.loadingMore,
    hasNextPage: Boolean(dataState.data?.next),
    onLoadMore: () => dataState.loadMore(),
    rootMargin: '0px 0px 200px 0px',
  });

  return { loadingRef, dataState };
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
  const { loadingRef, dataState } = useFetchLogsList(projectId, sessionId, agentId, date);
  const { getFileById } = useProjectStore(projectId, gitRef || 'main');

  const hasAppHistory = location.state && location.state.fromApp;

  const logs = dataState?.data?.list || [];
  const logsGroupByDate = groupBy(logs, (log) => dayjs(log.createdAt).format('YYYY/MM/DD'));
  const agentName = () => {
    if (agentId) {
      const agent = getFileById(agentId);
      return agent?.name ? `${agent.name} ${t('log')}` : t('agentLog');
    }

    return t('agentLog');
  };

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

          {logs.length ? (
            <List sx={{ p: 0, pb: 2.5 }}>
              {Object.entries(logsGroupByDate).map(([date, items]) => (
                <React.Fragment key={date}>
                  <Box mt={2.5} mb={1}>
                    <Typography variant="body2" component="div" sx={{ fontSize: 16, color: 'text.secondary' }}>
                      {date}
                    </Typography>
                  </Box>

                  <Grid container spacing={2}>
                    {items.map((log) => (
                      <Grid
                        item
                        xs={12}
                        md={6}
                        lg={4}
                        key={log.id}
                        onClick={() => {
                          const messages = log.logs || [];

                          showDialog({
                            formSx: {
                              '.MuiDialogTitle-root': {
                                border: 0,
                              },
                              '.MuiDialogActions-root': {
                                border: 0,
                              },
                            },
                            maxWidth: 'lg',
                            fullWidth: true,
                            title: <Box sx={{ wordWrap: 'break-word' }}>{t('viewLog')}</Box>,
                            content: (
                              <Box>
                                {messages.map((message, index) => (
                                  <MessageView index={index} message={message} projectId={projectId} gitRef={gitRef} />
                                ))}
                              </Box>
                            ),
                            okText: t('confirm'),
                            cancelText: t('cancel'),
                            onOk: () => {},
                          });
                        }}>
                        <LogCard
                          error={log.error}
                          runType={log.runType!}
                          title={getFileById(log.agentId!)?.name || ''}
                          result={JSON.stringify(log.outputs!)}
                          tokenCount={log?.usage?.totalTokens!}
                          date={dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 500,
                color: 'text.secondary',
                fontSize: 16,
              }}>
              {t('noLogs')}
            </Box>
          )}

          {(dataState.loadingMore || dataState?.data?.next) && (
            <Box width={1} height={60} className="center" ref={loadingRef}>
              <Box display="flex" justifyContent="center">
                <CircularProgress size={24} />
              </Box>
            </Box>
          )}
        </Container>
      </Box>

      {dialog}
    </>
  );
};

export default LogMessages;

const StyledCard = styled(Card)(({ theme }) => ({
  width: '100%',
  maxWidth: 900,
  height: 250,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  cursor: 'pointer',
}));

const Header = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const CardFooter = styled(Box)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const LogCard = ({
  runType,
  title,
  result,
  tokenCount,
  date,
  error,
}: {
  runType: string;
  title: string;
  result: string;
  tokenCount: number;
  date: string;
  error: string;
}) => {
  return (
    <StyledCard>
      <Header gap={1}>
        <Box sx={{ width: 8, height: 8, borderRadius: '100%', bgcolor: error ? 'error.dark' : 'success.light' }} />

        <Typography variant="h6" component="div" sx={{ flex: 1, width: 0 }} className="ellipsis">
          {title}
        </Typography>

        <Chip
          size="small"
          label={runType}
          variant="filled"
          color="default"
          sx={{
            borderRadius: '4px',
            textTransform: 'capitalize',
          }}
        />
      </Header>

      <CardContent sx={{ flexGrow: 1, height: 0, overflow: 'hidden', px: 0, py: 1 }}>
        <pre>{error ? JSON.stringify(error, null, 2) : JSON.stringify(JSON.parse(result), null, 2)}</pre>
      </CardContent>

      <Divider sx={{ my: 2 }} />

      <CardFooter>
        {tokenCount ? <Typography variant="body2">{tokenCount} Token</Typography> : <Box />}

        <Typography variant="caption" color="action.disabled">
          {date}
        </Typography>
      </CardFooter>
    </StyledCard>
  );
};
