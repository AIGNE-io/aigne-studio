import BaseInput from '@app/components/custom/input';
import BaseSelect from '@app/components/custom/select';
import { useProjectStore } from '@app/pages/project/yjs-state';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, OutputVariableYjs, Variable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { Close, ExpandMoreRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Popper,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
  createFilterOptions,
} from '@mui/material';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import BaseSwitch from '../../custom/switch';
import AddOutputVariableButton from './AddOutputVariableButton';
import { getRuntimeOutputVariable } from './type';

export default function OutputSettings({
  value,
  isOpen = true,
  projectId,
  gitRef,
}: {
  value: AssistantYjs;
  isOpen?: boolean;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();

  const [open, setOpen] = useState(isOpen);

  const outputVariables = value.outputVariables && sortBy(Object.values(value.outputVariables), 'index');

  const doc = (getYjsValue(value) as Map<any>).doc!;

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
    doc.transact(() => {
      value.outputVariables ??= {};
      update(value.outputVariables);
      sortBy(Object.values(value.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
  };

  return (
    <Box sx={{ border: '1px solid #E5E7EB', px: 1, py: 2, borderRadius: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        sx={{ cursor: 'pointer', px: 1 }}
        gap={1}
        onClick={() => setOpen(!open)}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 500,
          }}>
          {t('output')}
        </Typography>

        <Stack direction="row" flex={1} overflow="hidden" alignItems="center" justifyContent="flex-end" />

        <Stack direction="row" alignItems="center" gap={1} onClick={(e) => e.stopPropagation()}>
          <Typography variant="subtitle4">{t('outputFormat')}</Typography>

          <TextField
            size="small"
            hiddenLabel
            select
            SelectProps={{ autoWidth: true }}
            value={value.outputFormat || 'text'}
            onChange={(e) => {
              value.outputFormat = e.target.value as any;
            }}>
            <MenuItem value="text">{t('text')}</MenuItem>
            <MenuItem value="json">{t('json')}</MenuItem>
          </TextField>
        </Stack>

        <ExpandMoreRounded
          sx={{
            transform: !open ? 'rotateZ(270deg)' : 'rotateZ(360deg)',
            transition: (theme) => theme.transitions.create('all'),
            fontSize: 18,
            color: '#030712',
          }}
        />
      </Stack>

      <Collapse in={open}>
        <Box component="table" sx={{ minWidth: '100%', th: { whiteSpace: 'nowrap' } }}>
          <thead>
            <tr>
              <Box component="th">{t('name')}</Box>
              <Box component="th">{t('description')}</Box>
              <Box component="th">{t('type')}</Box>
              <Box component="th">{t('required')}</Box>
              <Box component="th">{t('defaultValue')}</Box>
              <Box component="th">{t('actions')}</Box>
            </tr>
          </thead>
          <tbody>
            {outputVariables?.map((variable) => (
              <VariableRow
                key={variable.data.id}
                variable={variable.data}
                value={value}
                projectId={projectId}
                gitRef={gitRef}
                onRemove={() =>
                  setField(() => {
                    delete value.outputVariables?.[variable.data.id];
                  })
                }
              />
            ))}
          </tbody>
        </Box>

        <AddOutputVariableButton
          onSelect={({ name }) => {
            if (name && outputVariables?.some((i) => i.data.name === name)) return;

            setField((vars) => {
              const id = nanoid();
              vars[id] = { index: Object.values(vars).length, data: { id, type: 'string', name } };
            });
          }}
        />
      </Collapse>
    </Box>
  );
}

const filter = createFilterOptions<Variable>();
type Input = { scope: Variable['scope']; key?: string; reset: boolean; defaultValue?: string };

function VariableRow({
  value,
  variable,
  depth = 0,
  onRemove,
  projectId,
  gitRef,
}: {
  value: AssistantYjs;
  variable: OutputVariableYjs;
  depth?: number;
  onRemove?: () => void;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(variable) as Map<any>).doc!;
  const outputPopperState = usePopupState({ variant: 'popper', popupId: useId() });
  const runtimeVariable = getRuntimeOutputVariable(variable);
  const form = useForm<Input>({
    defaultValues: {
      reset: false,
      scope: 'session',
      key: variable.name ?? '',
      defaultValue: (variable as any)?.defaultValue ?? '',
    },
  });

  const dialogState = usePopupState({ variant: 'dialog' });
  const { dialog, showDialog } = useDialog();
  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();

  const variables = (variableYjs?.variables || []).filter((x) => x.dataType === variable.type);
  const datastoreVariable = variables.find((x) => {
    const j = variable?.variable ?? { dataType: undefined, scope: '', key: '' };
    return `${x.dataType}_${x.scope}_${x.key}` === `${j.dataType}_${j.scope}_${j.key}`;
  });

  return (
    <>
      <tr key={variable.id}>
        <Box component="td">
          <Box sx={{ ml: depth }}>
            {runtimeVariable ? (
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  px: 1,
                  py: 0.5,
                  gap: 1,
                  border: 1,
                  borderRadius: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.100',
                  whiteSpace: 'nowrap',
                }}>
                {runtimeVariable.icon}

                <Typography>{t(runtimeVariable.i18nKey)}</Typography>
              </Stack>
            ) : (
              <TextField
                fullWidth
                hiddenLabel
                placeholder={t('name')}
                value={variable.name || ''}
                onChange={(e) => (variable.name = e.target.value)}
              />
            )}
          </Box>
        </Box>
        <Box component="td">
          <TextField
            fullWidth
            hiddenLabel
            placeholder={t('placeholder')}
            value={variable.description || ''}
            onChange={(e) => (variable.description = e.target.value)}
          />
        </Box>
        <Box component="td" align="center">
          {!runtimeVariable && (
            <VariableTypeField
              value={variable.type || 'string'}
              onChange={(e) => {
                const type = e.target.value as any;

                if (variable.variable) {
                  const found = (variableYjs.variables || []).find(
                    (x) =>
                      x.dataType === type && x.key === variable.variable?.key && x.scope === variable.variable.scope
                  );
                  if (!found) {
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
                      title: <Box sx={{ wordWrap: 'break-word' }}>{t('outputVariableParameter.changeTypeTitle')}</Box>,
                      content: (
                        <Box>
                          <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                            {t('outputVariableParameter.changeTypeDesc', {
                              type,
                              key: variable.variable?.key || '',
                            })}
                          </Typography>
                        </Box>
                      ),
                      okText: t('confirm'),
                      okColor: 'error',
                      cancelText: t('alert.cancel'),
                      onOk: () => {
                        variableYjs.variables ??= [];

                        const v = {
                          scope: variable.variable?.scope,
                          key: variable.variable?.key || '',
                          dataType: type,
                          reset: Boolean(variable.variable?.reset),
                          defaultValue: '',
                        };

                        variableYjs.variables.push(v);
                        variable.variable = cloneDeep(v);

                        variable.type = type;
                        if (variable.type === 'array') {
                          variable.element ??= { id: nanoid(), name: 'element', type: 'string' };
                        }
                      },
                    });
                  } else {
                    variable.variable = cloneDeep({ ...found });
                    variable.type = type;
                    if (variable.type === 'array') {
                      variable.element ??= { id: nanoid(), name: 'element', type: 'string' };
                    }
                  }
                } else {
                  variable.type = type;
                  if (variable.type === 'array') {
                    variable.element ??= { id: nanoid(), name: 'element', type: 'string' };
                  }
                }
              }}
            />
          )}
        </Box>
        <Box component="td" align="center">
          <Checkbox
            checked={variable.required || false}
            onChange={(_, checked) => {
              variable.required = checked;
            }}
          />
        </Box>
        <Box component="td" align="center">
          {runtimeVariable ? null : variable.type === 'string' ? (
            <TextField
              hiddenLabel
              fullWidth
              multiline
              value={variable.defaultValue || ''}
              onChange={(e) => (variable.defaultValue = e.target.value)}
            />
          ) : variable.type === 'number' ? (
            <NumberField
              hiddenLabel
              fullWidth
              value={variable.defaultValue || null}
              onChange={(value) => (variable.defaultValue = value)}
            />
          ) : null}
        </Box>
        <td align="right">
          <Stack direction="row" gap={1} justifyContent="flex-end">
            {depth === 0 && (
              <>
                <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} {...bindTrigger(outputPopperState)}>
                  <Icon icon="tabler:settings" />
                </Button>

                <Popper
                  {...bindPopper(outputPopperState)}
                  placement="bottom-end"
                  sx={{ zIndex: (theme) => theme.zIndex.modal }}>
                  <ClickAwayListener
                    onClickAway={(e) => {
                      if (e.target === document.body) return;
                      outputPopperState.close();
                    }}>
                    <Paper sx={{ p: 3, width: 320, maxHeight: '80vh', overflow: 'auto' }}>
                      <Stack gap={2}>
                        <Box className="between">
                          <Typography flex={2}>{t('outputVariableParameter.saveAs')}</Typography>

                          <Box flex={3}>
                            <Autocomplete
                              options={variables}
                              groupBy={(option) => option.scope || ''}
                              getOptionLabel={(option) =>
                                option ? `${option.key} - (${option.scope} - ${option.dataType})` : ''
                              }
                              renderInput={(params) => <TextField hiddenLabel {...params} />}
                              key={Boolean(datastoreVariable).toString()}
                              disableClearable
                              clearOnBlur
                              selectOnFocus
                              handleHomeEndKeys
                              autoSelect
                              autoHighlight
                              getOptionKey={(i) => `${i.dataType}_${i.scope}_${i.key}`}
                              value={datastoreVariable}
                              isOptionEqualToValue={(x, j) =>
                                `${x.dataType}_${x.scope}_${x.key}` === `${j.dataType}_${j.scope}_${j.key}`
                              }
                              renderOption={(props, option) => {
                                if (option.key) {
                                  return (
                                    <MenuItem {...props} key={`${option.key} - (${option.scope} - ${option.dataType})`}>
                                      <Typography variant="subtitle2" mb={0}>
                                        {option.key}
                                      </Typography>
                                      <Typography variant="subtitle4">{`- (${option.dataType})`}</Typography>
                                    </MenuItem>
                                  );
                                }

                                return <MenuItem {...props}>{t('outputVariableParameter.addData')}</MenuItem>;
                              }}
                              filterOptions={(_, params) => {
                                const filtered = filter(variables, params);

                                const found = filtered.find((x) => !x.key);
                                if (!found) {
                                  filtered.push({ dataType: variable.type, key: '' });
                                }

                                return filtered;
                              }}
                              onChange={(_, _value) => {
                                if (_value.key) {
                                  variable.variable = cloneDeep({ ..._value });
                                  outputPopperState.close();
                                } else {
                                  form.setValue('key', variable.name ?? '');
                                  form.setValue('defaultValue', (variable as any)?.defaultValue ?? '');
                                  outputPopperState.close();
                                  dialogState.open();
                                }
                              }}
                            />
                          </Box>
                          <IconButton
                            onClick={() => {
                              if (variable.variable) {
                                delete variable.variable;
                              }
                            }}>
                            <Box component={Icon} icon="tabler:trash" color="warning.main" fontSize={16}></Box>
                          </IconButton>
                        </Box>
                      </Stack>
                    </Paper>
                  </ClickAwayListener>
                </Popper>
              </>
            )}

            {variable.type === 'object' && (
              <Button
                sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                onClick={() => {
                  doc.transact(() => {
                    variable.properties ??= {};
                    const id = nanoid();
                    variable.properties[id] = {
                      index: Object.values(variable.properties).length,
                      data: { id, type: 'string' },
                    };
                    sortBy(Object.values(variable.properties), 'index').forEach((item, index) => (item.index = index));
                  });
                }}>
                <Icon icon="tabler:plus" />
              </Button>
            )}

            {onRemove && (
              <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onRemove}>
                <Icon icon="tabler:minus" />
              </Button>
            )}
          </Stack>
        </td>
      </tr>

      {variable.type === 'object' &&
        variable.properties &&
        sortBy(Object.values(variable.properties), 'index').map((property) => (
          <VariableRow
            key={property.data.id}
            value={value}
            variable={property.data}
            depth={depth + 1}
            projectId={projectId}
            gitRef={gitRef}
            onRemove={() => {
              doc.transact(() => {
                if (!variable.properties) return;
                delete variable.properties[property.data.id];
                sortBy(Object.values(variable.properties), 'index').forEach((item, index) => (item.index = index));
              });
            }}
          />
        ))}

      {variable.type === 'array' && variable.element && (
        <VariableRow
          projectId={projectId}
          gitRef={gitRef}
          value={value}
          variable={variable.element}
          depth={depth + 1}
        />
      )}

      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={form.handleSubmit((data) => {
          variableYjs.variables ??= [];

          const v = {
            key: data.key || '',
            scope: data.scope,
            dataType: variable.type as any,
            reset: Boolean(data.reset),
            defaultValue: data.defaultValue,
          };

          variableYjs.variables.push(v);
          variable.variable = cloneDeep(v);

          dialogState.close();
        })}>
        <DialogTitle className="between" sx={{ border: 0 }}>
          <Box>{t('outputVariableParameter.addData')}</Box>

          <IconButton size="small" onClick={() => dialogState.close()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack gap={2}>
            <Controller
              control={form.control}
              name="key"
              rules={{
                required: t('outputVariableParameter.keyRequired'),
                validate: (value) => {
                  const found = (variableYjs.variables || [])?.find((x) => {
                    return (
                      `${x.dataType}_${x.scope}_${x.key}` === `${variable.type}_${form.getValues('scope')}_${value}`
                    );
                  });

                  if (found) {
                    return t('variableParameter.duplicate');
                  }

                  return true;
                },
              }}
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('outputVariableParameter.key')}</Typography>
                    <BaseInput sx={{ width: 1 }} placeholder={t('outputVariableParameter.key')} {...field} />
                    {Boolean(fieldState.error) && (
                      <Typography variant="subtitle5" color="warning.main">
                        {fieldState.error?.message}
                      </Typography>
                    )}
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
                    <BaseSelect
                      variant="outlined"
                      placeholder={t('outputVariableParameter.scope')}
                      fullWidth
                      {...field}
                      error={Boolean(fieldState.error)}>
                      {['user', 'session', 'global'].map((option) => (
                        <MenuItem key={option} value={option}>
                          {t(`variableParameter.${option}`)}
                        </MenuItem>
                      ))}
                    </BaseSelect>
                    {Boolean(fieldState.error) && (
                      <Typography variant="subtitle5" color="warning.main">
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
                      <Typography variant="subtitle5" color="warning.main">
                        {fieldState.error?.message}
                      </Typography>
                    )}
                  </Box>
                );
              }}
            />

            <Controller
              control={form.control}
              name="defaultValue"
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('variableParameter.defaultValue')}</Typography>

                    <BaseInput sx={{ width: 1 }} placeholder={t('variableParameter.defaultValue')} {...field} />

                    {Boolean(fieldState.error) && (
                      <Typography variant="subtitle5" color="warning.main">
                        {fieldState.error?.message}
                      </Typography>
                    )}
                  </Box>
                );
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={dialogState.close} variant="outlined">
            {t('cancel')}
          </Button>

          <LoadingButton type="submit" variant="contained" loading={form.formState.isSubmitting}>
            {t('save')}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {dialog}
    </>
  );
}

function VariableTypeField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField hiddenLabel placeholder={t('type')} select SelectProps={{ autoWidth: true }} {...props}>
      <MenuItem value="string">{t('text')}</MenuItem>
      <MenuItem value="number">{t('number')}</MenuItem>
      <MenuItem value="object">{t('object')}</MenuItem>
      <MenuItem value="array">{t('array')}</MenuItem>
    </TextField>
  );
}
