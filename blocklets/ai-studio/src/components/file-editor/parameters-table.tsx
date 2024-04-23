import DragVertical from '@app/pages/project/icons/drag-vertical';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs, StringParameter } from '@blocklet/ai-runtime/types';
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
  selectClasses,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { cloneDeep, get, sortBy } from 'lodash';
import { bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useId, useMemo, useRef } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';
import ParameterConfig from '../template-form/parameter-config';
import ParameterConfigType from '../template-form/parameter-config/type';
import { ToolDialog, ToolDialogImperative } from './execute-block';
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
  const toolForm = useRef<ToolDialogImperative>(null);
  const id = useRef<string>();
  const { getFileById } = useProjectStore(projectId, gitRef);

  const isValidVariableName = (name: string) => {
    if (!name) return true;

    const validNameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validNameRegex.test(name);
  };

  const parameters = sortBy(Object.values(value.parameters ?? {}), (i) => i.index);
  const dialogState = usePopupState({ variant: 'dialog' });
  const settingPopperState = usePopupState({ variant: 'popper', popupId: useId() });

  const FROM_MAP = useMemo(() => {
    const map = {
      custom: t('variableParameter.custom'),
      tool: t('variableParameter.tool'),
      datastore: t('variableParameter.datastore'),
    };
    return map;
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
              const toolId = (parameter?.source as any)?.tool?.id;
              const file = getFileById(toolId);
              return <Box>{t(file?.outputFormat)}</Box>;
            }

            if (parameter.source.variableFrom === 'datastore') {
              const map: any = {
                string: t('text'),
                number: t('number'),
                object: t('object'),
                array: t('array'),
              };
              return <Box>{map[parameter.source?.variable?.dataType]}</Box>;
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
    <>
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
                              parameter={parameter}
                              readOnly={readOnly}
                              value={value}
                              projectId={projectId}
                              gitRef={gitRef}
                              onSelectTool={(toolId) => {
                                id.current = parameter.id;
                                if (toolId) toolForm.current?.form.reset(cloneDeep((parameter.source as any)?.tool));
                                dialogState.open();
                              }}
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

      <ToolDialog
        executeBlock={undefined}
        ref={toolForm}
        projectId={projectId}
        assistant={value}
        gitRef={gitRef}
        DialogProps={{ ...bindDialog(dialogState) }}
        openApis={[]}
        datasets={[]}
        onSubmit={(tool) => {
          doc.transact(() => {
            const key = id.current;
            if (!value.parameters) {
              dialogState.close();
              return;
            }
            if (!key) {
              dialogState.close();
              return;
            }
            const p = value.parameters[key];

            if (p && p?.data?.source?.variableFrom === 'tool') {
              p.data.source.tool = tool;
            }

            id.current = undefined;
            dialogState.close();
          });
        }}
      />
    </>
  );
}

function PopperButton({
  parameter,
  readOnly,
  projectId,
  gitRef,
  onSelectTool,
}: {
  parameter: ParameterYjs;
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  onSelectTool: (toolId: string) => void;
}) {
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });
  const { t } = useLocaleContext();

  const { getFileById, getVariables } = useProjectStore(projectId, gitRef);

  const FROM_MAP = useMemo(() => {
    const map = {
      custom: t('variableParameter.custom'),
      tool: t('variableParameter.tool'),
      datastore: t('variableParameter.datastore'),
    };
    return map;
  }, [t]);

  const renderParameterSettings = (parameter: any) => {
    if (parameter.source) {
      if (parameter.source.variableFrom === 'tool') {
        const toolId = (parameter?.source as any)?.tool?.id;
        const file = getFileById(toolId);

        return (
          <Box className="between">
            <Typography flex={1}>{t('variableParameter.selectAgent')}</Typography>

            <Box flex={1}>
              <Button sx={{ width: 1 }} onClick={() => onSelectTool(toolId)}>
                {file?.name || t('variableParameter.unselect')}
              </Button>
            </Box>
          </Box>
        );
      }

      if (parameter.source.variableFrom === 'datastore') {
        const v = getVariables();

        const variables = v?.variables || [];
        const variable = variables.find((x) => {
          const j = parameter.source?.variable ?? {};
          return `${x.dataType}_${x.scope}_${x.key}` === `${j.dataType}_${j.scope}_${j.key}`;
        });

        return (
          <Stack gap={1.5}>
            <Box className="between">
              <Typography flex={1}>{t('variableParameter.scope')}</Typography>

              <Box flex={2}>
                <Autocomplete
                  options={variables}
                  groupBy={(option) => option.scope || ''}
                  getOptionLabel={(option) => `${option.key} - (${option.scope} - ${option.dataType})`}
                  sx={{ width: 1 }}
                  renderInput={(params) => <TextField hiddenLabel {...params} />}
                  key={Boolean(variable).toString()}
                  disableClearable
                  clearOnBlur
                  selectOnFocus
                  handleHomeEndKeys
                  autoSelect
                  autoHighlight
                  getOptionKey={(i) => `${i.dataType}_${i.scope}_${i.key}`}
                  value={variable}
                  isOptionEqualToValue={(x, j) =>
                    `${x.dataType}_${x.scope}_${x.key}` === `${j.dataType}_${j.scope}_${j.key}`
                  }
                  renderOption={(props, option) => {
                    return (
                      <MenuItem {...props} key={`${option.key} - (${option.scope} - ${option.dataType})`}>
                        <Typography variant="subtitle2" mb={0}>
                          {option.key}
                        </Typography>
                        <Typography variant="subtitle4">{`- (${option.dataType})`}</Typography>
                      </MenuItem>
                    );
                  }}
                  onChange={(_, _value) => {
                    parameter.source.variable = {
                      key: _value.key,
                      scope: _value.scope,
                      dataType: _value.dataType,
                    };
                  }}
                />
              </Box>
            </Box>
          </Stack>
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
      <Button sx={{ minWidth: 0, p: 0.5, ml: -0.5, cursor: 'pointer' }} {...bindTrigger(parameterSettingPopperState)}>
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
