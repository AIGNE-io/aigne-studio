import PopperMenu from '@app/components/menu/PopperMenu';
import { useReadOnly } from '@app/contexts/session';
import { getProjectIconUrl } from '@app/libs/project';
import { isValidInput } from '@app/libs/util';
import { useAssistantCompare, useProjectState } from '@app/pages/project/state';
import { newDefaultPrompt } from '@app/pages/project/template';
import { PROMPTS_FOLDER_NAME, createFileName, useCreateFile, useProjectStore } from '@app/pages/project/yjs-state';
import DiDAvatar from '@arcblock/ux/lib/Avatar';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs, RouterAssistantYjs, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
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
import { InfoOutlined } from '@mui/icons-material';
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
import { QueryBuilderMaterial } from '@react-querybuilder/material';
import { cloneDeep, pick, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useAllSelectDecisionAgentOutputs, useRoutesAssistantOutputs } from '../output/OutputSettings';
import PromptEditorField from '../prompt-editor-field';
import useVariablesEditorOptions from '../use-variables-editor-options';
import ToolDialog, { FROM_API, RouteOption, useFormatOpenApiToYjs } from './dialog';

export default function RouterAssistantEditor({
  projectId,
  gitRef,
  value,
  compareValue = undefined,
  disabled = undefined,
  isRemoteCompare = undefined,
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

  return (
    <Stack
      sx={{
        gap: 1.5,
      }}>
      <Stack
        ref={ref}
        sx={{
          gap: 1,
          width: 1,
        }}>
        <Tooltip title={value.prompt ? undefined : t('promptRequired')}>
          <Box sx={{ borderRadius: 1, flex: 1 }}>
            <Box
              sx={{
                height: 1,
                display: 'flex',
                flexDirection: 'column',
                border: 1,
                borderColor: '#1976d2',
                borderRadius: 1,
                background: '#fff',
                overflow: 'hidden',
              }}>
              <Stack
                direction="row"
                sx={{
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  px: 1.5,
                  borderBottom: '1px solid #BFDBFE',
                }}>
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

        <Stack
          sx={{
            gap: 1,
          }}>
          <QueryBuilderMaterial>
            <Stack
              sx={{
                gap: 1,
              }}>
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
            <Typography
              variant="subtitle5"
              sx={{
                color: 'warning.main',
                ml: 1,
              }}>
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
  readOnly = undefined,
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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        width: 1,
      }}>
      <Box
        className="center"
        sx={{
          width: 16,
          height: 16,
        }}>
        <Box component={Icon} icon={ArrowFork} sx={{ fontSize: 16, color: !target ? red : '#1976d2' }} />
      </Box>
      <Stack
        key={`${projectId}-${projectRef}-${assistant.id}-${agent.id}`}
        {...props}
        sx={[
          {
            width: 1,
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
          },
          ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
        ]}>
        <Stack
          sx={{
            width: 1,
            gap: 1.5,
            position: 'relative',
          }}>
          <Stack>
            <TextField
              disabled={!target}
              onClick={(e) => e.stopPropagation()}
              hiddenLabel
              placeholder={target ? target?.name || t('unnamed') : t('agentNotFound')}
              size="small"
              variant="standard"
              value={target ? target?.name || t('unnamed') : t('agentNotFound')}
              sx={{
                mb: 0,
                lineHeight: '22px',
                fontWeight: 500,
                input: {
                  fontSize: '18px',
                  color: '#1976d2',
                },
              }}
              slotProps={{
                input: { readOnly: true },
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

          <AgentItemViewParameters
            assistant={assistant}
            projectId={projectId}
            gitRef={projectRef}
            tool={agent}
            openApis={openApis}
          />

          <Stack
            className="hover-visible"
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              display: 'none',
              position: 'absolute',
              right: 0,
              top: 0,
            }}>
            <Stack
              direction="row"
              sx={{
                gap: 0.5,
              }}>
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
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              width: 1,
              py: 1,
              cursor: 'pointer',
              color: '#3B82F6',
            }}>
            <Box className="center">
              <Box component={Icon} icon={PlusIcon} sx={{ fontSize: 16, mt: -0.25 }} />
            </Box>
            <Box>{t('addRoute')}</Box>
          </Box>
        ),
      }}
      PopperProps={{ placement: 'bottom-start' }}>
      <Stack
        sx={{
          maxHeight: 300,
          overflow: 'auto',
        }}>
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
                  <Box
                    sx={{
                      flex: 1,
                    }}>
                    {x.name || t('unnamed')}
                  </Box>
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
                  <Box
                    sx={{
                      flex: 1,
                    }}>
                    {x.name || t('unnamed')}
                  </Box>
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
              <Box
                sx={{
                  color: '#9CA3AF',
                }}>
                {t('noAgent')}
              </Box>
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
              <Box
                sx={{
                  color: '#3B82F6',
                }}>
                {t('addAgent')}
              </Box>
            </MenuItem>
          </>
        )}
      </Stack>
    </PopperMenu>
  );
}

function GroupView({
  name,
  description = undefined,
  children = undefined,

  ...props
}: { name: string; description?: string; children?: any } & ListSubheaderProps) {
  const { t } = useLocaleContext();

  return (
    <ListSubheader component="div" {...props}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          mt: 2,
          gap: 2,
        }}>
        {children}

        <Stack
          sx={{
            flex: 1,
            width: 1,
          }}>
          <Typography
            variant="subtitle2"
            noWrap
            sx={{
              mb: 0,
            }}>
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
  openApis = undefined,
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
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Typography
            variant="subtitle5"
            sx={{
              color: 'text.secondary',
              mb: 0,
            }}>
            {t('parameters')}
          </Typography>

          <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
        </Stack>
      </Tooltip>
      <Stack
        sx={{
          gap: 1,
        }}>
        {filteredParameters?.map((parameter) => {
          if (!parameter?.key) return null;

          const className = `hover-visible-${parameter.key}`;
          return (
            <Stack
              key={parameter.id}
              sx={{
                ':hover': { [`.${className}`]: { display: 'flex' } },
              }}>
              <Stack
                sx={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  mb: 0.5,
                }}>
                <Typography
                  variant="caption"
                  sx={{
                    mx: 1,
                  }}>
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
