import 'react-querybuilder/dist/query-builder.scss';

import Switch from '@app/components/custom/switch';
import PopperMenu from '@app/components/menu/PopperMenu';
import { useReadOnly } from '@app/contexts/session';
import { getProjectIconUrl } from '@app/libs/project';
import { isValidInput } from '@app/libs/util';
import { useAssistantCompare, useProjectState } from '@app/pages/project/state';
import { newDefaultPrompt } from '@app/pages/project/template';
import { PROMPTS_FOLDER_NAME, createFileName, useCreateFile, useProjectStore } from '@app/pages/project/yjs-state';
import DiDAvatar from '@arcblock/ux/lib/Avatar';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { AssistantYjs, ParameterYjs, RouterAssistantYjs, Tool } from '@blocklet/ai-runtime/types';
import { isAssistant } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import type { DatasetObject } from '@blocklet/dataset-sdk/types';
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
import { Close, InfoOutlined } from '@mui/icons-material';
import type { ListSubheaderProps, StackProps } from '@mui/material';
import {
  Avatar,
  Box,
  Button,
  List,
  ListSubheader,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { MaterialValueEditor, QueryBuilderMaterial } from '@react-querybuilder/material';
import { cloneDeep, pick, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import React, { useCallback, useMemo, useRef } from 'react';
import type { RuleGroupType, ValueEditorProps } from 'react-querybuilder';
import QueryBuilder from 'react-querybuilder';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useAllSelectDecisionAgentOutputs, useRoutesAssistantOutputs } from '../output/OutputSettings';
import PromptEditorField from '../prompt-editor-field';
import useVariablesEditorOptions from '../use-variables-editor-options';
import type { RouteOption } from './dialog';
import ToolDialog, { FROM_API, useFormatOpenApiToYjs } from './dialog';

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
  const { getAllSelectCustomOutputs } = useAllSelectDecisionAgentOutputs({ value, projectId, gitRef });
  const checkOutputVariables = useRoutesAssistantOutputs({ value, projectId, gitRef, openApis: openAPI });

  const routes = value.routes && sortBy(Object.values(value.routes), (i) => i.index);
  const outputVariables = value.outputVariables && sortBy(Object.values(value.outputVariables), 'index');

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
    const doc = (getYjsValue(value) as Map<any>).doc!;
    doc.transact(() => {
      value.outputVariables ??= {};
      update(value.outputVariables);
      sortBy(Object.values(value.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
  };

  const conditionalBranch = value.decisionType === 'json-logic';
  return (
    <Stack gap={1.5}>
      <Stack gap={1} width={1} ref={ref}>
        {conditionalBranch ? (
          <Stack
            sx={{
              display: 'flex',
              flexDirection: 'column',
              border: 1,
              borderColor: '#1976d2',
              borderRadius: 1,
              background: '#fff',
              overflow: 'hidden',
              p: 2,
              color: 'text.secondary',
            }}>
            {t('decision.branchTip')}
          </Stack>
        ) : (
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
        )}

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
                    openApis={openAPI}
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
              <AddSelectAgentPopperButton
                projectId={projectId}
                gitRef={gitRef}
                assistant={value}
                openApis={openAPI}
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
                      cloneDeep(getAllSelectCustomOutputs(openAPI)).forEach((data) => {
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
        openApis={openAPI}
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
                  condition: old?.data?.condition ? cloneDeep(old.data.condition) : initialQuery,
                  ...tool,
                },
              };

              if (selectedTool.current.selected !== tool.id) {
                delete value.routes[selectedTool.current.selected];
              }
            } else {
              value.routes[tool.id] = {
                index: Math.max(-1, ...Object.values(value.routes).map((i) => i.index)) + 1,
                data: { condition: initialQuery, ...tool },
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
  openApis = [],
  ...props
}: {
  assistant: RouterAssistantYjs;
  getDiffBackground: (path: any, id?: string | undefined, defaultValue?: string | undefined) => { [x: string]: string };
  projectId: string;
  projectRef: string;
  agent: Tool;
  readOnly?: boolean;
  onEdit: () => void;
  openApis: DatasetObject[];
} & StackProps) {
  const navigate = useNavigate();

  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, projectRef);

  const f = store.files[agent.id];
  const formattedOpenApis = useFormatOpenApiToYjs(openApis || []);
  const file = f && isAssistant(f) ? f : undefined;
  const target = file ?? formattedOpenApis.find((x) => x.id === agent.id);

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
        {assistant.decisionType === 'json-logic' && (
          <BranchConditionSelect assistant={assistant} tool={agent} sx={{ mb: 0 }} />
        )}

        <Stack width={1} gap={1.5} sx={{ position: 'relative' }}>
          <Stack>
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
                  fontSize: '18px',
                  color: '#1976d2',
                },
              }}
            />

            {assistant.decisionType === 'json-logic' ? (
              target?.description ? (
                <TextField
                  onClick={(e) => e.stopPropagation()}
                  hiddenLabel
                  placeholder={target?.description || t('description')}
                  size="small"
                  variant="standard"
                  value={target?.description}
                  sx={{
                    lineHeight: '10px',
                    input: { fontSize: '10px', color: 'text.disabled' },
                  }}
                  inputProps={{ readOnly: true }}
                />
              ) : null
            ) : (
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
            )}
          </Stack>

          <AgentItemViewParameters
            assistant={assistant}
            projectId={projectId}
            gitRef={projectRef}
            tool={agent}
            openApis={openApis}
          />

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

function AddSelectAgentPopperButton({
  projectId,
  gitRef,
  assistant,
  onSelect,
  openApis,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  onSelect?: (value: RouteOption) => void;
  openApis: DatasetObject[];
}) {
  const { t, locale } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const createFile = useCreateFile();
  const {
    state: { project },
  } = useProjectState(projectId, gitRef);

  const agentOptions: RouteOption[] = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i))
    .filter((i) => i.id !== assistant.id)
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

  const exists =
    assistant.type === 'router' ? new Set(Object.values(assistant.routes ?? {}).map((i) => i.data.id)) : new Set();

  if (!project) return null;

  return (
    <PopperMenu
      BoxProps={{
        children: (
          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            width={1}
            sx={{ cursor: 'pointer', color: '#3B82F6' }}
            py={1}>
            <Box className="center">
              <Box component={Icon} icon={PlusIcon} sx={{ fontSize: 16, mt: -0.25 }} />
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

function AgentItemViewParameters({
  projectId,
  gitRef,
  tool,
  assistant,
  openApis,
}: {
  assistant: RouterAssistantYjs;
  projectId: string;
  gitRef: string;
  tool: Tool;
  openApis?: DatasetObject[];
} & StackProps) {
  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const { addParameter } = useVariablesEditorOptions(assistant);
  const formattedOpenApis = useFormatOpenApiToYjs(openApis || []);

  const f = store.files[tool.id];
  const file = f && isAssistant(f) ? f : undefined;
  const target = file ?? formattedOpenApis.find((x) => x.id === tool.id);

  const parameters = useMemo(() => {
    return (target?.parameters &&
      sortBy(Object.values(target.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string; hidden?: boolean } } => !!i.data.key && !i.data.hidden
      )) as {
      index: number;
      data: ParameterYjs;
    }[];
  }, [target]);

  const checkParametersInParameter = (key: string) => {
    const parameters =
      (assistant?.parameters &&
        sortBy(Object.values(assistant.parameters), (i) => i.index).filter((i) => !i.data.hidden)) ||
      [];
    return Boolean(parameters.find((i) => i.data.key === key));
  };

  const filteredParameters = (parameters || [])
    ?.map(({ data: parameter }) => {
      if (!parameter?.key) return null;
      if (!file && !isValidInput(parameter)) return null;

      return parameter;
    })
    .filter(isNonNullable);

  if (!target) return <Box />;
  if (!filteredParameters?.length) return <Box />;

  return (
    <Box>
      <Tooltip title={t('parametersTip', { variable: '{variable}' })} placement="top-start" disableInteractive>
        <Stack justifyContent="space-between" direction="row" alignItems="center">
          <Typography variant="subtitle5" color="text.secondary" mb={0}>
            {t('parameters')}
          </Typography>

          <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
        </Stack>
      </Tooltip>

      <Stack gap={1}>
        {filteredParameters?.map((parameter) => {
          if (!parameter?.key) return null;

          const className = `hover-visible-${parameter.key}`;
          return (
            <Stack
              key={parameter.id}
              sx={{
                ':hover': { [`.${className}`]: { display: 'flex' } },
              }}>
              <Stack flexDirection="row" alignItems="center" mb={0.5}>
                <Typography variant="caption" mx={1}>
                  {parameter.label || parameter.key}
                </Typography>

                {tool.parameters?.[parameter.key] || checkParametersInParameter(parameter.key) ? null : (
                  <Tooltip title={!tool.parameters?.[parameter.key] ? t('addParameter') : undefined}>
                    <Box
                      className={className}
                      component={Icon}
                      icon={PlusIcon}
                      sx={{ fontSize: 12, cursor: 'pointer', color: 'primary.main', display: 'none' }}
                      onClick={() => {
                        tool.parameters ??= {};
                        tool.parameters[parameter.key!] = `{{${parameter.key}}}`;
                        addParameter(parameter.key!);
                      }}
                    />
                  </Tooltip>
                )}
              </Stack>

              <PromptEditorField
                placeholder={`{{${parameter.key}}}`}
                value={tool.parameters?.[parameter.key] || ''}
                projectId={projectId}
                gitRef={gitRef}
                assistant={assistant}
                path={[]}
                onChange={(value) => {
                  tool.parameters ??= {};
                  if (parameter.key) tool.parameters[parameter.key] = value;
                }}
              />
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };

const getInputType = (type?: string) => {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'checkbox';

  return 'text';
};

const getDefaultValueForType = (inputType?: string) => {
  switch (inputType) {
    case 'checkbox':
      return false;
    case 'number':
      return 0;
    default:
      return '';
  }
};

function BranchConditionSelect({
  assistant,
  tool,
  ...props
}: {
  assistant: RouterAssistantYjs;
  tool: NonNullable<RouterAssistantYjs['routes']>[number]['data'];
} & StackProps) {
  const { t } = useLocaleContext();

  const defaultOperators = useMemo(() => {
    return [
      { name: '=', value: '=', label: t('operators.equals') },
      { name: '!=', value: '!=', label: t('operators.doesNotEqual') },
      { name: '<', value: '<', label: t('operators.lessThan') },
      { name: '>', value: '>', label: t('operators.greaterThan') },
      { name: '<=', value: '<=', label: t('operators.lessThanOrEqual') },
      { name: '>=', value: '>=', label: t('operators.greaterThanOrEqual') },
      { name: 'contains', value: 'contains', label: t('operators.contains') },
      { name: 'doesNotContain', value: 'doesNotContain', label: t('operators.doesNotContain') },
      { name: 'null', value: 'null', label: t('operators.isNull') },
      { name: 'notNull', value: 'notNull', label: t('operators.isNotNull') },
    ];
  }, [t]);

  const defaultCombinators = useMemo(() => {
    return [
      { name: 'and', value: 'and', label: t('operators.and') },
      { name: 'or', value: 'or', label: t('operators.or') },
    ];
  }, [t]);

  const condition = useMemo(() => (tool?.condition ? cloneDeep(tool.condition) : initialQuery), [tool?.condition]);

  const fields = useMemo(() => {
    const parameters = Object.values(assistant.parameters || {})
      .map((i) => i.data)
      .filter((x) => x.key);

    return parameters.map((i) => ({
      name: i.key!,
      label: i.label || i.key!,
      inputType: getInputType(i.type),
      valueSources: ['field', 'value'],
    }));
  }, [JSON.stringify(assistant.parameters)]);

  const AddRuleButton = ({ handleOnClick }: { handleOnClick: (_e: React.MouseEvent) => void }) => (
    <Button
      onClick={handleOnClick}
      variant="outlined"
      sx={{ minHeight: 32, background: '#030712', color: '#fff', '&:hover': { background: '#030712' } }}>
      {t('decision.addRule')}
    </Button>
  );

  const RemoveRuleButton = ({ handleOnClick }: { handleOnClick: (_e: React.MouseEvent) => void }) => (
    <Button
      onClick={handleOnClick}
      variant="text"
      sx={{
        minWidth: 32,
        minHeight: 32,
        p: 0,
        color: 'action.disabled',
      }}>
      <Close fontSize="small" />
    </Button>
  );

  const handleQueryChange = useCallback(
    (newQuery: any) => {
      if (tool) {
        tool.condition = cloneDeep(newQuery);
      }
    },
    [tool]
  );

  const ValueEditor = useCallback(
    (props: ValueEditorProps) => {
      const { fieldData, operator, ...rest } = props;

      if (operator === 'null' || operator === 'notNull') return null;

      if (rest.valueSource === 'field') {
        return <MaterialValueEditor {...props} />;
      }

      if (fieldData.inputType === 'text' || fieldData.inputType === 'number') {
        return (
          <ValueEditorContainer>
            <TextField
              size="small"
              type={fieldData.inputType === 'number' ? 'number' : undefined}
              variant="outlined"
              className={rest.className}
              value={rest.value}
              onChange={(e) => {
                const value = fieldData.inputType === 'number' ? Number(e.target.value) : e.target.value;
                props.handleOnChange(value);
              }}
            />
          </ValueEditorContainer>
        );
      }

      if (fieldData.inputType === 'checkbox') {
        return (
          <ValueEditorContainer>
            <Switch checked={Boolean(rest.value)} onChange={(e) => props.handleOnChange(e.target.checked)} />
          </ValueEditorContainer>
        );
      }

      return <MaterialValueEditor {...props} />;
    },
    [fields]
  );

  if (!tool) return null;

  return (
    <QueryBuilderContainer {...props}>
      <QueryBuilder
        controlClassnames={{ queryBuilder: 'queryBuilder-branches' }}
        key={tool.condition?.id}
        fields={fields as any}
        operators={defaultOperators}
        combinators={defaultCombinators}
        query={condition}
        onQueryChange={handleQueryChange}
        getDefaultField={() => fields[0]?.name || ''}
        getDefaultValue={({ field }) => {
          const fieldData = fields.find((f) => f.name === field);
          return getDefaultValueForType(fieldData?.inputType);
        }}
        controlElements={{
          addRuleAction: AddRuleButton,
          removeRuleAction: RemoveRuleButton,
          addGroupAction: () => null,
          removeGroupAction: () => null,
          cloneGroupAction: () => null,
          valueEditor: ValueEditor,
        }}
      />
    </QueryBuilderContainer>
  );
}

const QueryBuilderContainer = styled(Box)`
  width: 100%;

  .queryBuilder {
    min-width: 420px;
    width: 100%;
  }

  .MuiInputBase-input {
    margin-bottom: 0;
    padding: 0 10px;
    background-color: #fff;
  }

  .MuiInput-root {
    margin-top: 0 !important;
  }

  .ruleGroup {
    border: 0;
    background: #eff6ff;
  }
`;

const ValueEditorContainer = styled(Box)`
  div.MuiOutlinedInput-root,
  div.MuiInputBase-root {
    height: 32px;
    background: #fff;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1;

    fieldset {
      border: 0 !important;
    }
  }

  input.MuiInputBase-input {
    padding: 0 8px !important;
  }
`;
