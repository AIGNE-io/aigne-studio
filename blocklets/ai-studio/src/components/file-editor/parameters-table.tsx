import Dataset from '@api/store/models/dataset/dataset';
import { getDatasets } from '@app/libs/dataset';
import Close from '@app/pages/project/icons/close';
import DragVertical from '@app/pages/project/icons/drag-vertical';
import { PROMPTS_FOLDER_NAME, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ExecuteBlock, ParameterYjs, StringParameter, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import {
  Autocomplete,
  Box,
  Button,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Input,
  List,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  TextFieldProps,
  Typography,
  alpha,
  createFilterOptions,
  selectClasses,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import { get, sortBy } from 'lodash';
import { PopupState, bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useId, useMemo } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';
import PopperMenu from '../menu/PopperMenu';
import ParameterConfig from '../template-form/parameter-config';
import ParameterConfigType from '../template-form/parameter-config/type';
import { FROM_KNOWLEDGE } from './execute-block';
import History from './history';
import PromptEditorField from './prompt-editor-field';
import SelectVariable from './select-variable';
import useVariablesEditorOptions from './use-variables-editor-options';

export const FROM_PARAMETER = 'agentParameter';
export const FROM_KNOWLEDGE_PARAMETER = 'knowledgeParameter';

export default function ParametersTable({
  readOnly,
  value,
  projectId,
  gitRef,
  compareValue,
  isRemoteCompare,
}: {
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  compareValue?: AssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(value) as Map<any>)?.doc!;
  const { highlightedId, variables, addParameter, deleteParameter, removeParameter } = useVariablesEditorOptions(value);
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });
  const { getVariables } = useProjectStore(projectId, gitRef);

  const isValidVariableName = (name: string) => {
    if (!name) return true;

    const validNameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validNameRegex.test(name);
  };

  const parameters = sortBy(Object.values(value.parameters ?? {}), (i) => i.index);
  const { data: knowledge = [] } = useRequest(() => getDatasets(projectId));

  const FROM_MAP = useMemo(() => {
    return {
      custom: t('variableParameter.custom'),
      tool: t('variableParameter.tool'),
      datastore: t('variableParameter.datastore'),
      knowledge: t('variableParameter.knowledge'),
    };
  }, [t]);

  const TYPE_MAP: any = useMemo(() => {
    return {
      string: t('text'),
      number: t('number'),
      object: t('object'),
      array: t('array'),
    };
  }, [t]);

  const TYPE_ICON_MAP: any = useMemo(() => {
    return {
      string: <Icon icon="tabler:cursor-text" />,
      number: <Icon icon="tabler:square-number-1" />,
      object: <Icon icon="tabler:braces" />,
      array: <Icon icon="tabler:brackets-contain" />,
    };
  }, [t]);

  const columns = useMemo<GridColDef<(typeof parameters)[number]>[]>(() => {
    return [
      {
        field: 'key',
        width: '30%' as any,
        headerName: t('name'),
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.key === 'question' || parameter.key === 'datasetId') {
            const iconMap = {
              question: 'message',
              datasetId: 'database',
            };

            return (
              <Box height={33} display="flex" alignItems="center">
                <Box className="center" width={16} height={16} mr={0.5}>
                  <Box component={Icon} icon={`tabler:${iconMap[parameter.key]}`} />
                </Box>
                <Box>{parameter.key}</Box>
              </Box>
            );
          }

          return (
            <WithAwareness
              projectId={projectId}
              gitRef={gitRef}
              sx={{ top: 4, right: -8 }}
              path={[value.id, 'parameters', parameter?.id ?? '', 'key']}>
              <Input
                id={`${parameter.id}-key`}
                fullWidth
                readOnly={readOnly}
                placeholder={t('inputParameterKeyPlaceholder')}
                value={parameter.key || ''}
                onChange={(e) => {
                  const value = e.target.value.trim();

                  if (isValidVariableName(value)) {
                    parameter.key = value;
                  }
                }}
              />
            </WithAwareness>
          );
        },
      },
      {
        field: 'from',
        headerName: t('variableParameter.from'),
        flex: 1,
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.type === 'source' && parameter.source?.variableFrom === 'history') {
            return <Box>{t('history.title')}</Box>;
          }

          return (
            <SelectFromSource
              FROM_MAP={FROM_MAP}
              knowledge={knowledge}
              parameter={parameter}
              readOnly={readOnly}
              value={value}
              projectId={projectId}
              gitRef={gitRef}
            />
          );
        },
      },
      {
        field: 'type',
        headerName: t('type'),
        width: 100,
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.type === 'source' && parameter.source) {
            const { source } = parameter;
            if (source.variableFrom === 'tool') {
              return (
                <Stack direction="row" alignItems="center">
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <Icon icon="tabler:braces" />
                  </ListItemIcon>

                  {t('agentOutput')}
                </Stack>
              );
            }

            if (source.variableFrom === 'datastore') {
              const variables = getVariables();
              const variable = (variables?.variables || []).find(
                (x) => x.key === source.variable?.key && x.scope && source.variable.scope
              );
              return (
                <Stack direction="row" alignItems="center">
                  {variable?.type?.type ? (
                    <>
                      <ListItemIcon sx={{ minWidth: 20 }}>{TYPE_ICON_MAP[variable.type.type]}</ListItemIcon>
                      {TYPE_MAP[variable?.type?.type]}
                    </>
                  ) : (
                    ''
                  )}
                </Stack>
              );
            }

            if (parameter.source.variableFrom === 'knowledge') {
              return (
                <Stack direction="row" alignItems="center">
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <Icon icon="tabler:cursor-text" />
                  </ListItemIcon>

                  {TYPE_MAP.string}
                </Stack>
              );
            }

            if (parameter.source.variableFrom === 'history') {
              return <Box />;
            }
          }

          const multiline = (!parameter.type || parameter.type === 'string') && parameter?.multiline;
          return (
            <WithAwareness
              projectId={projectId}
              gitRef={gitRef}
              sx={{ top: 4, right: -8 }}
              path={[value.id, 'parameters', parameter?.id ?? '', 'type']}>
              <ParameterConfigType
                disabled={parameter.from === FROM_PARAMETER || parameter.from === FROM_KNOWLEDGE_PARAMETER}
                variant="standard"
                hiddenLabel
                SelectProps={{ autoWidth: true }}
                value={multiline ? 'multiline' : parameter?.type ?? 'string'}
                InputProps={{ readOnly }}
                onChange={(e) => {
                  const newValue = e.target.value;
                  doc.transact(() => {
                    if (newValue === 'multiline') {
                      parameter.type = 'string';
                      (parameter as StringParameter)!.multiline = true;
                    } else {
                      parameter.type = newValue as any;
                      if (typeof (parameter as StringParameter).multiline !== 'undefined') {
                        delete (parameter as StringParameter)!.multiline;
                      }
                    }
                  });
                }}
              />
            </WithAwareness>
          );
        },
      },
      {
        field: 'actions',
        headerName: t('actions'),
        width: 100,
        headerAlign: 'right',
        align: 'right',
      },
    ];
  }, [t, knowledge, readOnly, doc, deleteParameter]);

  const historyId = Object.values(value.parameters || {}).find((x) => {
    return x.data.type === 'source' && x.data.source?.variableFrom === 'history';
  })?.data?.id;

  return (
    <Box
      sx={{
        background: '#F9FAFB',
        py: 1.5,
        px: 2,
        borderRadius: 1,
      }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box component={Icon} icon="tabler:arrow-autofit-up" />
          <Typography variant="subtitle2" mb={0}>
            {t('inputParameters')}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5 }}>
        <Box
          sx={{
            borderBottom: () => (parameters?.length ? '1px solid rgba(224, 224, 224, 1)' : 0),
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            table: {
              th: { pt: 0 },
              td: { py: 0 },
              'tbody tr:last-of-type td': {
                border: 'none',
              },
            },
          }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.field}
                    align={column.headerAlign}
                    width={column.width}
                    sx={{ px: 0, py: 1, fontWeight: 500, fontSize: 13, lineHeight: '22px' }}>
                    {column.headerName}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <DragSortListYjs
              disabled={readOnly}
              list={value.parameters! ?? []}
              component={TableBody}
              renderItem={(parameter, _, params) => {
                return (
                  <TableRow
                    key={parameter.id}
                    ref={(ref) => {
                      params.drop(ref);
                      params.preview(ref);
                    }}
                    sx={{
                      backgroundColor:
                        parameter.id === highlightedId
                          ? (theme) => alpha(theme.palette.warning.light, theme.palette.action.focusOpacity)
                          : 'transparent',
                      transition: 'all 2s',
                      '.hover-visible': {
                        display: 'none',
                      },
                      ':hover': {
                        '.hover-visible': {
                          display: 'flex',
                        },
                      },
                    }}>
                    {columns.map((column, index) => {
                      return (
                        index !== columns.length - 1 && (
                          <TableCell
                            key={column.field}
                            align={column.align}
                            sx={{
                              position: 'relative',
                              px: 0,
                              ...getDiffBackground('parameters', parameter.id),
                            }}>
                            {index === 0 && (
                              <Stack
                                className="hover-visible center"
                                ref={params.drag}
                                sx={{ p: 0.5, cursor: 'move', position: 'absolute', left: -24, top: 0, bottom: 0 }}>
                                <DragVertical sx={{ color: '#9CA3AF', fontSize: 22 }} />
                              </Stack>
                            )}

                            {column.renderCell?.({ row: { data: parameter } } as any) || get(parameter, column.field)}
                          </TableCell>
                        )
                      );
                    })}

                    <TableCell sx={{ px: 0, ...getDiffBackground('parameters', parameter.id) }} align="right">
                      {!readOnly && (
                        <PopperButton
                          FROM_MAP={FROM_MAP}
                          knowledge={knowledge.map((x) => ({ ...x, from: FROM_KNOWLEDGE }))}
                          parameter={parameter}
                          readOnly={readOnly}
                          value={value}
                          projectId={projectId}
                          gitRef={gitRef}
                          onDelete={() => deleteParameter(parameter)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              }}
            />
          </Table>
        </Box>

        {!readOnly && (
          <Stack direction="row">
            <PopperMenu
              ButtonProps={{
                sx: { my: 1 },
                startIcon: <Box fontSize={16} component={Icon} icon="tabler:plus" />,
                children: <Box>{t('input')}</Box>,
              }}>
              <MenuItem
                selected={variables.includes('question')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (variables.includes('question')) {
                    removeParameter('question');
                  } else {
                    addParameter('question');
                  }
                }}>
                <ListItemIcon>
                  <Box component={Icon} icon="tabler:message" />
                </ListItemIcon>
                <Box flex={1}>{t('questionInputTitle')}</Box>
                <Box sx={{ width: 40, textAlign: 'right' }}>
                  {variables.includes('question') && <Box component={Icon} icon="tabler:check" />}
                </Box>
              </MenuItem>

              <MenuItem
                selected={Boolean(historyId)}
                onClick={(e) => {
                  e.stopPropagation();

                  if (historyId) {
                    const p = (value.parameters || {})[historyId];
                    if (p) {
                      deleteParameter(p.data);
                    }
                  } else {
                    addParameter('', {
                      type: 'source',
                      source: { variableFrom: 'history', memory: { limit: 50, keyword: '' } },
                    });
                  }
                }}>
                <ListItemIcon>
                  <Box component={Icon} icon="tabler:history" />
                </ListItemIcon>
                <Box flex={1}>{t('history.title')}</Box>
                <Box sx={{ width: 40, textAlign: 'right' }}>
                  {historyId && <Box component={Icon} icon="tabler:check" />}
                </Box>
              </MenuItem>

              {/* <MenuItem onClick={() => addParameter('datasetId')}>
                <ListItemIcon>
                  <Box component={Icon} icon="tabler:database" />
                </ListItemIcon>
                <ListItemText primary={t('datasetId')} />
              </MenuItem> */}

              <Divider sx={{ my: '4px !important', p: 0 }} />

              <MenuItem
                onClick={() => {
                  const id = addParameter('');
                  setTimeout(() => {
                    document.getElementById(`${id}-key`)?.focus();
                  });
                }}>
                <ListItemIcon>
                  <Box component={Icon} icon="tabler:plus" />
                </ListItemIcon>
                <ListItemText primary={t('customInputParameter')} />
              </MenuItem>
            </PopperMenu>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function PopperButton({
  FROM_MAP,
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
  knowledge,
  onDelete,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  FROM_MAP: { [key: string]: string };
  onDelete: () => void;
}) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog', popupId: useId() });
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });

  return (
    <>
      <Button sx={{ minWidth: 0, p: 0.5, ml: -0.5, cursor: 'pointer' }} {...bindTrigger(parameterSettingPopperState)}>
        <Box component={Icon} icon="tabler:dots" sx={{ color: '#3B82F6' }} />
      </Button>

      <Popper
        {...bindPopper(parameterSettingPopperState)}
        placement="bottom-end"
        sx={{ zIndex: (theme) => theme.zIndex.modal }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            parameterSettingPopperState.close();
          }}>
          <Paper sx={{ p: 0, minWidth: 140, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>
            <Stack gap={2}>
              <List>
                {!(parameter.from === FROM_PARAMETER || parameter.from === FROM_KNOWLEDGE_PARAMETER) && (
                  <MenuItem onClick={dialogState.open}>{t('setting')}</MenuItem>
                )}
                <MenuItem sx={{ color: '#E11D48', fontSize: 13 }} onClick={onDelete}>
                  {t('delete')}
                </MenuItem>
              </List>
            </Stack>
          </Paper>
        </ClickAwayListener>
      </Popper>

      <SelectFromSourceDialog
        dialogState={dialogState}
        FROM_MAP={FROM_MAP}
        knowledge={knowledge}
        parameter={parameter}
        readOnly={readOnly}
        value={value}
        projectId={projectId}
        gitRef={gitRef}
      />
    </>
  );
}

const filter = createFilterOptions<any>();

function AgentParameter({
  value,
  projectId,
  gitRef,
  parameter,
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  parameter: ParameterYjs;
}) {
  const { store, getFileById } = useProjectStore(projectId, gitRef);
  const { t } = useLocaleContext();
  const { deleteParameter } = useVariablesEditorOptions(value);

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'tool') {
    const toolId = parameter?.source?.tool?.id;

    const options = Object.entries(store.tree)
      .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
      .map(([id]) => store.files[id])
      .filter((i): i is AssistantYjs => !!i && isAssistant(i))
      .filter((i) => i.id !== value.id)
      .map((i) => ({ id: i.id, type: i.type, name: i.name, from: FROM_PARAMETER, parameters: i.parameters }));

    const v = options.find((x) => x.id === toolId);
    const file = getFileById((parameter.source as any).tool?.id);
    const parameters =
      file?.parameters &&
      sortBy(Object.values(file.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string } } => !!i.data.key
      );

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('agent')}</Typography>

          <SelectTool
            placeholder={t('selectAgentToCallPlaceholder')}
            options={options || []}
            value={v}
            onChange={(_value) => {
              if (_value) {
                // 删除历史自动添加的变量
                Object.values(value.parameters || {}).forEach((x) => {
                  if (x.data.from === FROM_PARAMETER) {
                    deleteParameter(x.data);
                  }
                });

                // 整理选择 agent 的参数
                const parameters: { [key: string]: string } = Object.values(_value.parameters || {}).reduce(
                  (tol: any, cur) => {
                    if (cur.data.key) tol[cur.data.key] = '';
                    return tol;
                  },
                  {}
                );

                parameter.source ??= {};
                (parameter.source as any).tool = {
                  id: _value.id,
                  from: 'assistant',
                  parameters,
                };
              }
            }}
          />
        </Box>

        {file && !!(parameters || []).length && (
          <Box>
            <Typography variant="subtitle2">{t('inputParameters')}</Typography>

            <Box>
              {(parameters || [])?.map(({ data }: any) => {
                if (!data?.key) return null;

                return (
                  <Stack key={data.id}>
                    <Typography variant="caption">{data.label || data.key}</Typography>

                    <PromptEditorField
                      placeholder={`{{ ${data.key} }}`}
                      value={(parameter.source as any)?.tool?.parameters?.[data.key] || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={value}
                      path={[]}
                      onChange={(value) => {
                        if ((parameter.source as any)?.tool?.parameters) {
                          (parameter.source as any).tool.parameters[data.key] = value;
                        }
                      }}
                    />
                  </Stack>
                );
              })}
            </Box>
          </Box>
        )}
      </Stack>
    );
  }

  return null;
}

function DatastoreParameter({
  projectId,
  gitRef,
  parameter,
}: {
  projectId: string;
  gitRef: string;
  parameter: ParameterYjs;
}) {
  const { t } = useLocaleContext();
  const { getVariables } = useProjectStore(projectId, gitRef);

  if (parameter.type === 'source' && parameter.source && parameter?.source?.variableFrom === 'datastore') {
    const { source } = parameter;
    const v = getVariables();

    const variables = v?.variables || [];
    const variable = variables.find(
      (x) => `${x.scope}_${x.key}` === `${source?.variable?.scope}_${source?.variable?.key}`
    );

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('memory.title')}</Typography>
          <Box>
            <SelectVariable
              placeholder={t('selectMemoryPlaceholder')}
              variables={variables}
              variable={variable}
              onChange={(_value) => {
                if (_value) source.variable = { key: _value.key, scope: _value.scope || '' };
              }}
            />
          </Box>
        </Box>
      </Stack>
    );
  }

  return null;
}

function KnowledgeParameter({
  projectId,
  gitRef,
  value,
  parameter,
  knowledge,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  parameter: ParameterYjs;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
}) {
  const { t } = useLocaleContext();
  const { deleteParameter } = useVariablesEditorOptions(value);

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'knowledge') {
    const toolId = parameter?.source?.tool?.id;

    const options = [
      ...knowledge.map((item) => ({
        id: item.id,
        name: item.name || t('unnamed'),
        from: item.from,
      })),
    ];

    const parameters = [{ name: 'message', description: 'Search Content' }];
    const v = options.find((x) => x.id === toolId);

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('knowledge.menu')}</Typography>

          <SelectTool
            options={options}
            value={v}
            placeholder={t('selectKnowledgePlaceholder')}
            onChange={(_value) => {
              if (_value) {
                // 删除历史自动添加的变量
                Object.values(value.parameters || {}).forEach((x) => {
                  if (x.data.from === FROM_KNOWLEDGE_PARAMETER) {
                    deleteParameter(x.data);
                  }
                });

                const parameters = {
                  message: '',
                };

                parameter.source ??= {};
                (parameter.source as any).tool = {
                  id: _value.id,
                  from: 'knowledge',
                  parameters,
                };
              }
            }}
          />
        </Box>

        {parameter?.source?.tool && (
          <Box>
            <Typography variant="subtitle2">{t('inputParameters')}</Typography>

            <Box>
              {(parameters || [])?.map((data: any) => {
                if (!data) return null;

                return (
                  <Stack key={data.name}>
                    <Typography variant="caption">{data.description || data.name}</Typography>

                    <PromptEditorField
                      placeholder={`{{ ${data.name} }}`}
                      value={(parameter.source as any)?.tool?.parameters?.[data.name] || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={value}
                      path={[]}
                      onChange={(value) => {
                        if ((parameter.source as any)?.tool?.parameters) {
                          (parameter.source as any).tool.parameters[data.name] = value;
                        }
                      }}
                    />
                  </Stack>
                );
              })}
            </Box>
          </Box>
        )}
      </Stack>
    );
  }

  return null;
}

function HistoryParameter({
  projectId,
  gitRef,
  value,
  parameter,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  parameter: ParameterYjs;
}) {
  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'history') {
    return (
      <Stack gap={2}>
        <History projectId={projectId} gitRef={gitRef} value={value} parameter={parameter} />
      </Stack>
    );
  }

  return null;
}

type Option = {
  id: string;
  name?: string;
  from?: string;
  parameters?: { [key: string]: any };
};

function SelectTool({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder?: string;
  options: Option[];
  value?: Option;
  onChange: (v: Option) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <Autocomplete
      size="medium"
      key={Boolean(value).toString()}
      disableClearable
      clearOnBlur
      selectOnFocus
      handleHomeEndKeys
      autoSelect
      autoHighlight
      sx={{ flex: 1 }}
      options={options}
      getOptionKey={(i) => i.id || `${i.name}`}
      value={value}
      isOptionEqualToValue={(i, j) => i.id === j.id}
      getOptionLabel={(i) => i.name || t('unnamed')}
      renderOption={(props, option) => {
        return (
          <MenuItem {...props} key={option.name}>
            {option.name || t('unnamed')}
          </MenuItem>
        );
      }}
      filterOptions={(_, params) => {
        return filter(options, params);
      }}
      renderInput={(params) => <TextField hiddenLabel {...params} placeholder={placeholder} size="medium" />}
      onChange={(_, _value) => onChange(_value)}
    />
  );
}

function SelectFromSourceDialog({
  FROM_MAP,
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
  knowledge,
  dialogState,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  FROM_MAP: { [key: string]: string };
  dialogState: PopupState;
}) {
  const { t } = useLocaleContext();
  const { addParameter } = useVariablesEditorOptions(value);

  const renderParameterSettings = (parameter: ParameterYjs) => {
    if (parameter.type === 'source' && parameter.source) {
      if (parameter.source.variableFrom === 'tool') {
        return <AgentParameter value={value} projectId={projectId} gitRef={gitRef} parameter={parameter} />;
      }

      if (parameter.source.variableFrom === 'datastore') {
        return <DatastoreParameter projectId={projectId} gitRef={gitRef} parameter={parameter} />;
      }

      if (parameter.source.variableFrom === 'knowledge') {
        return (
          <KnowledgeParameter
            projectId={projectId}
            gitRef={gitRef}
            value={value}
            parameter={parameter}
            knowledge={knowledge}
          />
        );
      }

      if (parameter.source.variableFrom === 'history') {
        return <HistoryParameter projectId={projectId} gitRef={gitRef} value={value} parameter={parameter} />;
      }
    }

    if (parameter) {
      return <ParameterConfig readOnly={readOnly} value={parameter} />;
    }

    return null;
  };

  return (
    <Dialog {...bindDialog(dialogState)} fullWidth maxWidth="sm" component="form" onSubmit={(e) => e.preventDefault()}>
      <DialogTitle className="between">
        <Box>{t('setting')}</Box>

        <IconButton size="small" onClick={dialogState.close}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack gap={1.5}>
          {(parameter as any)?.source?.variableFrom !== 'history' && (
            <Box>
              <Typography variant="subtitle2">{t('variableParameter.from')}</Typography>

              <SelectFromSourceComponent
                variant="filled"
                fullWidth
                FROM_MAP={FROM_MAP}
                knowledge={knowledge}
                parameter={parameter}
                readOnly={readOnly}
                value={value}
                projectId={projectId}
                gitRef={gitRef}
              />
            </Box>
          )}

          {renderParameterSettings(parameter)}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={dialogState.close} variant="outlined">
          {t('cancel')}
        </Button>

        <Button
          variant="contained"
          onClick={() => {
            // 新增选择 tool 和 knowledge 未定义的参数
            if (
              parameter.type === 'source' &&
              (parameter?.source?.variableFrom === 'tool' || parameter?.source?.variableFrom === 'knowledge') &&
              parameter?.source
            ) {
              const { source } = parameter;
              Object.entries(source?.tool?.parameters || {}).forEach(([key, value]: any) => {
                if (!value) {
                  if (source && source?.tool && source?.tool?.parameters) {
                    source.tool.parameters[key] = `{{${key}}}`;
                  }

                  const from = source.variableFrom === 'tool' ? FROM_PARAMETER : FROM_KNOWLEDGE_PARAMETER;
                  addParameter(key, { from });
                }
              });
            }

            dialogState.close();
          }}>
          {t('alert.ok')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SelectFromSource({
  FROM_MAP,
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
  knowledge,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  FROM_MAP: { [key: string]: string };
}) {
  const dialogState = usePopupState({ variant: 'dialog', popupId: useId() });

  return (
    <>
      <SelectFromSourceComponent
        FROM_MAP={FROM_MAP}
        knowledge={knowledge}
        parameter={parameter}
        readOnly={readOnly}
        value={value}
        projectId={projectId}
        gitRef={gitRef}
        onChange={dialogState.open}
      />

      <SelectFromSourceDialog
        dialogState={dialogState}
        FROM_MAP={FROM_MAP}
        knowledge={knowledge}
        parameter={parameter}
        readOnly={readOnly}
        value={value}
        projectId={projectId}
        gitRef={gitRef}
      />
    </>
  );
}

function SelectFromSourceComponent({
  FROM_MAP,
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
  knowledge,
  onChange,
  ...props
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  FROM_MAP: { [key: string]: string };
  onChange?: () => void;
} & TextFieldProps) {
  const { t } = useLocaleContext();
  const { getFileById } = useProjectStore(projectId, gitRef);

  return (
    <TextField
      variant="standard"
      select
      hiddenLabel
      value={parameter.type === 'source' ? parameter.source?.variableFrom : 'custom'}
      placeholder={t('variableParameter.from')}
      sx={{
        [`.${selectClasses.select}`]: {
          py: 0.5,
          '&:focus': {
            background: 'transparent',
          },
        },
      }}
      {...props}
      onChange={(e) => {
        if ((e.target.value || 'custom') !== ((parameter as any)?.source?.variableFrom || 'custom')) {
          if ((parameter as any).source) delete (parameter as any).source;
          parameter.type = 'string';

          if (e.target.value !== 'custom') {
            parameter.type = 'source';
            (parameter as any).source ??= {};
            (parameter as any).source.variableFrom = e.target.value as any;
          }

          if (onChange) {
            onChange();
          }
        }
      }}>
      {Object.entries(FROM_MAP).map(([key, _value]) => {
        return (
          <MenuItem value={key} key={key}>
            {key === 'tool' && (parameter as any)?.source?.tool?.id
              ? t('variableParameter.agent', { agent: getFileById((parameter as any)?.source?.tool?.id)?.name })
              : _value}
          </MenuItem>
        );
      })}
    </TextField>
  );
}
