import 'react-js-cron/dist/styles.css';

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
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { MouseEvent, useCallback, useState } from 'react';
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

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('name')}</TableCell>
            <TableCell>{t('time')}</TableCell>
            <TableCell width={50} align="center">
              {t('enabled')}
            </TableCell>
            <TableCell width={50} align="right" />
          </TableRow>
        </TableHead>

        <TableBody>
          {jobs?.map((job) => (
            <TableRow key={job.id} hover sx={{ cursor: 'pointer' }}>
              <TableCell onClick={(e) => openSettingDialog(e, job)}>{job.name || t('unnamed')}</TableCell>
              <TableCell onClick={(e) => openSettingDialog(e, job)}>{job.cronExpression}</TableCell>
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

          <TableRow>
            <TableCell colSpan={3}>
              <Button
                startIcon={<Icon icon={PlusIcon} />}
                onClick={() => {
                  doc.transact(() => {
                    cronConfig.jobs ??= [];
                    cronConfig.jobs.push({
                      id: randomId(),
                      name: '',
                      cronExpression: '* * * * * *',
                      enable: false,
                      agentId: agent.id,
                      inputs: {},
                    });
                  });
                }}>
                New
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Dialog maxWidth="sm" fullWidth {...bindDialog(dialogState)}>
        <DialogTitle>Cron Job Configuration</DialogTitle>

        <DialogContent>
          {job && (
            <Stack gap={2}>
              <TextField label={t('name')} value={job.name || ''} onChange={(e) => (job.name = e.target.value)} />

              <Stack gap={1}>
                <Typography variant="subtitle2">{t('time')}</Typography>
                <GlobalStyles
                  styles={(theme) => ({
                    '.ant-select-dropdown': { zIndex: theme.zIndex.modal + 1 },
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
