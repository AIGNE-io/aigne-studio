import BaseSwitch from '@app/components/custom/switch';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { ParameterYjs, parameterFromYjs } from '@blocklet/ai-runtime/types';
import {
  Autocomplete,
  Box,
  FormControl,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import NumberField from './number-field';
import SelectOptionsConfig from './select-options-config';

export default function ParameterConfig({ readOnly, value }: { readOnly?: boolean; value: ParameterYjs }) {
  const { t } = useLocaleContext();

  const stringValue = !value.type || value.type === 'string' ? (value as typeof value & { type: 'string' }) : undefined;

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle2">{t('name')}</Typography>

        <TextField
          fullWidth
          hiddenLabel
          placeholder={t('inputParameterLabelPlaceholder')}
          size="medium"
          value={value.label || ''}
          onChange={(e) => (value.label = e.target.value)}
          InputProps={{ readOnly }}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('placeholder')}</Typography>

        <TextField
          fullWidth
          hiddenLabel
          placeholder={t('inputParameterPlaceholderPlaceholder')}
          size="medium"
          value={value.placeholder || ''}
          onChange={(e) => (value.placeholder = e.target.value)}
          InputProps={{ readOnly }}
        />
      </Box>

      {value.type === 'select' && (
        <Box>
          <FormControl>
            <FormControlLabel
              sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              labelPlacement="start"
              label={
                <Typography variant="subtitle2" my={0}>
                  {t('multiple')}
                </Typography>
              }
              control={
                <BaseSwitch
                  sx={{ mr: 1, mt: '1px' }}
                  checked={value.multiple || false}
                  onChange={(_, multiple) => !readOnly && (value.multiple = multiple)}
                />
              }
            />
          </FormControl>
        </Box>
      )}

      {value.type !== 'verify_vc' && (
        <Box>
          <Typography variant="subtitle2">{t('defaultValue')}</Typography>

          {value.type === 'boolean' ? (
            <BaseSwitch
              sx={{ mr: 1, mt: '1px' }}
              checked={value.defaultValue || false}
              onChange={(_, required) => !readOnly && (value.defaultValue = required)}
            />
          ) : value.type === 'number' ? (
            <NumberField
              hiddenLabel
              sx={{ width: 1 }}
              fullWidth
              size="medium"
              NumberProps={{
                readOnly,
                value: value.defaultValue,
                onChange: (_, defaultValue) => (value.defaultValue = defaultValue),
              }}
            />
          ) : (
            <ParameterField
              readOnly={readOnly}
              parameter={parameterFromYjs(value)}
              label={undefined}
              hiddenLabel
              fullWidth
              size="medium"
              value={value.defaultValue ?? ''}
              onChange={(defaultValue: any) => (value.defaultValue = defaultValue)}
            />
          )}
        </Box>
      )}

      {value.type === 'verify_vc' && (
        <>
          <Box>
            <Typography variant="subtitle2">{t('vcItem')}</Typography>
            <Autocomplete
              multiple
              freeSolo
              autoSelect
              options={[]}
              renderInput={(params) => <TextField hiddenLabel {...params} />}
              value={value.vcItem ?? []}
              onChange={(_, vcItem) => (value.vcItem = vcItem)}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2">{t('trustedIssuers')}</Typography>
            <Autocomplete
              multiple
              freeSolo
              autoSelect
              options={[]}
              renderInput={(params) => <TextField hiddenLabel {...params} />}
              value={value.vcTrustedIssuers ?? []}
              onChange={(_, vcItem) => (value.vcTrustedIssuers = vcItem)}
            />
          </Box>
        </>
      )}

      {value.type === 'select' && (
        <>
          <Box>
            <Typography variant="subtitle2">{t('options')}</Typography>
            <SelectOptionsConfig readOnly={readOnly} select={value} />
          </Box>

          <Box>
            <Typography variant="subtitle2">{t('style')}</Typography>
            <TextField
              select
              fullWidth
              value={value.style || 'dropdown'}
              onChange={(e) => (value.style = e.target.value as any)}>
              <MenuItem value="dropdown">{t('dropdown')}</MenuItem>
              <MenuItem value="checkbox">{t('checkbox')}</MenuItem>
            </TextField>
          </Box>
        </>
      )}

      <Box display="flex" alignItems="center" gap={2}>
        {stringValue && (
          <>
            <Box flex={1}>
              <Typography variant="subtitle2">{t('minLength')}</Typography>

              <NumberField
                sx={{ width: 1 }}
                fullWidth
                hiddenLabel
                size="medium"
                NumberProps={{
                  readOnly,
                  min: 1,
                  value: stringValue.minLength,
                  onChange: (_, minLength) => (stringValue.minLength = minLength),
                }}
              />
            </Box>

            <Box flex={1}>
              <Typography variant="subtitle2">{t('maxLength')}</Typography>

              <NumberField
                sx={{ width: 1 }}
                fullWidth
                hiddenLabel
                size="medium"
                NumberProps={{
                  readOnly,
                  min: 1,
                  value: stringValue.maxLength,
                  onChange: (_, maxLength) => (stringValue.maxLength = maxLength),
                }}
              />
            </Box>
          </>
        )}
        {value.type === 'number' && (
          <>
            <Box flex={1}>
              <Typography variant="subtitle2">{t('min')}</Typography>

              <NumberField
                hiddenLabel
                sx={{ width: 1 }}
                fullWidth
                size="medium"
                NumberProps={{
                  readOnly,
                  value: value.min,
                  onChange: (_, min) => (value.min = min),
                }}
              />
            </Box>
            <Box flex={1}>
              <Typography variant="subtitle2">{t('max')}</Typography>

              <NumberField
                hiddenLabel
                sx={{ width: 1 }}
                fullWidth
                size="medium"
                NumberProps={{
                  readOnly,
                  value: value.max,
                  onChange: (_, max) => (value.max = max),
                }}
              />
            </Box>
          </>
        )}
      </Box>

      <Box>
        <FormControl>
          <FormControlLabel
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
            labelPlacement="start"
            label={
              <Typography variant="subtitle2" my={0}>
                {t('required')}
              </Typography>
            }
            control={
              <BaseSwitch
                sx={{ mr: 1, mt: '1px' }}
                checked={value.required || false}
                onChange={(_, required) => !readOnly && (value.required = required)}
              />
            }
          />
        </FormControl>
      </Box>
    </Stack>
  );
}
