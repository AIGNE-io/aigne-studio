import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { OutputVariableYjs, VariableYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Close } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
  createFilterOptions,
} from '@mui/material';
import equal from 'fast-deep-equal';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog } from 'material-ui-popup-state';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import BaseInput from '../custom/input';
import BaseSelect from '../custom/select';
import BaseSwitch from '../custom/switch';

const scopePriority: any = {
  session: 1,
  user: 2,
  global: 3,
};

function sortVariables(variables: VariableYjs[]) {
  return cloneDeep(variables).sort((a, b) => {
    const priorityA: number = scopePriority[a.scope || ''] || 999;
    const priorityB: number = scopePriority[b.scope || ''] || 999;
    return priorityA - priorityB;
  });
}

const filter = createFilterOptions<any>();
function SelectVariable({
  projectId,
  gitRef,
  variables,
  variable,
  onChange,
  onDelete,
  typeDefaultSetting,
}: {
  projectId: string;
  gitRef: string;
  variables: VariableYjs[];
  variable?: VariableYjs;
  onDelete?: () => void;
  onChange: (_value: VariableYjs) => void;
  typeDefaultSetting: {
    name: string;
    defaultValue: string;
    type: VariableYjs['type'];
    disabled?: boolean;
  };
}) {
  const { t } = useLocaleContext();
  const form = useForm<VariableYjs>({
    defaultValues: {
      reset: false,
      scope: 'session',
      key: typeDefaultSetting.name,
      defaultValue: typeDefaultSetting.defaultValue,
      type: typeDefaultSetting.type,
    },
  });

  const dialogState = usePopupState({ variant: 'dialog' });
  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();

  const map: any = useMemo(() => {
    return {
      string: t('text'),
      number: t('number'),
      object: t('object'),
      array: t('array'),
    };
  }, [t]);

  return (
    <>
      <Box>
        <Box display="flex" alignItems="center">
          <Autocomplete
            options={sortVariables(variables)}
            // groupBy={(option) => option.scope || ''}
            getOptionLabel={(option) => `${option.key}`}
            sx={{ width: 1, flex: 1 }}
            renderInput={(params) => <TextField hiddenLabel {...params} />}
            key={Boolean(variable).toString()}
            disableClearable
            clearOnBlur
            selectOnFocus
            handleHomeEndKeys
            autoSelect
            autoHighlight
            getOptionKey={(i) => `${i.scope}_${i.key}`}
            value={variable}
            isOptionEqualToValue={(x, j) => `${x.scope}_${x.key}` === `${j.scope}_${j.key}`}
            renderOption={(props, option) => {
              if (option.key) {
                return (
                  <MenuItem {...props}>
                    <Box className="center">
                      <Typography variant="subtitle2" mb={0} mr={0.5} mt={-0.25} fontWeight={400}>
                        {option.key}
                      </Typography>
                      <Typography fontSize={11} color={(theme) => theme.palette.grey[400]}>
                        {t('variableParameter.tip', {
                          scope: t(`variableParameter.${option?.scope}`),
                          type: option?.type?.type ? map[option?.type?.type || ''] : '-',
                        })}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              }

              return (
                <MenuItem {...props}>
                  <Button
                    size="small"
                    sx={{ width: 1 }}
                    onClick={() => {
                      form.setValue('key', typeDefaultSetting?.name ?? '');
                      form.setValue('defaultValue', typeDefaultSetting?.defaultValue ?? '');
                      form.setValue('type', typeDefaultSetting?.type || { type: 'string', id: nanoid(32) });

                      variable = undefined;
                      dialogState.open();
                    }}>
                    {t('outputVariableParameter.addData')}
                  </Button>
                </MenuItem>
              );
            }}
            filterOptions={(_, params) => {
              const filtered = filter(sortVariables(variables), params);

              const found = filtered.find((x) => !x.key);
              if (!found) {
                filtered.push({ key: '' });
              }

              return filtered;
            }}
            onChange={(_, _value) => {
              if (_value.key) onChange(cloneDeep(_value));
            }}
          />

          {onDelete && (
            <IconButton onClick={onDelete}>
              <Box component={Icon} icon="tabler:trash" color="warning.main" fontSize={16} />
            </IconButton>
          )}
        </Box>

        {variable?.scope && (
          <Box>
            <Box>
              <Typography fontSize={10} color={(theme) => theme.palette.grey[400]}>
                {t('variableParameter.tip', {
                  scope: t(`variableParameter.${variable?.scope}`),
                  type: map[variable?.type?.type || ''],
                })}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={form.handleSubmit((data) => {
          variableYjs.variables ??= [];

          const newVariable = {
            key: data.key || '',
            scope: data.scope,
            type: data.type,
            reset: Boolean(data.reset),
            defaultValue: data.defaultValue,
          };

          variableYjs.variables.push(newVariable);

          onChange(newVariable);
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
              name="type"
              rules={{
                required: t('outputVariableParameter.typeRequired'),
                validate: (value) => {
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
                    <Typography variant="subtitle2">{t('outputVariableParameter.dataType')}</Typography>

                    <Box display="flex" gap={2} alignItems="center">
                      <VariableTypeField
                        disabled={typeDefaultSetting.disabled}
                        key={Boolean(value).toString()}
                        value={value?.type}
                        onChange={(e) => {
                          const type = e.target.value as any;
                          const newValue: any = { type };
                          if (newValue.type === 'array') {
                            newValue.element ??= { id: nanoid(), name: 'element', type: 'string' };
                          }

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
                          <Icon icon="tabler:plus" />
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
    </>
  );
}

function VariableTypeField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField hiddenLabel placeholder={t('type')} select SelectProps={{ autoWidth: true }} {...props}>
      <MenuItem value="string" disabled={props.disabled}>
        {t('text')}
      </MenuItem>
      <MenuItem value="number" disabled={props.disabled}>
        {t('number')}
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
    <Box component="table" sx={{ minWidth: '100%', th: { whiteSpace: 'nowrap' } }} mt={2}>
      <Box component="thead">
        <Box component="tr" sx={{ '>th': { fontSize: 12 } }}>
          <Box component="th">{t('name')}</Box>
          <Box component="th">{t('description')}</Box>
          <Box component="th">{t('type')}</Box>
          <Box component="th">{t('required')}</Box>
          <Box component="th">{t('defaultValue')}</Box>
          <Box component="th">{t('actions')}</Box>
        </Box>
      </Box>

      <Box component="tbody">
        <VariableRow variable={value} depth={0} onChange={onChange} />
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
  depth: number;
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
                multiline
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
            <Stack direction="row" gap={1} justifyContent="flex-end">
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

export default SelectVariable;
