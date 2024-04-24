import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Variable } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Close } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  createFilterOptions,
} from '@mui/material';
import { cloneDeep } from 'lodash';
import { bindDialog } from 'material-ui-popup-state';
import { usePopupState } from 'material-ui-popup-state/hooks';
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

function sortVariables(variables: Variable[]) {
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
  value,
}: {
  projectId: string;
  gitRef: string;
  variables: Variable[];
  variable?: Variable;
  onDelete?: () => void;
  onChange: (_value: Variable) => void;
  value: {
    name: string;
    defaultValue: string;
    dataType: string;
  };
}) {
  const { t } = useLocaleContext();
  const form = useForm<Variable>({
    defaultValues: {
      reset: false,
      scope: 'session',
      key: value.name,
      defaultValue: value.defaultValue,
      dataType: value.dataType ?? 'string',
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
            getOptionKey={(i) => `${i.dataType}_${i.scope}_${i.key}`}
            value={variable}
            isOptionEqualToValue={(x, j) => `${x.dataType}_${x.scope}_${x.key}` === `${j.dataType}_${j.scope}_${j.key}`}
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
                          dataType: map[option?.dataType],
                        })}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              }

              return <MenuItem {...props}>{t('outputVariableParameter.addData')}</MenuItem>;
            }}
            filterOptions={(_, params) => {
              const filtered = filter(sortVariables(variables), params);

              const found = filtered.find((x) => !x.key);
              if (!found) {
                filtered.push({ dataType: variable?.dataType || 'session', key: '' });
              }

              return filtered;
            }}
            onChange={(_, _value) => {
              if (_value.key) {
                onChange(cloneDeep(_value));
              } else {
                form.setValue('key', value?.name ?? '');
                form.setValue('defaultValue', value?.defaultValue ?? '');
                form.setValue('dataType', value?.dataType || 'string');

                dialogState.open();
              }
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
                  dataType: map[variable?.dataType],
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

          const v = {
            key: data.key || '',
            scope: data.scope,
            dataType: data.dataType,
            reset: Boolean(data.reset),
            defaultValue: data.defaultValue,
          };

          variableYjs.variables.push(v);

          onChange(cloneDeep(v));

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
                      `${x.dataType}_${x.scope}_${x.key}` ===
                      `${form.getValues('dataType')}_${form.getValues('scope')}_${value}`
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

            {!value.dataType && (
              <Controller
                control={form.control}
                name="dataType"
                render={({ field, fieldState }) => {
                  return (
                    <Box>
                      <Typography variant="subtitle2">{t('DataType')}</Typography>

                      <TextField
                        hiddenLabel
                        placeholder={t('type')}
                        select
                        SelectProps={{ autoWidth: true }}
                        {...field}>
                        <MenuItem value="string">{t('text')}</MenuItem>
                        <MenuItem value="number">{t('number')}</MenuItem>
                        <MenuItem value="object">{t('object')}</MenuItem>
                        <MenuItem value="array">{t('array')}</MenuItem>
                      </TextField>

                      {Boolean(fieldState.error) && (
                        <Typography variant="subtitle5" color="warning.main">
                          {fieldState.error?.message}
                        </Typography>
                      )}
                    </Box>
                  );
                }}
              />
            )}

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

export default SelectVariable;
