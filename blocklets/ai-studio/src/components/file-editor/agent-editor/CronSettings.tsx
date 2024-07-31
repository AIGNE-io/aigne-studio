import 'react-js-cron/dist/styles.css';
import 'cronstrue/locales/zh_CN';

import { useCurrentProject } from '@app/contexts/project';
import { randomId, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, CronConfigFileYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import TrashIcon from '@iconify-icons/tabler/trash';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  GlobalStyles,
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
import cronstrue from 'cronstrue';
import { sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { MouseEvent, useCallback, useMemo, useState } from 'react';
import { Cron } from 'react-js-cron';

import PromptEditorField from '../prompt-editor-field';

export function CronSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;
  const { projectId, projectRef } = useCurrentProject();
  const { cronConfig } = useProjectStore(projectId, projectRef);

  const jobs = cronConfig.jobs?.filter((i) => i.agentId === agent.id);
  const [job, setJob] = useState<NonNullable<CronConfigFileYjs['jobs']>[number]>();

  const dialogState = usePopupState({ variant: 'popper' });

  const openSettingDialog = useCallback(
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
    doc.transact(() => {
      cronConfig.jobs ??= [];
      cronConfig.jobs.push({
        id: randomId(),
        name: '',
        cronExpression: '0 0 * * * *',
        enable: false,
        agentId: agent.id,
        inputs: {},
      });
    });
  }, []);

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
              <TableCell width={50} align="right" />
            </TableRow>
          </TableHead>

          <TableBody>
            {jobs?.map((job) => (
              <TableRow key={job.id} hover sx={{ cursor: 'pointer' }}>
                <TableCell onClick={(e) => openSettingDialog(e, job)}>{job.name || t('unnamed')}</TableCell>
                <TableCell onClick={(e) => openSettingDialog(e, job)}>
                  {job.cronExpression && <CronFormatter time={job.cronExpression} />}
                </TableCell>
                <TableCell align="center">
                  <Switch size="small" checked={job.enable || false} onChange={(_, check) => (job.enable = check)} />
                </TableCell>
                <TableCell align="right">
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

      <Dialog maxWidth="sm" fullWidth {...bindDialog(dialogState)}>
        <DialogTitle>{t('objectSetting', { object: t('cronJob') })}</DialogTitle>

        <DialogContent>
          {job && (
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
          )}
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
  const parameters = sortBy(Object.values(agent.parameters || {}), (i) => i.index);

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
