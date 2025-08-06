import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { VariableYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import TrashIcon from '@iconify-icons/tabler/trash';
import { Autocomplete, Box, IconButton, MenuItem, TextField, Typography, createFilterOptions } from '@mui/material';
import { cloneDeep } from 'lodash';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  placeholder = undefined,
  variables,
  variable = undefined,
  onChange,
  onDelete = undefined,
}: {
  placeholder?: string;
  variables: VariableYjs[];
  variable?: VariableYjs;
  onDelete?: () => void;
  onChange: (_value: VariableYjs) => void;
}) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { projectId, ref: gitRef } = useParams();
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
          renderInput={(params) => (
            <TextField data-testid="select-memory-input" hiddenLabel {...params} placeholder={placeholder} />
          )}
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
                <MenuItem {...props} key={`${option.scope}_${option.key}`}>
                  <Box className="center">
                    <Typography variant="subtitle2" mb={0} mr={0.5} mt={-0.25} fontWeight={400}>
                      {option.key}
                    </Typography>
                    <Typography
                      fontSize={11}
                      sx={{
                        color: (theme) => theme.palette.grey[400],
                      }}>
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
              <MenuItem onClick={() => navigate(`/projects/${projectId}/variables/${gitRef}`)}>
                <Box sx={{ cursor: 'pointer' }}>{t('newObject', { object: t('memory.title') })}</Box>
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
            <Box component={Icon} icon={TrashIcon} color="warning.main" fontSize={16} />
          </IconButton>
        )}
      </Box>

      {variable?.scope && (
        <Box>
          <Box>
            <Typography
              fontSize={10}
              sx={{
                color: (theme) => theme.palette.grey[400],
              }}>
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
