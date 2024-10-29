import PopperMenu from '@app/components/menu/PopperMenu';
import { useReadOnly } from '@app/contexts/session';
import { getProjectIconUrl } from '@app/libs/project';
import { useAssistantCompare, useProjectState } from '@app/pages/project/state';
import { newDefaultPrompt } from '@app/pages/project/template';
import { PROMPTS_FOLDER_NAME, createFileName, useCreateFile, useProjectStore } from '@app/pages/project/yjs-state';
import DiDAvatar from '@arcblock/ux/lib/Avatar';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, RouterAssistantYjs, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import getOpenApiTextFromI18n from '@blocklet/dataset-sdk/util/get-open-api-i18n-text';
import { Icon } from '@iconify-icon/react';
import CheckIcon from '@iconify-icons/tabler/check';
import ArrowFork from '@iconify-icons/tabler/corner-down-right';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import PencilIcon from '@iconify-icons/tabler/pencil';
import PlusIcon from '@iconify-icons/tabler/plus';
import Star from '@iconify-icons/tabler/star';
import StarFill from '@iconify-icons/tabler/star-filled';
import Trash from '@iconify-icons/tabler/trash';
import {
  Avatar,
  Box,
  Button,
  List,
  ListSubheader,
  ListSubheaderProps,
  MenuItem,
  Stack,
  StackProps,
  TextField,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { cloneDeep, pick, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useAllSelectDecisionAgentOutputs, useRoutesAssistantOutputs } from '../output/OutputSettings';
import PromptEditorField from '../prompt-editor-field';
import ToolDialog, { FROM_API, RouteOption } from './dialog';

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
  const { t, locale } = useLocaleContext();
  const ref = useRef(null);
  const toolForm = useRef<any>(null);
  const dialogState = usePopupState({ variant: 'dialog' });
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });
  const { store } = useProjectStore(projectId, gitRef);
  const { getAllSelectCustomOutputs } = useAllSelectDecisionAgentOutputs({ value, projectId, gitRef });
  const checkOutputVariables = useRoutesAssistantOutputs({ value, projectId, gitRef, openApis });

  const routes = value.routes && sortBy(Object.values(value.routes), (i) => i.index);
  const agentOptions: RouteOption[] = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i))
    .filter((i) => i.id !== value.id)
    .map((i) => ({ id: i.id, type: i.type, name: i.name, from: undefined }));
  const openApiOptions = openApis
    .map((x) => ({ ...x, from: FROM_API }))
    .map((dataset) => ({
      id: dataset.id,
      type: dataset.type,
      name:
        getOpenApiTextFromI18n(dataset, 'summary', locale) ||
        getOpenApiTextFromI18n(dataset, 'description', locale) ||
        t('unnamed'),
      from: dataset.from,
    })) as RouteOption[];
  const outputVariables = value.outputVariables && sortBy(Object.values(value.outputVariables), 'index');

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
    const doc = (getYjsValue(value) as Map<any>).doc!;
    doc.transact(() => {
      value.outputVariables ??= {};
      update(value.outputVariables);
      sortBy(Object.values(value.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
  };

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
                borderColor: '#3B82F6',
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
          {routes?.map(({ data: agent }) => (
            <Box key={agent.id} display="flex" alignItems="center" gap={0.5} width={1}>
              <AgentItemView
                getDiffBackground={getDiffBackground}
                projectId={projectId}
                projectRef={gitRef}
                agent={agent}
                assistant={value}
                readOnly={readOnly}
                openApiOptions={openApiOptions}
                onEdit={() => {
                  if (readOnly) return;
                  toolForm.current?.form.reset(cloneDeep(agent));
                  dialogState.open();
                }}
              />
            </Box>
          ))}

          {checkOutputVariables?.error && (
            <Typography variant="subtitle5" color="warning.main" ml={1}>
              {checkOutputVariables?.error}
            </Typography>
          )}

          {!readOnly && (
            <Box>
              <AddSelectAgentPopperButton
                projectId={projectId}
                gitRef={gitRef}
                assistant={value}
                agentOptions={agentOptions}
                openApiOptions={openApiOptions}
                onSelect={async (tool) => {
                  const doc = (getYjsValue(value) as Map<any>).doc!;

                  doc.transact(async () => {
                    value.routes ??= {};

                    const old = value.routes[tool.id];

                    value.routes[tool.id] = {
                      index: old?.index ?? Math.max(-1, ...Object.values(value.routes).map((i) => i.index)) + 1,
                      data: tool,
                    };

                    sortBy(Object.values(value.routes), 'index').forEach((tool, index) => (tool.index = index));

                    setField((vars) => {
                      cloneDeep(getAllSelectCustomOutputs(openApis)).forEach((data) => {
                        const exist = data.name ? outputVariables?.find((i) => i.data.name === data.name) : undefined;
                        if (!exist) {
                          const id = nanoid();
                          vars[id] = {
                            index: Object.values(vars).length,
                            data: { ...cloneDeep(data), required: undefined, id },
                          };
                        }
                        sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
                      });
                    });
                  });
                }}
              />
            </Box>
          )}
        </Stack>
      </Stack>

      <ToolDialog
        ref={toolForm}
        projectId={projectId}
        assistant={value}
        gitRef={gitRef}
        openApis={openApis.map((x) => ({ ...x, from: FROM_API }))}
        DialogProps={{ ...bindDialog(dialogState) }}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;

          doc.transact(() => {
            value.routes ??= {};

            const old = value.routes[tool.id];

            value.routes[tool.id] = {
              index: old?.index ?? Math.max(-1, ...Object.values(value.routes).map((i) => i.index)) + 1,
              data: tool,
            };

            sortBy(Object.values(value.routes), 'index').forEach((tool, index) => (tool.index = index));
          });
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
  openApiOptions = [],
  ...props
}: {
  assistant: RouterAssistantYjs;
  getDiffBackground: (path: any, id?: string | undefined, defaultValue?: string | undefined) => { [x: string]: string };
  projectId: string;
  projectRef: string;
  agent: Tool;
  readOnly?: boolean;
  onEdit: () => void;
  openApiOptions: RouteOption[];
} & StackProps) {
  const navigate = useNavigate();

  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, projectRef);

  const f = store.files[agent.id];
  const file = f && isAssistant(f) ? f : undefined;

  const api = openApiOptions.find((i) => i.id === agent.id);
  const target = file ?? api;

  const red = '#e0193e';
  return (
    <>
      <Box className="center">
        <Box component={Icon} icon={ArrowFork} sx={{ fontSize: 16, color: !target ? red : '#6D28D9' }} />
      </Box>

      <Stack
        key={`${projectId}-${projectRef}-${assistant.id}-${agent.id}`}
        width={1}
        direction="row"
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
          border: `1px solid ${!target ? red : '#7C3AED'}`,
          ':hover': {
            '.hover-visible': {
              display: 'flex',
            },
          },
          backgroundColor: { ...getDiffBackground('prepareExecutes', `${assistant.id}.data.routes.${agent.id}`) },
        }}>
        <Stack width={1}>
          <TextField
            disabled={!target}
            onClick={(e) => e.stopPropagation()}
            hiddenLabel
            placeholder={target ? target?.name || t('unnamed') : t('agentNotFound')}
            size="small"
            variant="standard"
            value={target ? target?.name || t('unnamed') : t('agentNotFound')}
            InputProps={{ readOnly: true }}
            sx={{
              mb: 0,
              lineHeight: '22px',
              fontWeight: 500,
              input: {
                fontSize: '12px',
                color: '#6D28D9',
              },
            }}
          />

          <TextField
            disabled={!target}
            onClick={(e) => e.stopPropagation()}
            hiddenLabel
            placeholder={target ? agent.functionName || t('routeDesc') : t('agentNotFound')}
            size="small"
            variant="standard"
            value={agent.functionName}
            onChange={(e) => (agent.functionName = e.target.value)}
            sx={{
              lineHeight: '24px',
              input: {
                fontSize: '14px',
                color: assistant.defaultToolId === agent.id ? 'primary.main' : '',
              },
            }}
          />
        </Stack>

        <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={0.5} flex={1}>
          {target && (
            <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onEdit}>
              <Box component={Icon} icon={PencilIcon} sx={{ fontSize: 18, color: 'text.secondary' }} />
            </Button>
          )}

          {target && (
            <Tooltip title={assistant.defaultToolId === agent.id ? t('unsetDefaultTool') : t('setDefaultTool')}>
              <Button
                sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  const doc = (getYjsValue(assistant) as Map<any>).doc!;
                  doc.transact(() => {
                    if (assistant.defaultToolId === agent.id) {
                      assistant.defaultToolId = undefined;
                    } else {
                      assistant.defaultToolId = agent.id;
                    }
                  });
                }}>
                {assistant.defaultToolId === agent.id ? (
                  <Box
                    component={Icon}
                    icon={StarFill}
                    sx={{
                      fontSize: 18,
                      color: 'primary.main',
                    }}
                  />
                ) : (
                  <Box
                    component={Icon}
                    icon={Star}
                    sx={{
                      fontSize: 18,
                      color: 'text.secondary',
                    }}
                  />
                )}
              </Button>
            </Tooltip>
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

          {file && target && (
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
    </>
  );
}

function AddSelectAgentPopperButton({
  projectId,
  gitRef,
  assistant,
  agentOptions,
  openApiOptions,
  onSelect,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  agentOptions: RouteOption[];
  openApiOptions: RouteOption[];
  onSelect?: (value: RouteOption) => void;
}) {
  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const createFile = useCreateFile();
  const {
    state: { project },
  } = useProjectState(projectId, gitRef);

  const exists =
    assistant.type === 'router' ? new Set(Object.values(assistant.routes ?? {}).map((i) => i.data.id)) : new Set();

  if (!project) {
    return null;
  }

  return (
    <PopperMenu
      BoxProps={{
        children: (
          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            width={1}
            sx={{ cursor: 'pointer', color: '#6D28D9' }}
            py={1}>
            <Box className="center">
              <Box component={Icon} icon={PlusIcon} sx={{ fontSize: 16 }} />
            </Box>
            <Box>{t('addRoute')}</Box>
          </Box>
        ),
      }}
      PopperProps={{ placement: 'bottom-start' }}>
      <Stack maxHeight={300} overflow="auto">
        <>
          <GroupView name={project.name || ''} description="Select Agent">
            <Avatar variant="rounded" src={getProjectIconUrl(project.id, { updatedAt: project.updatedAt })} />
          </GroupView>

          <List
            dense
            disablePadding
            sx={{
              pl: 7,
              '>hr': { my: '0 !important', borderColor: 'grey.100', ml: 1 },
              '>hr:last-of-type': { display: 'none' },
            }}>
            {agentOptions.map((x) => {
              return (
                <MenuItem selected={exists.has(x.id)} key={x.id} onClick={() => onSelect?.(x)} sx={{ my: 0.25 }}>
                  <Box flex={1}>{x.name || t('unnamed')}</Box>
                  <Box sx={{ width: 40, textAlign: 'right' }}>
                    {exists.has(x.id) && <Box component={Icon} icon={CheckIcon} />}
                  </Box>
                </MenuItem>
              );
            })}
          </List>
        </>

        <>
          <GroupView name="Blocklet API" description="Blocklet API">
            <Box component={DiDAvatar} src="" did={window.blocklet.appId} size={40} sx={{ borderRadius: 1 }} />
          </GroupView>

          <List
            dense
            disablePadding
            sx={{
              pl: 8,
              '>hr': { my: '0 !important', borderColor: 'grey.100', ml: 1 },
              '>hr:last-of-type': { display: 'none' },
            }}>
            {openApiOptions.map((x) => {
              return (
                <MenuItem selected={exists.has(x.id)} key={x.id} onClick={() => onSelect?.(x)} sx={{ my: 0.25 }}>
                  <Box flex={1}>{x.name || t('unnamed')}</Box>
                  <Box sx={{ width: 40, textAlign: 'right' }}>
                    {exists.has(x.id) && <Box component={Icon} icon={CheckIcon} />}
                  </Box>
                </MenuItem>
              );
            })}
          </List>
        </>

        {!(agentOptions.length + openApiOptions.length) && (
          <>
            <MenuItem>
              <Box color="#9CA3AF">{t('noAgent')}</Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                const options = {
                  parent: [],
                  rootFolder: PROMPTS_FOLDER_NAME,
                  meta: {
                    ...newDefaultPrompt(),
                    name: createFileName({ store, name: '', defaultName: `${t('alert.unnamed')} Agent` }),
                  },
                };
                const { file: template } = createFile({ ...options, store });
                onSelect?.(pick(template, 'id', 'name', 'type'));
              }}>
              <Box color="#3B82F6">{t('addAgent')}</Box>
            </MenuItem>
          </>
        )}
      </Stack>
    </PopperMenu>
  );
}

function GroupView({
  name,
  description,
  children,

  ...props
}: { name: string; description?: string; children?: any } & ListSubheaderProps) {
  const { t } = useLocaleContext();

  return (
    <ListSubheader component="div" {...props}>
      <Stack direction="row" alignItems="center" mt={2} gap={2}>
        {children}

        <Stack flex={1} width={1}>
          <Typography variant="subtitle2" noWrap mb={0}>
            {name || t('unnamed')}
          </Typography>
          {description && (
            <Typography variant="caption" noWrap>
              {description}
            </Typography>
          )}
        </Stack>
      </Stack>
    </ListSubheader>
  );
}
