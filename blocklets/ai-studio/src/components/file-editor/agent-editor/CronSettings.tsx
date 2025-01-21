import 'react-js-cron/dist/styles.css';
import 'cronstrue/locales/zh_CN';

import MdViewer from '@app/components/md-viewer';
import { useMultiTenantRestriction } from '@app/components/multi-tenant-restriction';
import { useCurrentProject } from '@app/contexts/project';
import { randomId, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import type { AssistantYjs, CronFileYjs, CronJob } from '@blocklet/ai-runtime/types';
import type { CronHistory } from '@blocklet/aigne-sdk/api/cron-history';
import { getCronHistories } from '@blocklet/aigne-sdk/api/cron-history';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import HistoryIcon from '@iconify-icons/tabler/history';
import PlusIcon from '@iconify-icons/tabler/plus';
import TrashIcon from '@iconify-icons/tabler/trash';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  GlobalStyles,
  Pagination,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import cronstrue from 'cronstrue';
import dayjs from 'dayjs';
import { sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import type { MouseEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Cron } from 'react-js-cron';

import PromptEditorField from '../prompt-editor-field';

export function CronSettingsSummary({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();

  const { projectId, projectRef } = useCurrentProject();
  const { cronConfig } = useProjectStore(projectId, projectRef);

  if (!cronConfig.jobs?.length) return null;

  const jobs = cronConfig.jobs.filter((i) => i.agentId === agent.id);
  const enabledJobs = jobs.filter((i) => i.enable);

  if (!jobs.length) return null;

  return (
    <Typography variant="caption" color="text.secondary">
      {t('cronJobsSummary', { jobs: jobs.length, enabledJobs: enabledJobs.length })}
    </Typography>
  );
}

export function CronSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;
  const { projectId, projectRef } = useCurrentProject();
  const { cronConfig } = useProjectStore(projectId, projectRef);
  const { quotaChecker } = useMultiTenantRestriction();

  const jobs = cronConfig.jobs?.filter((i) => i.agentId === agent.id);
  const [job, setJob] = useState<{ job: NonNullable<CronFileYjs['jobs']>[number]; type: 'edit' | 'history' }>();

  const dialogState = usePopupState({ variant: 'popper' });

  const openDialog = useCallback(
    (e: MouseEvent, j: NonNullable<typeof job>) => {
      setJob(j);
      dialogState.open(e);
    },
    [dialogState]
  );

  const deleteJob = useCallback((id: string) => {
    if (!cronConfig.jobs) return;
    const index = cronConfig.jobs.findIndex((i) => i.id === id);
    if (index >= 0) cronConfig.jobs.splice(index, 1);
  }, []);

  const newJob = useCallback(() => {
    if (quotaChecker.checkCronJobs()) {
      doc.transact(() => {
        cronConfig.jobs ??= [];
        cronConfig.jobs.push({
          id: randomId(),
          name: '',
          cronExpression: '0 * * * *',
          enable: false,
          agentId: agent.id,
          inputs: {},
        });
      });
    }
  }, [agent.id]);

  if (!jobs?.length) {
    return (
      <Stack gap={1} p={2} alignItems="center">
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {t('emptyObjectTip', { object: t('cronJob') })}
        </Typography>

        <Button startIcon={<Icon icon={PlusIcon} />} onClick={newJob}>
          {t('new')}
        </Button>
      </Stack>
    );
  }

  return (
    <>
      <TableContainer sx={{ 'th,td': { px: 1.5, py: 0.25, '&:last-of-type': { pr: 0.25 } }, td: { border: 'none' } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('name')}</TableCell>
              <TableCell>{t('time')}</TableCell>
              <TableCell width={80} align="center">
                {t('enabled')}
              </TableCell>
              <TableCell width={100} align="right" />
            </TableRow>
          </TableHead>

          <TableBody>
            {jobs?.map((job) => (
              <TableRow key={job.id} hover sx={{ cursor: 'pointer' }}>
                <TableCell onClick={(e) => openDialog(e, { job, type: 'edit' })}>{job.name || t('unnamed')}</TableCell>
                <TableCell onClick={(e) => openDialog(e, { job, type: 'edit' })}>
                  {job.cronExpression && <CronFormatter time={job.cronExpression} />}
                </TableCell>
                <TableCell align="center">
                  <Switch
                    size="small"
                    checked={job.enable || false}
                    onChange={(_, checked) => {
                      if (quotaChecker.checkCronJobs()) {
                        job.enable = checked;
                      }
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button
                    sx={{ p: 0, minWidth: 28, minHeight: 28 }}
                    onClick={(e) => openDialog(e, { job, type: 'history' })}>
                    <Icon icon={HistoryIcon} />
                  </Button>

                  <Button sx={{ p: 0, minWidth: 28, minHeight: 28 }} onClick={() => deleteJob(job.id)}>
                    <Icon icon={TrashIcon} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Box m={0.5}>
          <Button startIcon={<Icon icon={PlusIcon} />} onClick={newJob}>
            {t('new')}
          </Button>
        </Box>
      </TableContainer>

      <Dialog maxWidth={job?.type === 'edit' ? 'sm' : 'md'} fullWidth {...bindDialog(dialogState)}>
        <DialogTitle>
          {job?.type === 'edit'
            ? t('objectSetting', { object: t('cronJob') })
            : job?.type === 'history'
              ? t('executionHistory')
              : null}
        </DialogTitle>

        <DialogContent>
          {job?.type === 'edit' ? (
            <CronSettingsForm agent={agent} job={job.job} />
          ) : job?.type === 'history' ? (
            <CronJobHistories agent={agent} job={job.job} />
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button variant="contained" onClick={dialogState.close}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

const cronLocaleZH = {
  everyText: '每',
  emptyMonths: '每个月',
  emptyMonthDays: '每个月的每一天',
  emptyMonthDaysShort: '每月的某一天',
  emptyWeekDays: '每周的每一天',
  emptyWeekDaysShort: '每周的某一天',
  emptyHours: '每小时',
  emptyMinutes: '每分钟',
  emptyMinutesForHourPeriod: '每',
  yearOption: '年',
  monthOption: '月',
  weekOption: '周',
  dayOption: '日',
  hourOption: '小时',
  minuteOption: '分钟',
  rebootOption: '重启',
  prefixPeriod: '每',
  prefixMonths: '在',
  prefixMonthDays: '在',
  prefixWeekDays: '在',
  prefixWeekDaysForMonthAndYearPeriod: '和',
  prefixHours: '在',
  prefixMinutes: ':',
  prefixMinutesForHourPeriod: '在',
  suffixMinutesForHourPeriod: '分钟',
  errorInvalidCron: '无效的 cron 表达式',
  clearButtonText: '清除',
  weekDays: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  altWeekDays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  altMonths: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
};

function CronSettingsForm({ agent, job }: { agent: AssistantYjs; job: CronJob }) {
  const { t, locale } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;

  return (
    <Stack gap={2}>
      <TextField label={t('name')} value={job.name || ''} onChange={(e) => (job.name = e.target.value)} />

      <Stack gap={1}>
        <Typography variant="subtitle2">{t('time')}</Typography>
        <GlobalStyles
          styles={(theme) => ({
            '.ant-select-dropdown': { zIndex: theme.zIndex.modal + 1 },
            '.ant-select-selector': {
              borderColor: `${theme.palette.divider} !important`,
              backgroundColor: 'transparent !important',
              '&:hover': {
                borderColor: `${theme.palette.primary.main} !important`,
              },
            },
            '.ant-btn-primary.ant-btn-dangerous': {
              backgroundColor: '#030712',
              '&:hover': {
                backgroundColor: '#030712 !important',
                opacity: 0.7,
              },
            },
          })}
        />
        <Box
          component={Cron}
          value={job.cronExpression || ''}
          setValue={(v: string) => (job.cronExpression = v)}
          locale={locale === 'zh' ? cronLocaleZH : undefined}
        />
      </Stack>

      <Stack>
        <Typography variant="subtitle2">{t('inputs')}</Typography>

        <AgentInputsForm
          agent={agent}
          inputs={job.inputs}
          onChange={(update) => {
            doc.transact(() => {
              job.inputs ??= {};
              update(job.inputs);
            });
          }}
        />
      </Stack>
    </Stack>
  );
}

function AgentInputsForm({
  agent,
  inputs,
  onChange,
}: {
  agent: AssistantYjs;
  inputs?: { [key: string]: any };
  onChange: (update: (value: { [key: string]: any }) => void) => void;
}) {
  const { projectId, projectRef } = useCurrentProject();
  const parameters = sortBy(Object.values(agent.parameters || {}), (i) => i.index).filter((i) => !i.data.hidden);

  return (
    <Box>
      {parameters.map(({ data }) => {
        if (!data?.key || data.type === 'source') return null;

        const placeholder = data.placeholder?.replace(/([^\w]?)$/, '');

        return (
          <Stack key={data.id}>
            <Typography variant="caption">{data.label || data.key}</Typography>

            <PromptEditorField
              placeholder={`${placeholder ? `${placeholder}, ` : ''}default {{ ${data.key} }}`}
              value={inputs?.[data.key] || ''}
              projectId={projectId}
              gitRef={projectRef}
              assistant={agent}
              path={[]}
              onChange={(value) =>
                onChange((inputs) => {
                  inputs[data.key!] = value;
                })
              }
            />
          </Stack>
        );
      })}
    </Box>
  );
}

function CronFormatter({ time }: { time: string }) {
  const { locale } = useLocaleContext();

  return useMemo(() => {
    return cronstrue.toString(time, { locale: locale === 'zh' ? 'zh_CN' : locale });
  }, [time]);
}

function CronJobHistories({ agent, job }: { agent: AssistantYjs; job: CronJob }) {
  const { t, locale } = useLocaleContext();
  const { projectId } = useCurrentProject();

  const limit = 10;
  const [page, setPage] = useState(1);

  const { loading, data, error } = useRequest(
    () => getCronHistories({ projectId, agentId: agent.id, cronJobId: job.id, page, limit }),
    { refreshDeps: [page, limit] }
  );

  const dialogState = usePopupState({ variant: 'dialog' });
  const [selectedHistory, setSelectedHistory] = useState<CronHistory>();
  const openDialog = useCallback(
    (history: CronHistory) => {
      setSelectedHistory(history);
      dialogState.open();
    },
    [dialogState]
  );

  return (
    <Box>
      {error && <Alert severity="error">{error.message}</Alert>}

      <TableContainer sx={{ 'td,th': { whiteSpace: 'nowrap' } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('input')}</TableCell>
              <TableCell>{t('output')}</TableCell>
              <TableCell>{t('error')}</TableCell>
              <TableCell>{t('startTime')}</TableCell>
              <TableCell align="right">{t('duration')}</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data?.list.map((item) => (
              <TableRow key={item.id} hover onClick={() => openDialog(item)} sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <Typography noWrap maxWidth={150}>
                    {JSON.stringify(item.inputs)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography noWrap maxWidth={150}>
                    {JSON.stringify(item.outputs)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {item.error && (
                    <Typography noWrap maxWidth={100}>
                      {JSON.stringify(item.error)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {/* @ts-ignore */}
                  <RelativeTime type="absolute" value={item.startTime} locale={locale} />
                </TableCell>
                <TableCell align="right">
                  <Duration {...item} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && !data?.list.length && (
        <Stack alignItems="center" my={4}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {data?.count === 0 && (
        <Stack alignItems="center" my={4}>
          <Typography variant="caption" color="text.secondary">
            {t('noData')}
          </Typography>
        </Stack>
      )}

      {data && (
        <Stack alignItems="flex-end" mt={4}>
          <Pagination count={Math.ceil(data.count / limit)} page={page} onChange={(_, page) => setPage(page)} />
        </Stack>
      )}

      <Dialog maxWidth="md" fullWidth {...bindDialog(dialogState)}>
        <DialogTitle>{t('executionHistory')}</DialogTitle>

        <DialogContent>
          {selectedHistory && (
            <Stack gap={2} sx={{ pre: { whiteSpace: 'pre-wrap' } }}>
              <Typography variant="caption">{t('input')}</Typography>
              <MdViewer content={`${'```json'}\n${JSON.stringify(selectedHistory.inputs, null, 2)}${'\n```'}`} />

              <Typography variant="caption">{t('output')}</Typography>
              <MdViewer content={`${'```json'}\n${JSON.stringify(selectedHistory.outputs, null, 2)}${'\n```'}`} />

              {selectedHistory.error && (
                <>
                  <Typography variant="caption">{t('error')}</Typography>
                  <MdViewer content={`${'```json'}\n${JSON.stringify(selectedHistory.error, null, 2)}${'\n```'}`} />
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="contained" onClick={dialogState.close}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function Duration({ startTime, endTime }: { startTime: string; endTime: string }) {
  const { t } = useLocaleContext();

  const s = dayjs(startTime);
  const e = dayjs(endTime);
  if (!s.isValid() || !e.isValid()) return null;
  const duration = e.diff(s, 'seconds');

  return t('durationSeconds', { duration });
}
