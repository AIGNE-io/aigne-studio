import BaseSwitch from '@app/components/custom/switch';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, OutputVariableYjs, VariableYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import MinusIcon from '@iconify-icons/tabler/minus';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Button as LoadingButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material';
import equal from 'fast-deep-equal';
import cloneDeep from 'lodash/cloneDeep';
import groupBy from 'lodash/groupBy';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import SegmentedControl from '../project/segmented-control';
import { PROMPTS_FOLDER_NAME, useProjectStore } from '../project/yjs-state';

function CustomNoRowsOverlay({ onAdd }: { onAdd: () => void }) {
  const { t } = useLocaleContext();

  return (
    <Stack
      sx={{
        width: 1,
        textAlign: 'center',
        py: 2.5,
      }}>
      <Box
        sx={{
          lineHeight: '28px',
        }}>
        🔢
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: '#030712',
          fontSize: 13,
          lineHeight: '22px',
          fontWeight: 500,
        }}>
        {t('memory.empty')}
      </Typography>
      <Button onClick={onAdd} data-testid="add-new-memory">
        {t('memory.add')}
      </Button>
    </Stack>
  );
}

type MemoryVariable = VariableYjs & { assistants: string[] };

function VariableList() {
  const { dialog, showDialog } = useDialog();
  const { projectId, ref: gitRef } = useParams();
  const { t } = useLocaleContext();
  const [scope, setScope] = useState<'global' | 'user' | 'session'>('global');
  const currentVariable = useRef<MemoryVariable | undefined>(undefined);

  const dialogState = usePopupState({ variant: 'dialog' });

  const { synced, store, getVariables, getFileById } = useProjectStore(projectId || '', gitRef || '', true);
  const variableYjs = getVariables();
  const form = useForm<MemoryVariable>({
    defaultValues: { reset: false, scope: 'session', key: '', defaultValue: '', type: { type: 'string' } },
  });

  const scopeCount = Object.fromEntries(
    Object.entries(groupBy(variableYjs?.variables || [], 'scope')).map(([scope, variables]) => [
      scope,
      variables.length,
    ])
  );

  useEffect(() => {
    setScope((Object.keys(scopeCount)[0] as 'global' | 'user' | 'session') || 'global');
  }, []);

  const list = useMemo(() => {
    const filterVariables = (variableYjs?.variables || []).filter((x) => x.scope === scope);
    const map: { [key: string]: any } = {};
    const assistants = Object.entries(store.tree)
      .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
      .map(([id]) => store.files[id])
      .filter((i): i is AssistantYjs => !!i && isAssistant(i));

    assistants.forEach((assistant) => {
      Object.values(assistant.parameters || {})
        .filter((i) => !i.data.hidden)
        .forEach((parameter) => {
          if (parameter.data.type === 'source' && parameter.data.source?.variableFrom === 'datastore') {
            const s = parameter.data.source;
            const key: string = `${s.variable?.scope || ''}_${s.variable?.key || ''}`;
            map[key] ??= [];
            map[key].push(assistant.id);
          }
        });

      Object.values(assistant.outputVariables || {}).forEach((output) => {
        if (output?.data?.variable && output?.data?.variable?.key) {
          const s = output.data.variable;
          const key: string = `${s?.scope || ''}_${s?.key || ''}`;
          map[key] ??= [];
          map[key].push(assistant.id);
        }
      });
    });

    const list = filterVariables.map((x) => {
      const key: string = `${x?.scope || ''}_${x?.key || ''}`;
      return { ...x, assistants: uniq(map[key] || []) as string[] };
    });

    return list;
  }, [scope, synced, JSON.stringify(variableYjs.variables)]);

  const updateAgentMemory = (variable: MemoryVariable, key: string) => {
    const assistants = Object.entries(store.tree)
      .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
      .map(([id]) => store.files[id])
      .filter((i): i is AssistantYjs => !!i && isAssistant(i))
      .filter((i) => (variable.assistants || []).includes(i.id));

    assistants.forEach((assistant) => {
      Object.values(assistant.parameters || {})
        .filter((i) => !i.data.hidden)
        .forEach((parameter) => {
          if (parameter.data.type === 'source' && parameter.data.source?.variableFrom === 'datastore') {
            const s = parameter.data.source;
            if (s.variable?.key === variable.key) {
              s.variable.key = key;
            }
          }
        });

      Object.values(assistant.outputVariables || {}).forEach((output) => {
        if (output?.data?.variable && output?.data?.variable?.key) {
          const s = output.data.variable;
          if (s.key === variable.key) {
            s.key = key;
          }
        }
      });
    });
  };

  const map: any = useMemo(() => {
    return {
      string: t('text'),
      number: t('number'),
      object: t('object'),
      array: t('array'),
      boolean: t('boolean'),
    };
  }, [t]);

  const columns = useMemo(
    () => [
      {
        field: 'title',
        headerName: t('memory.name'),
        renderCell: (params: any) => params?.key || t('unnamed'),
      },
      {
        field: 'count',
        headerName: t('memory.type'),
        renderCell: (params: any) => {
          return <Box>{map[params?.type?.type]}</Box>;
        },
      },
      {
        field: 'useAssistant',
        headerName: t('variables.useAssistant'),
        renderCell: (params: any) => {
          return (
            <Box
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
              {(params.assistants || [])
                .map((id: string) => getFileById(id)?.name)
                .filter((x: any) => x)
                .join(',')}
            </Box>
          );
        },
      },
      {
        field: 'action',
        headerName: <Box sx={{ mr: 2.5 }}>{t('actions')}</Box>,
        align: 'right',
        renderCell: (params: any) => {
          return (
            <Stack
              direction="row"
              sx={{
                gap: 1,
                justifyContent: 'flex-end',
              }}>
              <Button
                size="small"
                onClick={() => {
                  currentVariable.current = cloneDeep(params);
                  if (currentVariable.current) {
                    currentVariable.current.defaultValue = formatDefaultValue(currentVariable.current);
                  }

                  form.reset(currentVariable.current);
                  dialogState.open();
                }}>
                {t('edit')}
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => {
                  const agents = (params.assistants || []).map((id: string) => getFileById(id)?.name).filter(Boolean);

                  if (agents.length) {
                    showDialog({
                      formSx: {
                        '.MuiDialogTitle-root': {
                          border: 0,
                        },
                        '.MuiDialogActions-root': {
                          border: 0,
                        },
                        '.save': {
                          background: '#d32f2f',
                        },
                      },
                      maxWidth: 'sm',
                      fullWidth: true,
                      title: <Box sx={{ wordWrap: 'break-word' }}>{t('删除Memory')}</Box>,
                      content: (
                        <Box>
                          <Typography
                            sx={{
                              fontWeight: 500,
                              fontSize: 16,
                              lineHeight: '28px',
                              color: '#4B5563',
                            }}>
                            {t('deleteMemoryTip', { agents: agents.join(', ') })}
                          </Typography>
                        </Box>
                      ),
                      okText: t('confirm'),
                      okColor: 'error',
                      cancelText: t('cancel'),
                      onOk: () => {
                        const index = (variableYjs?.variables || []).findIndex(
                          (x) => x.key === params.key && x.scope === params.scope
                        );
                        if (index > -1) {
                          (variableYjs?.variables || []).splice(index, 1);
                        }
                      },
                    });
                  } else {
                    const index = (variableYjs?.variables || []).findIndex(
                      (x) => x.key === params.key && x.scope === params.scope
                    );
                    if (index > -1) {
                      (variableYjs?.variables || []).splice(index, 1);
                    }
                  }
                }}>
                {t('delete')}
              </Button>
            </Stack>
          );
        },
      },
    ],
    [t]
  );

  const onAdd = () => {
    form.reset({
      id: nanoid(32),
      key: '',
      defaultValue: '',
      type: { type: 'string' },
      scope,
    });
    dialogState.open();
  };

  const formatDefaultValue = (value: Omit<VariableYjs, 'assistants'>) => {
    if (value?.type?.type === 'boolean') {
      return Boolean(value.defaultValue);
    }

    if (value?.type?.type === 'number') {
      return Number.isNaN(Number(value.defaultValue)) ? 0 : Number(value.defaultValue);
    }

    return value.defaultValue;
  };

  const watch = form.watch('type');
  return (
    <Container>
      <Box
        className="between"
        sx={{
          mt: 2.5,
          mb: 1.5,
        }}>
        <Box sx={{ fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#030712' }}>{t('memory.title')}</Box>
        <SegmentedControl
          value={scope}
          options={[
            { value: 'global', label: t('variableParameter.global'), count: scopeCount.global },
            { value: 'user', label: t('variableParameter.user'), count: scopeCount.user },
            { value: 'session', label: t('variableParameter.session'), count: scopeCount.session },
          ]}
          onChange={(value: 'global' | 'user' | 'session') => {
            if (value) setScope(value);
          }}
        />
      </Box>
      <Box
        data-testid="variable-list"
        sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5 }}>
        <Box
          sx={{
            borderBottom: () => (list?.length ? '1px solid rgba(224, 224, 224, 1)' : 0),
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            table: {
              th: { pt: 0 },
              td: { py: 0 },
              'tbody tr: last-of-type td': {
                border: 'none',
              },
            },
          }}>
          <Table>
            <TableHead>
              <TableRow>
                {columns.map((column: any) => (
                  <TableCell
                    key={column.field}
                    align={column?.align}
                    sx={{ px: 0.5, py: 1, fontWeight: 500, fontSize: 13, lineHeight: '22px' }}>
                    {column.headerName}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            {!!list?.length && (
              <TableBody>
                {list.map((x) => (
                  <TableRow key={`${x.scope}_${x.key}`}>
                    {columns.map((column: any) => {
                      return (
                        <TableCell key={column.field} align={column?.align} sx={{ px: 0.5, height: 36 }}>
                          {column.renderCell(x)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
          {!list.length && <CustomNoRowsOverlay onAdd={onAdd} />}
        </Box>

        {!!list.length && (
          <Button startIcon={<Box component={Icon} icon={PlusIcon} />} sx={{ my: 1, ml: -0.5 }} onClick={onAdd}>
            {t('memory.title')}
          </Button>
        )}
      </Box>
      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={form.handleSubmit((data) => {
          variableYjs.variables ??= [];
          const variable = currentVariable.current;

          if (variable) {
            const index = variableYjs.variables.findIndex((x) =>
              variable.id
                ? x.id === variable.id
                : x.key === variable.key && x.scope === variable.scope && x.type === variable.type
            );

            if (index > -1) {
              variableYjs.variables.splice(index, 1, {
                ...cloneDeep(data),
                id: variable.id || nanoid(32),
                reset: Boolean(data.reset),
              });
            }

            // 如果仅仅修改 key, 更新 agent 数据
            if (variable.key !== data.key && variable.scope === data.scope && variable.type === data.type) {
              updateAgentMemory(variable, data.key);
            }
          } else {
            const newVariable = {
              id: nanoid(32),
              key: data.key || '',
              scope: data.scope,
              type: data.type,
              reset: Boolean(data.reset),
              defaultValue: data.defaultValue,
            };
            newVariable.defaultValue = formatDefaultValue(newVariable);

            variableYjs.variables.push(newVariable);
          }

          currentVariable.current = undefined;
          dialogState.close();

          if (data.scope) {
            setScope(data.scope);
          }
        })}>
        <DialogTitle className="between">
          <Box>{`${currentVariable.current ? t('outputVariableParameter.edit') : t('outputVariableParameter.add')}${t('outputVariableParameter.memory')}`}</Box>

          <IconButton size="small" onClick={() => dialogState.close()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack
            sx={{
              gap: 2,
            }}>
            <Controller
              control={form.control}
              name="key"
              rules={{
                required: t('outputVariableParameter.keyRequired'),
                validate: (value) => {
                  if (currentVariable.current) {
                    // 编辑时，key 相同，不报错
                    if (currentVariable.current.key === value) {
                      return true;
                    }
                  }
                  // key 和 scope 是否存在，如果存在，不运行创建
                  const found = (variableYjs.variables || [])?.find((x) => {
                    return `${x.scope}_${x.key}` === `${form.getValues('scope')}_${value}`;
                  });

                  if (found) {
                    return t('variableParameter.duplicate');
                  }

                  return true;
                },
              }}
              render={({ field: { ref, ...field }, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('memory.name')}</Typography>
                    <TextField
                      inputRef={ref}
                      autoFocus
                      sx={{ width: 1 }}
                      {...field}
                      hiddenLabel
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  </Box>
                );
              }}
            />

            <Controller
              control={form.control}
              name="scope"
              rules={{
                required: t('outputVariableParameter.scopeRequired'),
              }}
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('outputVariableParameter.scope')}</Typography>
                    <TextField
                      autoFocus
                      select
                      sx={{ width: 1 }}
                      {...field}
                      hiddenLabel
                      placeholder={t('outputVariableParameter.scope')}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}>
                      {['session', 'user', 'global'].map((option) => (
                        <MenuItem key={option} value={option}>
                          {t(`variableParameter.${option}`)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                );
              }}
            />

            <Controller
              control={form.control}
              name="type"
              rules={{
                required: t('outputVariableParameter.typeRequired'),
                validate: (value) => {
                  if (currentVariable.current) {
                    // 编辑时，type 相同，不报错
                    if (currentVariable.current.type === value?.type) {
                      return true;
                    }
                  }

                  const foundKey = (variableYjs.variables || [])?.find((x) => {
                    return `${x.key}` === `${form.getValues('key')}`;
                  });

                  // 如果定义过的变量, 并且变量 type 不一致
                  if (foundKey) {
                    if (foundKey?.type?.type !== value?.type) {
                      return t('outputVariableParameter.typeBeDefined', {
                        type: `${foundKey?.type?.type ? map[foundKey?.type?.type] : ''}`,
                      });
                    }

                    if (value?.type === 'object' && foundKey?.type?.type === 'object') {
                      if (!equal(cloneDeep(foundKey.type?.properties), cloneDeep(value.properties))) {
                        return t('outputVariableParameter.compareObject');
                      }
                    }

                    if (value?.type === 'array' && foundKey?.type?.type === 'array') {
                      if (!equal(cloneDeep(foundKey.type?.element), cloneDeep(value.element))) {
                        return t('outputVariableParameter.compareObject');
                      }
                    }
                  }

                  return true;
                },
              }}
              render={({ field, fieldState }) => {
                const { value } = field;
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('memory.type')}</Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                      }}>
                      <VariableTypeField
                        key={Boolean(value).toString()}
                        value={value?.type}
                        onChange={(e) => {
                          const type = e.target.value as any;
                          const newValue: any = { type };
                          if (newValue.type === 'array') {
                            newValue.element ??= { id: nanoid(), name: 'element', type: 'string' };
                          }
                          form.setValue('defaultValue', undefined);
                          field.onChange({ target: { value: newValue } });
                        }}
                      />

                      {value && value?.type === 'object' && (
                        <Button
                          sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                          onClick={() => {
                            value.properties ??= {};
                            const id = nanoid(32);
                            value.properties[id] = {
                              index: Object.values(value.properties).length,
                              data: { id, type: 'string' },
                            };
                            sortBy(Object.values(value.properties), 'index').forEach(
                              (item: any, index) => (item.index = index)
                            );

                            field.onChange({ target: { value } });
                          }}>
                          <Box component={Icon} icon={PlusIcon} />
                        </Button>
                      )}
                    </Box>
                    {((value && value?.type === 'object') || value?.type === 'array') && (
                      <VariableTable
                        key={Boolean(value).toString()}
                        value={value as any}
                        onChange={(_value) => field.onChange({ target: { value: _value } })}
                      />
                    )}
                    {Boolean(fieldState.error) && (
                      <Typography
                        variant="subtitle5"
                        sx={{
                          color: 'warning.main',
                        }}>
                        {fieldState.error?.message}
                      </Typography>
                    )}
                  </Box>
                );
              }}
            />

            <Controller
              control={form.control}
              name="reset"
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('variableParameter.reset')}</Typography>
                    <BaseSwitch {...field} />
                    {Boolean(fieldState.error) && (
                      <Typography
                        variant="subtitle5"
                        sx={{
                          color: 'warning.main',
                        }}>
                        {fieldState.error?.message}
                      </Typography>
                    )}
                  </Box>
                );
              }}
            />

            {['string', 'number', 'boolean'].includes(watch?.type || '') && (
              <Controller
                control={form.control}
                name="defaultValue"
                render={({ field, fieldState }) => {
                  return (
                    <Box>
                      <Typography variant="subtitle2">{t('defaultValue')}</Typography>

                      {watch?.type === 'boolean' ? (
                        <BaseSwitch checked={Boolean(field.value)} onChange={field.onChange} />
                      ) : (
                        <TextField
                          type={watch?.type}
                          autoFocus
                          sx={{ width: 1 }}
                          {...field}
                          hiddenLabel
                          error={Boolean(fieldState.error)}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    </Box>
                  );
                }}
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={dialogState.close} variant="outlined">
            {t('cancel')}
          </Button>

          <LoadingButton
            loadingPosition="start"
            type="submit"
            variant="contained"
            loading={form.formState.isSubmitting}>
            {t('save')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
      {dialog}
    </Container>
  );
}

function VariableTypeField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField
      hiddenLabel
      placeholder={t('format')}
      select
      {...props}
      slotProps={{
        select: { autoWidth: true },
      }}>
      <MenuItem value="string" disabled={props.disabled}>
        {t('text')}
      </MenuItem>
      <MenuItem value="number" disabled={props.disabled}>
        {t('number')}
      </MenuItem>
      <MenuItem value="boolean" disabled={props.disabled}>
        {t('boolean')}
      </MenuItem>
      <MenuItem value="object" disabled={props.disabled}>
        {t('object')}
      </MenuItem>
      <MenuItem value="array" disabled={props.disabled}>
        {t('array')}
      </MenuItem>
    </TextField>
  );
}

function VariableTable({ value, onChange }: { value: OutputVariableYjs; onChange: (data: OutputVariableYjs) => void }) {
  const { t } = useLocaleContext();

  return (
    <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5, mt: 1 }}>
      <Box
        component="table"
        sx={{
          whiteSpace: 'nowrap',
          minWidth: '100%',
          table: {
            th: { pt: 0, px: 0, whiteSpace: 'nowrap' },
            td: { py: 0, px: 0, whiteSpace: 'nowrap' },
            'tbody tr:last-of-type td': {
              border: 'none',
            },
          },
        }}>
        <Box component="thead">
          <Box component="tr" sx={{ '>th': { fontSize: 12 } }}>
            <Box component="th">{t('name')}</Box>
            <Box component="th">{t('description')}</Box>
            <Box component="th">{t('format')}</Box>
            <Box component="th">{t('required')}</Box>
            <Box component="th">{t('defaultValue')}</Box>
            <Box component="th">{t('actions')}</Box>
          </Box>
        </Box>

        <Box component="tbody">
          <VariableRow variable={value} depth={0} onChange={onChange} />
        </Box>
      </Box>
    </Box>
  );
}

function VariableRow({
  depth = 0,
  variable,
  onRemove = () => {},
  onChange,
}: {
  depth?: number;
  variable: OutputVariableYjs;
  onRemove?: () => void;
  onChange: (data: OutputVariableYjs) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <>
      {depth !== 0 && (
        <tr key={variable.id}>
          <Box component="td">
            <Box sx={{ ml: depth - 1 }}>
              <TextField
                fullWidth
                hiddenLabel
                placeholder={t('name')}
                value={variable.name || ''}
                onChange={(e) => {
                  variable.name = e.target.value;
                  onChange(variable);
                }}
              />
            </Box>
          </Box>
          <Box component="td">
            <TextField
              fullWidth
              hiddenLabel
              placeholder={t('placeholder')}
              value={variable.description || ''}
              onChange={(e) => {
                variable.description = e.target.value;
                onChange(variable);
              }}
            />
          </Box>
          <Box component="td" align="center">
            <VariableTypeField
              value={variable.type || 'string'}
              onChange={(e) => {
                const type = e.target.value as any;

                variable.type = type;
                if (variable.type === 'array') {
                  variable.element ??= { id: nanoid(), name: 'element', type: 'string' };
                }

                onChange(variable);
              }}
            />
          </Box>
          <Box component="td" align="center">
            <Checkbox
              checked={variable.required || false}
              onChange={(_, checked) => {
                variable.required = checked;

                onChange(variable);
              }}
            />
          </Box>
          <Box component="td" align="center">
            {variable.type === 'string' ? (
              <TextField
                hiddenLabel
                fullWidth
                value={variable.defaultValue || ''}
                onChange={(e) => {
                  variable.defaultValue = e.target.value;
                  onChange(variable);
                }}
              />
            ) : variable.type === 'number' ? (
              <NumberField
                hiddenLabel
                fullWidth
                value={variable.defaultValue || ''}
                onChange={(value) => {
                  variable.defaultValue = value;
                  onChange(variable);
                }}
              />
            ) : null}
          </Box>
          <td align="right">
            <Stack
              direction="row"
              sx={{
                gap: 1,
                justifyContent: 'flex-end',
              }}>
              {variable.type === 'object' && (
                <Button
                  sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                  onClick={() => {
                    variable.properties ??= {};
                    const id = nanoid();
                    variable.properties[id] = {
                      index: Object.values(variable.properties).length,
                      data: { id, type: 'string' },
                    };
                    sortBy(Object.values(variable.properties), 'index').forEach((item, index) => (item.index = index));

                    onChange(variable);
                  }}>
                  <Box component={Icon} icon={PlusIcon} />
                </Button>
              )}

              {onRemove && (
                <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onRemove}>
                  <Box component={Icon} icon={MinusIcon} />
                </Button>
              )}
            </Stack>
          </td>
        </tr>
      )}
      {variable.type === 'object' &&
        variable.properties &&
        sortBy(Object.values(variable.properties), 'index').map((property) => (
          <VariableRow
            variable={property.data}
            depth={depth + 1}
            onRemove={() => {
              if (!variable.properties) return;
              delete variable.properties[property.data.id];
              sortBy(Object.values(variable.properties), 'index').forEach((item, index) => (item.index = index));
              onChange(variable);
            }}
            onChange={(data) => {
              property.data = data;
              onChange(variable);
            }}
          />
        ))}
      {variable.type === 'array' && variable.element && (
        <VariableRow
          variable={variable.element}
          depth={depth + 1}
          onChange={(data) => {
            variable.element = data;
            onChange(variable);
          }}
        />
      )}
    </>
  );
}

export default VariableList;
