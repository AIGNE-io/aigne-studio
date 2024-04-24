import Dataset from '@api/store/models/dataset/dataset';
import { getDatasets } from '@app/libs/dataset';
import DragVertical from '@app/pages/project/icons/drag-vertical';
import { PROMPTS_FOLDER_NAME, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ExecuteBlock,
  ParameterYjs,
  StringParameter,
  Variable,
  isAssistant,
} from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  Input,
  List,
  ListItem,
  ListSubheader,
  MenuItem,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  Select,
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
  selectClasses,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { useRequest } from 'ahooks';
import { cloneDeep, get, sortBy } from 'lodash';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useId, useMemo } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';
import ParameterConfig from '../template-form/parameter-config';
import ParameterConfigType from '../template-form/parameter-config/type';
import { FROM_KNOWLEDGE } from './execute-block';
import SelectVariable from './select-variable';
import useVariablesEditorOptions from './use-variables-editor-options';

function CustomNoRowsOverlay() {
  const { t } = useLocaleContext();

  return (
    <Stack width={1} textAlign="center">
      <Box lineHeight="28px">🔢</Box>

      <Typography variant="caption" color="#030712" fontSize={13} lineHeight="22px" fontWeight={500}>
        {t('emptyVariablesTitle')}
      </Typography>

      <Typography variant="caption" color="#9CA3AF" fontSize={12} lineHeight="20px" fontWeight={500}>
        {t('emptyVariablesSubtitle')}
      </Typography>
    </Stack>
  );
}

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
  const { highlightedId, addParameter, deleteParameter } = useVariablesEditorOptions(value);
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const isValidVariableName = (name: string) => {
    if (!name) return true;

    const validNameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validNameRegex.test(name);
  };

  const parameters = sortBy(Object.values(value.parameters ?? {}), (i) => i.index);
  const settingPopperState = usePopupState({ variant: 'popper', popupId: useId() });
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

  const columns = useMemo<GridColDef<(typeof parameters)[number]>[]>(() => {
    return [
      {
        field: 'key',
        width: '16%' as any,
        headerName: t('variable'),
        renderCell: ({ row: { data: parameter } }) => {
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
                placeholder={t('variable')}
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
          if (parameter.from === FROM_PARAMETER) {
            return <Box>{t('variableParameter.fromAgentParameter')}</Box>;
          }

          if (parameter.from === FROM_KNOWLEDGE_PARAMETER) {
            return <Box>{t('variableParameter.fromKnowledgeParameter')}</Box>;
          }

          return <Box>{FROM_MAP[parameter.source?.variableFrom || 'custom']}</Box>;
        },
      },
      {
        field: 'type',
        headerName: t('type'),
        width: 100,
        renderCell: ({ row: { data: parameter } }) => {
          if (parameter.source) {
            if (parameter.source.variableFrom === 'tool') {
              return <Box>{t('array')}</Box>;
            }

            if (parameter.source.variableFrom === 'datastore') {
              return <Box>{TYPE_MAP[parameter.source?.variable?.dataType]}</Box>;
            }

            if (parameter.source.variableFrom === 'knowledge') {
              return <Box>{TYPE_MAP('string')}</Box>;
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
        headerAlign: 'center',
        align: 'right',
      },
    ];
  }, [t, readOnly, doc, deleteParameter]);

  const removeParameter = (key: string) => {
    doc.transact(() => {
      if (!value.parameters) return;
      for (const id of Object.keys(value.parameters)) {
        if (value.parameters[id]?.data.key === key) delete value.parameters[id];
      }
    });
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle2">{t('inputParameters')}</Typography>

        {!readOnly && (
          <Stack direction="row">
            <Button sx={{ minWidth: 32, p: 0, minHeight: 32 }} {...bindTrigger(settingPopperState)}>
              <Box fontSize={16} component={Icon} icon="tabler:settings-2" />
            </Button>

            <Popper {...bindPopper(settingPopperState)} placement="bottom-end">
              <ClickAwayListener onClickAway={settingPopperState.close}>
                <Paper>
                  <List dense>
                    <ListSubheader>{t('mode')}</ListSubheader>
                    <ListItem>
                      <RadioGroup
                        value={parameters.some((i) => i.data.key === 'question') ? 'chat' : 'form'}
                        onChange={(_, v) => {
                          if (v === 'chat') {
                            addParameter('question');
                          } else {
                            removeParameter('question');
                          }
                        }}>
                        <FormControlLabel value="form" control={<Radio />} label={t('form')} />
                        <FormControlLabel value="chat" control={<Radio />} label={t('chat')} />
                      </RadioGroup>
                    </ListItem>
                    <ListSubheader>{t('dataset')}</ListSubheader>
                    <ListItem>
                      <FormControlLabel
                        control={<Checkbox />}
                        label={t('withCollectionManage')}
                        checked={parameters.some((i) => i.data.key === 'datasetId')}
                        onChange={(_, checked) => {
                          if (checked) {
                            addParameter('datasetId');
                          } else {
                            removeParameter('datasetId');
                          }
                        }}
                      />
                    </ListItem>
                  </List>
                </Paper>
              </ClickAwayListener>
            </Popper>

            <Button
              sx={{ minWidth: 32, p: 0, minHeight: 32 }}
              onClick={() => {
                const id = addParameter('');
                setTimeout(() => {
                  document.getElementById(`${id}-key`)?.focus();
                });
              }}>
              <Box fontSize={16} component={Icon} icon="tabler:plus" />
            </Button>
          </Stack>
        )}
      </Stack>

      {parameters.length ? (
        <Box
          sx={{
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            table: {
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
              list={value.parameters!}
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
                                className="hover-visible"
                                ref={params.drag}
                                alignItems="center"
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
                        <>
                          <PopperButton
                            FROM_MAP={FROM_MAP}
                            knowledge={knowledge.map((x) => ({ ...x, from: FROM_KNOWLEDGE }))}
                            parameter={parameter}
                            readOnly={readOnly}
                            value={value}
                            projectId={projectId}
                            gitRef={gitRef}
                          />

                          <Button
                            sx={{ minWidth: 0, p: 0.5, cursor: 'pointer' }}
                            onClick={() => deleteParameter(parameter)}>
                            <Box sx={{ color: '#E11D48', fontSize: 13 }}>{t('delete')}</Box>
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }}
            />
          </Table>
        </Box>
      ) : (
        <CustomNoRowsOverlay />
      )}
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
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  FROM_MAP: { [key: string]: any };
}) {
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });
  const { t } = useLocaleContext();

  const renderParameterSettings = (parameter: any) => {
    if (parameter.source) {
      if (parameter.source.variableFrom === 'tool') {
        return (
          <AgentParameter
            value={value}
            projectId={projectId}
            gitRef={gitRef}
            parameter={parameter}
            onChange={parameterSettingPopperState.close}
          />
        );
      }

      if (parameter.source.variableFrom === 'datastore') {
        return <DatastoreParameter projectId={projectId} gitRef={gitRef} parameter={parameter} />;
      }

      if (parameter.source.variableFrom === 'knowledge') {
        return (
          <KnowledgeParameter
            knowledge={knowledge}
            value={value}
            parameter={parameter}
            onChange={parameterSettingPopperState.close}
          />
        );
      }
    }

    if (parameter) {
      return <ParameterConfig readOnly={readOnly} value={parameter} />;
    }

    return null;
  };

  return (
    <>
      <Button
        sx={{ minWidth: 0, p: 0.5, ml: -0.5, cursor: 'pointer' }}
        {...bindTrigger(parameterSettingPopperState)}
        disabled={parameter.from === FROM_PARAMETER || parameter.from === FROM_KNOWLEDGE_PARAMETER}>
        <Box sx={{ color: '#3B82F6', fontSize: 13 }}>{t('variableParameter.setting')}</Box>
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
          <Paper sx={{ p: 3, width: 320, maxHeight: '80vh', overflow: 'auto' }}>
            <Stack gap={2}>
              <Select
                variant="outlined"
                value={parameter.source?.variableFrom ?? 'custom'}
                placeholder={t('variableParameter.from')}
                fullWidth
                sx={{
                  [`.${selectClasses.select}`]: {
                    py: 0.5,
                    '&:focus': {
                      background: 'transparent',
                    },
                  },
                }}
                onChange={(e) => {
                  if ((e.target.value || 'custom') !== (parameter.source?.variableFrom || 'custom')) {
                    parameter.source = undefined;

                    if (e.target.value !== 'custom') {
                      parameter.source ??= {};
                      parameter.source.variableFrom = e.target.value as any;
                    }
                  }
                }}>
                {Object.entries(FROM_MAP).map(([key, value]) => {
                  return (
                    <MenuItem value={key} key={key}>
                      {value}
                    </MenuItem>
                  );
                })}
              </Select>

              {renderParameterSettings(parameter)}
            </Stack>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

const filter = createFilterOptions<any>();

function AgentParameter({
  value,
  projectId,
  gitRef,
  parameter,
  onChange,
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  parameter: NonNullable<AssistantYjs['parameters']>[string]['data'];
  onChange: () => void;
}) {
  const { store } = useProjectStore(projectId, gitRef);
  const { t } = useLocaleContext();
  const { addParameter, deleteParameter } = useVariablesEditorOptions(value);

  if (parameter?.source?.variableFrom === 'tool') {
    const toolId = (parameter?.source as any)?.tool?.id;

    const options = Object.entries(store.tree)
      .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
      .map(([id]) => store.files[id])
      .filter((i): i is AssistantYjs => !!i && isAssistant(i))
      .filter((i) => i.id !== value.id)
      .map((i) => ({ id: i.id, type: i.type, name: i.name, from: FROM_PARAMETER, parameters: i.parameters }));

    const v = options.find((x) => x.id === toolId);

    return (
      <Box>
        <Typography variant="subtitle2" mb={0}>
          {t('tool')}
        </Typography>

        <SelectTool
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
                  if (cur.data.key) {
                    tol[cur.data.key] = `{{${cur.data.key}}}`;
                  }

                  return tol;
                },
                {}
              );

              // 新增选择的变量
              Object.keys(parameters).forEach((parameter) => {
                addParameter(parameter, { from: FROM_PARAMETER });
              });

              parameter.source ??= {};
              (parameter.source as any).tool = {
                id: _value.id,
                from: 'assistant',
                parameters,
              };

              onChange();
            }
          }}
        />
      </Box>
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
  parameter: NonNullable<AssistantYjs['parameters']>[string]['data'];
}) {
  const { t } = useLocaleContext();
  const { getVariables } = useProjectStore(projectId, gitRef);

  if (parameter.source && parameter?.source?.variableFrom === 'datastore') {
    const v = getVariables();

    const variables = v?.variables || [];
    const variable = variables.find((x) => {
      const j = (parameter.source?.variable ?? {}) as Variable;
      return `${x.dataType}_${x.scope}_${x.key}` === `${j.dataType}_${j.scope}_${j.key}`;
    });

    return (
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle2" mb={0}>
            {t('variableParameter.scope')}
          </Typography>

          <Box>
            <SelectVariable
              projectId={projectId}
              gitRef={gitRef}
              value={{
                name: parameter.key || '',
                defaultValue: (parameter as any).defaultValue || '',
                dataType: '',
              }}
              variables={variables}
              variable={variable}
              onChange={(_value) => {
                if (parameter.source) {
                  parameter.source.variable = cloneDeep(_value);
                }
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
  value,
  parameter,
  knowledge,
  onChange,
}: {
  value: AssistantYjs;
  parameter: NonNullable<AssistantYjs['parameters']>[string]['data'];
  onChange: () => void;
  knowledge: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
}) {
  const { t } = useLocaleContext();
  const { addParameter } = useVariablesEditorOptions(value);

  if (parameter?.source?.variableFrom === 'knowledge') {
    const toolId = (parameter?.source as any)?.tool?.id;

    const options = [
      ...knowledge.map((item) => ({
        id: item.id,
        name: item.name || t('unnamed'),
        from: item.from,
      })),
    ];

    const v = options.find((x) => x.id === toolId);

    return (
      <Box>
        <Typography variant="subtitle2" mb={0}>
          {t('knowledge.menu')}
        </Typography>

        <SelectTool
          options={options}
          value={v}
          onChange={(_value) => {
            if (_value) {
              // 整理选择 knowledge 的参数
              const parameters = {
                message: '{{message}}',
              };

              if (!Object.values(value.parameters || {}).find((x) => x.data.from === FROM_KNOWLEDGE_PARAMETER)) {
                Object.keys(parameters).forEach((parameter) => {
                  addParameter(parameter, { from: FROM_KNOWLEDGE_PARAMETER });
                });
              }

              parameter.source ??= {};
              (parameter.source as any).tool = {
                id: _value.id,
                from: 'knowledge',
                parameters,
              };

              onChange();
            }
          }}
        />
      </Box>
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
  options,
  value,
  onChange,
}: {
  options: Option[];
  value?: Option;
  onChange: (v: Option) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <Autocomplete
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
        return <MenuItem {...props}>{option.name || t('unnamed')}</MenuItem>;
      }}
      filterOptions={(_, params) => {
        return filter(options, params);
      }}
      renderInput={(params) => <TextField hiddenLabel {...params} />}
      onChange={(_, _value) => onChange(_value)}
    />
  );
}
