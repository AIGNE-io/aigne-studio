import { useReadOnly } from '@app/contexts/session';
import { useAssistantCompare } from '@app/pages/project/state';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useAgents } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RouterAssistantYjs, Tool } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { Icon } from '@iconify-icon/react';
import ArrowFork from '@iconify-icons/tabler/corner-down-right';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import PencilIcon from '@iconify-icons/tabler/pencil';
import PlusIcon from '@iconify-icons/tabler/plus';
import Trash from '@iconify-icons/tabler/trash';
import { Box, Button, Stack, StackProps, TextField, Tooltip, Typography, styled } from '@mui/material';
import { QueryBuilderMaterial } from '@react-querybuilder/material';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useRoutesAssistantOutputs } from '../output/OutputSettings';
import PromptEditorField from '../prompt-editor-field';
import ToolDialog, { FROM_API, ToolItemInputOutputs } from './dialog';

export default function RouterAssistantEditor({
  projectId,
  gitRef,
  value,
  compareValue,
  disabled,
  isRemoteCompare,
  openApis = [],
}: {
  projectId: string;
  gitRef: string;
  value: RouterAssistantYjs;
  compareValue?: RouterAssistantYjs;
  disabled?: boolean;
  isRemoteCompare?: boolean;
  openApis?: DatasetObject[];
}) {
  const { t } = useLocaleContext();
  const ref = useRef(null);
  const toolForm = useRef<any>(null);
  const selectedTool = useRef<{ selected: string }>({ selected: '' });
  const openAPI: (DatasetObject & { from?: 'blockletAPI' })[] = openApis.map((x) => ({ ...x, from: FROM_API }));

  const dialogState = usePopupState({ variant: 'dialog' });
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });
  const checkOutputVariables = useRoutesAssistantOutputs({ value, projectId, gitRef, openApis: openAPI });

  const routes = value.routes && sortBy(Object.values(value.routes), (i) => i.index);

  return (
    <Stack gap={1.5}>
      <Stack gap={1} width={1} ref={ref}>
        <Tooltip title={value.prompt ? undefined : t('promptRequired')}>
          <Box sx={{ borderRadius: 1, flex: 1 }}>
            <Box
              height={1}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                border: 1,
                borderColor: '#1976d2',
                borderRadius: 1,
                background: '#fff',
                overflow: 'hidden',
              }}>
              <Stack direction="row" alignItems="center" gap={1} p={1} px={1.5} borderBottom="1px solid #BFDBFE">
                {t('prompt')}
              </Stack>

              <Box
                sx={{
                  flex: 1,
                  background: value.prompt ? '#fff' : 'rgba(255, 215, 213, 0.4)',
                }}>
                <StyledPromptEditor
                  readOnly={disabled}
                  placeholder={t('promptPlaceholder')}
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[value.id, 'prompt']}
                  assistant={value}
                  value={value.prompt}
                  onChange={(content) => (value.prompt = content)}
                  ContentProps={{
                    sx: {
                      flex: 1,
                      '&:hover': {
                        bgcolor: 'transparent !important',
                      },
                      '&:focus': {
                        bgcolor: 'transparent !important',
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Tooltip>

        <Stack gap={1}>
          <QueryBuilderMaterial>
            <Stack gap={1}>
              {(routes || [])?.map(({ data: agent }) => (
                <React.Fragment key={agent.id}>
                  <AgentItemView
                    getDiffBackground={getDiffBackground}
                    projectId={projectId}
                    projectRef={gitRef}
                    agent={agent}
                    assistant={value}
                    readOnly={readOnly}
                    onEdit={() => {
                      if (readOnly) return;
                      toolForm.current?.form.reset(cloneDeep(agent));
                      selectedTool.current = { selected: agent.id };
                      dialogState.open();
                    }}
                  />
                </React.Fragment>
              ))}
            </Stack>
          </QueryBuilderMaterial>

          {checkOutputVariables?.error && (
            <Typography variant="subtitle5" color="warning.main" ml={1}>
              {checkOutputVariables?.error}
            </Typography>
          )}

          {!readOnly && (
            <Box>
              <Button
                disabled={disabled}
                startIcon={<Box component={Icon} icon={PlusIcon} sx={{ fontSize: 16 }} />}
                onClick={() => {
                  toolForm.current?.form.reset({ id: '' });
                  dialogState.open();
                }}>
                {t('addObject', { object: t('agent') })}
              </Button>
            </Box>
          )}
        </Stack>
      </Stack>

      <ToolDialog
        ref={toolForm}
        assistant={value}
        DialogProps={{ ...bindDialog(dialogState) }}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;

          doc.transact(() => {
            value.routes ??= {};

            if (selectedTool.current.selected) {
              const old = value.routes[selectedTool.current.selected];

              value.routes[tool.id] = {
                index: old?.index ?? Math.max(-1, ...Object.values(value.routes).map((i) => i.index)) + 1,
                data: {
                  ...tool,
                },
              };

              if (selectedTool.current.selected !== tool.id) {
                delete value.routes[selectedTool.current.selected];
              }
            } else {
              value.routes[tool.id] = {
                index: Math.max(-1, ...Object.values(value.routes).map((i) => i.index)) + 1,
                data: { ...tool },
              };
            }

            sortBy(Object.values(value.routes), 'index').forEach((tool, index) => (tool.index = index));
          });

          selectedTool.current = { selected: '' };
          dialogState.close();
        }}
      />
    </Stack>
  );
}

const StyledPromptEditor = styled(PromptEditorField)(({ theme }) =>
  theme.unstable_sx({
    p: 0,
    '.ContentEditable__root': {
      p: 1,
      px: 1.5,
      minHeight: 64,
      ...theme.typography.body1,
      bgcolor: 'transparent',

      ':hover': {
        bgcolor: 'action.hover',
      },

      ':focus': {
        bgcolor: 'action.hover',
      },
    },

    '.Placeholder__root': {
      top: '8px',
      left: '12px',
      bottom: 'inherit',
      fontSize: '14px',
      lineHeight: '24px',
    },
  })
);

export function AgentItemView({
  getDiffBackground,
  projectId,
  projectRef,
  agent,
  assistant,
  readOnly,
  onEdit,
  ...props
}: {
  assistant: RouterAssistantYjs;
  getDiffBackground: (path: any, id?: string | undefined, defaultValue?: string | undefined) => { [x: string]: string };
  projectId: string;
  projectRef: string;
  agent: Tool;
  readOnly?: boolean;
  onEdit: () => void;
} & StackProps) {
  const navigate = useNavigate();

  const { t } = useLocaleContext();

  const target = useAgents({ type: 'tool' }).agentMap[agent.id];
  const { getFileById } = useProjectStore(projectId, projectRef);
  const file = getFileById(agent.id);

  const red = '#e0193e';
  return (
    <Box display="flex" alignItems="center" gap={0.5} width={1}>
      <Box className="center" width={16} height={16}>
        <Box component={Icon} icon={ArrowFork} sx={{ fontSize: 16, color: !target ? red : '#1976d2' }} />
      </Box>

      <Stack
        key={`${projectId}-${projectRef}-${assistant.id}-${agent.id}`}
        width={1}
        {...props}
        sx={{
          background: '#F9FAFB',

          py: 1,
          px: 1.5,
          minHeight: 40,
          gap: 1,
          alignItems: 'center',
          cursor: 'pointer',
          borderRadius: 1,
          border: `1px solid ${!target ? red : '#1976d2'}`,
          ':hover': {
            '.hover-visible': {
              display: 'flex',
            },
          },
          backgroundColor: { ...getDiffBackground('prepareExecutes', `${assistant.id}.data.routes.${agent.id}`) },
        }}>
        <Stack width={1} gap={1.5} sx={{ position: 'relative' }}>
          <Stack>
            <TextField
              disabled={!target}
              onClick={(e) => e.stopPropagation()}
              hiddenLabel
              size="small"
              variant="standard"
              value={agent.functionName ?? target?.name}
              placeholder={target ? target?.name || t('unnamed') : t('agentNotFound')}
              onChange={(e) => {
                agent.functionName = e.target.value;
              }}
              sx={{
                mb: 0,
                lineHeight: '22px',
                fontWeight: 500,
                input: {
                  fontSize: '18px',
                  color: '#1976d2',
                },
              }}
            />

            <TextField
              multiline
              disabled={!target}
              onClick={(e) => e.stopPropagation()}
              hiddenLabel
              placeholder={target?.description || t('description')}
              size="small"
              variant="standard"
              value={agent.description}
              onChange={(e) => (agent.description = e.target.value)}
              sx={{
                lineHeight: '24px',
                input: {
                  fontSize: '14px',
                },
              }}
            />
          </Stack>

          {target && <ToolItemInputOutputs tool={target} />}

          <Stack
            className="hover-visible"
            justifyContent="center"
            alignItems="center"
            sx={{ display: 'none', position: 'absolute', right: 0, top: 0 }}>
            <Stack direction="row" gap={0.5}>
              {target && (
                <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onEdit}>
                  <Box component={Icon} icon={PencilIcon} sx={{ fontSize: 18, color: 'text.secondary' }} />
                </Button>
              )}

              {!readOnly && (
                <Button
                  sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const doc = (getYjsValue(assistant) as Map<any>).doc!;
                    doc.transact(() => {
                      const selectTool = assistant.routes?.[agent.id];
                      if (selectTool) {
                        selectTool.data.onEnd = undefined;
                      }

                      if (assistant.routes) {
                        delete assistant.routes[agent.id];
                        sortBy(Object.values(assistant.routes), 'index').forEach((i, index) => (i.index = index));
                      }
                    });
                  }}>
                  <Box component={Icon} icon={Trash} sx={{ fontSize: 18, color: '#E11D48' }} />
                </Button>
              )}

              {file && (
                <Button
                  sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(joinURL('.', `${file.id}.yaml`));
                  }}>
                  <Box component={Icon} icon={ExternalLinkIcon} sx={{ fontSize: 18 }} />
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}
