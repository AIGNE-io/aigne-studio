import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { VariableYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Autocomplete, Box, IconButton, MenuItem, TextField, Typography, createFilterOptions } from '@mui/material';
import { cloneDeep } from 'lodash';
import { useMemo } from 'react';

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
  variables,
  variable,
  onChange,
  onDelete,
}: {
  variables: VariableYjs[];
  variable?: VariableYjs;
  onDelete?: () => void;
  onChange: (_value: VariableYjs) => void;
}) {
  const { t } = useLocaleContext();

  const map: any = useMemo(() => {
    return {
      string: t('text'),
      number: t('number'),
      object: t('object'),
      array: t('array'),
    };
  }, [t]);

  return (
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

            return null;
          }}
          filterOptions={(_, params) => {
            const filtered = filter(sortVariables(variables), params);
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
  );
}

export default SelectVariable;
