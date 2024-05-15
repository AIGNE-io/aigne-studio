import Dataset from '@api/store/models/dataset/dataset';
import WithAwareness from '@app/components/awareness/with-awareness';
import { DragSortListYjs } from '@app/components/drag-sort-list';
import PopperMenu, { PopperMenuImperative } from '@app/components/menu/PopperMenu';
import { getDatasets } from '@app/libs/dataset';
import Close from '@app/pages/project/icons/close';
import DragVertical from '@app/pages/project/icons/drag-vertical';
import { useAssistantCompare } from '@app/pages/project/state';
import { PROMPTS_FOLDER_NAME, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ExecuteBlock, ParameterYjs, StringParameter, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import BracesIcon from '@iconify-icons/tabler/braces';
import BracketsContainIcon from '@iconify-icons/tabler/brackets-contain';
import CheckIcon from '@iconify-icons/tabler/check';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import CursorTextIcon from '@iconify-icons/tabler/cursor-text';
import DatabaseIcon from '@iconify-icons/tabler/database';
import DotsIcon from '@iconify-icons/tabler/dots';
import HistoryIcon from '@iconify-icons/tabler/history';
import MessageIcon from '@iconify-icons/tabler/message';
import SquareNumberIcon from '@iconify-icons/tabler/square-number-1';
import {
  Autocomplete,
  Box,
  Button,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Input,
  List,
  ListItemIcon,
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
  Typography,
  alpha,
  createFilterOptions,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import { get, sortBy } from 'lodash';
import { PopupState, bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useId, useMemo, useRef } from 'react';

import Switch from '../../custom/switch';
import ParameterConfig from '../../template-form/parameter-config';
import ParameterConfigType from '../../template-form/parameter-config/type';
import { FROM_KNOWLEDGE } from '../execute-block';
import History from '../history';
import PromptEditorField from '../prompt-editor-field';
import SelectVariable from '../select-variable';
import useVariablesEditorOptions from '../use-variables-editor-options';
import AddInputButton from './AddInputButton';

export const FROM_PARAMETER = 'agentParameter';
export const FROM_KNOWLEDGE_PARAMETER = 'knowledgeParameter';
export default function InputTable({
  assistant,
  projectId,
  gitRef,
  readOnly,
  compareValue,
  isRemoteCompare,
}: {
  assistant: AssistantYjs;
  projectId: string;
  gitRef: string;
  readOnly?: boolean;
  compareValue?: AssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(assistant) as Map<any>)?.doc!;
  const { highlightedId, deleteParameter } = useVariablesEditorOptions(assistant);
  const { getDiffBackground } = useAssistantCompare({ value: assistant, compareValue, readOnly, isRemoteCompare });
  const { getVariables } = useProjectStore(projectId, gitRef);

  const isValidVariableName = (name: string) => {
    if (!name) return true;

    const validNameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validNameRegex.test(name);
  };

  const parameters = sortBy(Object.values(assistant.parameters ?? {}), (i) => i.index);
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
      string: <Icon icon={CursorTextIcon} />,
      number: <Icon icon={SquareNumberIcon} />,
      object: <Icon icon={BracesIcon} />,
      array: <Icon icon={BracketsContainIcon} />,
    };
  }, [t]);

  const columns = useMemo<GridColDef<(typeof parameters)[number]>[]>(() => {
    return [
      {
        field: 'key',
        width: '30%' as any,
        headerName: t('name'),
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.key === 'question' || parameter.key === 'chatHistory') {
            const iconMap = {
              question: MessageIcon,
              datasetId: DatabaseIcon,
              chatHistory: HistoryIcon,
            };

            return (
              <Box height={33} display="flex" alignItems="center">
                <Box className="center" width={16} height={16} mr={0.5}>
                  <Box component={Icon} icon={iconMap[parameter.key]} />
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
              path={[assistant.id, 'parameters', parameter?.id ?? '', 'key']}>
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
        headerName: t('from'),
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
              value={assistant}
              projectId={projectId}
              gitRef={gitRef}
            />
          );
        },
      },
      {
        field: 'type',
        headerName: t('format'),
        width: 100,
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.type === 'source' && parameter.source) {
            const { source } = parameter;
            if (source.variableFrom === 'tool') {
              return (
                <Stack direction="row" alignItems="center">
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <Icon icon={BracesIcon} />
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
                    <Icon icon={CursorTextIcon} />
                  </ListItemIcon>

                  {TYPE_MAP.string}
                </Stack>
              );
            }

            if (parameter.source.variableFrom === 'history') {
              return <Box />;
            }
          }

          return (
            <SelectInputType
              parameter={parameter}
              readOnly={readOnly}
              value={assistant}
              projectId={projectId}
              gitRef={gitRef}
            />
          );
        },
      },
      {
        field: 'actions',
        width: 100,
        headerAlign: 'right',
        align: 'right',
      },
    ];
  }, [t, knowledge, readOnly, doc, deleteParameter]);

  return (
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
            list={assistant.parameters! ?? []}
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
                        knowledge={knowledge.map((x) => ({ ...x, from: FROM_KNOWLEDGE }))}
                        parameter={parameter}
                        readOnly={readOnly}
                        value={assistant}
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

      <Stack direction="row" mt={1}>
        {!readOnly && <AddInputButton assistant={assistant} />}
      </Stack>
    </Box>
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
  const { t } = useLocaleContext();
  const { getFileById } = useProjectStore(projectId, gitRef);
  const ref = useRef<PopperMenuImperative>(null);

  const currentKey = parameter.type === 'source' ? parameter.source?.variableFrom : 'custom';
  const fromTitle =
    parameter.type === 'source' && parameter.source?.variableFrom === 'tool' && parameter?.source?.agent?.id
      ? t('variableParameter.agent', { agent: getFileById(parameter?.source?.agent?.id)?.name })
      : FROM_MAP[currentKey || 'custom'];

  return (
    <>
      <PopperMenu
        ref={ref}
        BoxProps={{
          sx: { my: 1, p: 0, cursor: 'pointer' },
          children: (
            <Box>
              <Box className="center" gap={1} justifyContent="flex-start">
                <Box>{fromTitle}</Box>
                <Box component={Icon} icon={ChevronDownIcon} width={15} />
              </Box>
            </Box>
          ),
        }}
        PopperProps={{ placement: 'bottom-start' }}>
        {Object.entries(FROM_MAP).map(([key, value]) => {
          return (
            <MenuItem
              key={key}
              selected={key === currentKey}
              onClick={(e) => {
                e.stopPropagation();

                if (key !== currentKey) {
                  parameter.type = 'string';

                  if (key !== 'custom') {
                    parameter.type = 'source';
                    if (parameter.type === 'source') {
                      parameter.source ??= {};
                      parameter.source.variableFrom = key as any;
                    }
                  }

                  ref.current?.close();
                  dialogState.open();
                }
              }}>
              {/* <ListItemIcon>{value}</ListItemIcon> */}
              <Box flex={1}>{value}</Box>
              <Box sx={{ width: 40, textAlign: 'right' }}>
                {key === currentKey && <Box component={Icon} icon={CheckIcon} />}
              </Box>
            </MenuItem>
          );
        })}
      </PopperMenu>

      <SelectFromSourceDialog
        dialogState={dialogState}
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

function SelectInputType({
  parameter,
  readOnly,
  value,
  projectId,
  gitRef,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
}) {
  const multiline = (!parameter.type || parameter.type === 'string') && parameter?.multiline;
  const doc = (getYjsValue(value) as Map<any>)?.doc!;
  const dialogState = usePopupState({ variant: 'dialog', popupId: useId() });

  return (
    <>
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

            if (newValue === 'select') {
              dialogState.open();
            }

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

      <SelectFromSourceDialog
        dialogState={dialogState}
        knowledge={[]}
        parameter={parameter}
        readOnly={readOnly}
        value={value}
        projectId={projectId}
        gitRef={gitRef}
      />
    </>
  );
}

function SelectFromSourceDialog({
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
        <Stack gap={1.5}>{renderParameterSettings(parameter)}</Stack>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          onClick={() => {
            // 新增选择 tool 和 knowledge 未定义的参数
            if (parameter.type === 'source' && parameter?.source?.variableFrom === 'tool' && parameter?.source) {
              const { source } = parameter;
              Object.entries(source?.agent?.parameters || {}).forEach(([key, value]: any) => {
                if (!value) {
                  if (source && source?.agent && source?.agent?.parameters) {
                    source.agent.parameters[key] = `{{${key}}}`;
                  }

                  addParameter(key, { from: FROM_PARAMETER });
                }
              });
            }

            if (parameter.type === 'source' && parameter?.source?.variableFrom === 'knowledge' && parameter?.source) {
              const { source } = parameter;
              Object.entries(source?.knowledge?.parameters || {}).forEach(([key, value]: any) => {
                if (!value) {
                  if (source && source?.knowledge && source?.knowledge?.parameters) {
                    source.knowledge.parameters[key] = `{{${key}}}`;
                  }

                  addParameter(key, { from: FROM_KNOWLEDGE_PARAMETER });
                }
              });
            }

            dialogState.close();
          }}>
          {t('ok')}
        </Button>
      </DialogActions>
    </Dialog>
  );
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

export function SelectTool({
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
    const toolId = parameter?.source?.knowledge?.id;
    const { source } = parameter;

    const options = [
      ...knowledge.map((item) => ({
        id: item.id,
        name: item.name || t('unnamed'),
        from: item.from,
      })),
    ];

    const parameters = [
      { name: 'all', description: t('allContent'), type: 'boolean' },
      { name: 'message', description: t('searchContent') },
    ];
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

                if (!source?.knowledge?.parameters?.all) {
                  const parameters = {
                    message: '',
                  };

                  source.knowledge = {
                    id: _value.id,
                    from: 'knowledge',
                    parameters,
                  };
                }
              }
            }}
          />
        </Box>

        {source?.knowledge && (
          <Box>
            <Typography variant="subtitle2">{t('inputs')}</Typography>

            <Stack gap={1}>
              {(parameters || [])?.map((data) => {
                if (!data) return null;

                if (data.type === 'boolean') {
                  return (
                    <Stack key={data.name}>
                      <Typography variant="caption">{data.description || data.name}</Typography>

                      <Switch
                        defaultChecked={Boolean(source?.knowledge?.parameters?.[data.name] ?? false)}
                        onChange={(_, checked) => {
                          if (source?.knowledge?.parameters) {
                            // @ts-ignore
                            source.knowledge.parameters[data.name] = checked;
                          }
                        }}
                      />
                    </Stack>
                  );
                }

                if (source?.knowledge?.parameters?.all) {
                  return null;
                }

                return (
                  <Stack key={data.name}>
                    <Typography variant="caption">{data.description || data.name}</Typography>

                    <PromptEditorField
                      placeholder={`{{ ${data.name} }}`}
                      value={source?.knowledge?.parameters?.[data.name] || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={value}
                      path={[]}
                      onChange={(value) => {
                        if (source?.knowledge?.parameters) {
                          source.knowledge.parameters[data.name] = value;
                        }
                      }}
                    />
                  </Stack>
                );
              })}
            </Stack>
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

  if (parameter.type === 'source' && parameter?.source?.variableFrom === 'datastore') {
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

const filter = createFilterOptions<any>();

function checkKeyParameterIsUsed({ value, key }: { value: AssistantYjs; key: string }) {
  if (!key) {
    return false;
  }

  const parameters = Object.values(value?.parameters || {}).flatMap((x) => {
    if (x.data.type === 'source') {
      if (x.data.source?.variableFrom === 'tool') {
        return [Object.values(x.data.source?.agent?.parameters || {})];
      }

      if (x.data.source?.variableFrom === 'knowledge') {
        return [Object.values(x.data.source?.knowledge?.parameters || {})];
      }
    }

    return [];
  });

  return !!parameters.find((x) => {
    return (x || []).find((str) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`);
      return pattern.test(str);
    });
  });
}

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
    const toolId = parameter?.source?.agent?.id;
    const { source } = parameter;

    const options = Object.entries(store.tree)
      .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
      .map(([id]) => store.files[id])
      .filter((i): i is AssistantYjs => !!i && isAssistant(i))
      .filter((i) => i.id !== value.id)
      .map((i) => ({ id: i.id, type: i.type, name: i.name, from: FROM_PARAMETER, parameters: i.parameters }));

    const v = options.find((x) => x.id === toolId);
    const file = getFileById(toolId || '');
    const parameters =
      file?.parameters &&
      sortBy(Object.values(file.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string } } => !!i.data.key
      );

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2">{t('chooseObject', { object: t('agent') })}</Typography>

          <SelectTool
            placeholder={t('selectAgentToCallPlaceholder')}
            options={options || []}
            value={v}
            onChange={(_value) => {
              if (_value) {
                // 删除历史自动添加的变量
                Object.values(value.parameters || {}).forEach((x) => {
                  if (x.data.from === FROM_PARAMETER && !checkKeyParameterIsUsed({ value, key: x.data.key || '' })) {
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

                source.agent = {
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
            <Typography variant="subtitle2">{t('inputs')}</Typography>

            <Box>
              {(parameters || [])?.map(({ data }: any) => {
                if (!data?.key) return null;

                return (
                  <Stack key={data.id}>
                    <Typography variant="caption">{data.label || data.key}</Typography>

                    <PromptEditorField
                      placeholder={`{{ ${data.key} }}`}
                      value={source?.agent?.parameters?.[data.key] || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={value}
                      path={[]}
                      onChange={(value) => {
                        if (source?.agent?.parameters) {
                          source.agent.parameters[data.key] = value;
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

function PopperButton({
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
  onDelete: () => void;
}) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog', popupId: useId() });
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });

  return (
    <>
      <Button sx={{ minWidth: 0, p: 0.5, ml: -0.5, cursor: 'pointer' }} {...bindTrigger(parameterSettingPopperState)}>
        <Box component={Icon} icon={DotsIcon} sx={{ color: '#3B82F6' }} />
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
