import BaseSwitch from '@app/components/custom/switch';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { ParameterYjs, parameterFromYjs } from '@blocklet/ai-runtime/types';
import { Box, FormControl, FormControlLabel, Stack, TextField, Typography } from '@mui/material';

import NumberField from './number-field';
import SelectOptionsConfig from './select-options-config';

export default function ParameterConfig({ readOnly, value }: { readOnly?: boolean; value: ParameterYjs }) {
  const { t } = useLocaleContext();

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle2">{t('label')}</Typography>

        <TextField
          fullWidth
          placeholder={t('label')}
          hiddenLabel
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
          placeholder={t('placeholder')}
          size="medium"
          value={value.placeholder || ''}
          onChange={(e) => (value.placeholder = e.target.value)}
          InputProps={{ readOnly }}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('defaultValue')}</Typography>

        <ParameterField
          readOnly={readOnly}
          parameter={parameterFromYjs(value)}
          hiddenLabel
          fullWidth
          placeholder={t('defaultValue')}
          size="medium"
          value={value.defaultValue ?? ''}
          onChange={(defaultValue: any) => (value.defaultValue = defaultValue)}
        />
      </Box>

      {value.type === 'select' && (
        <Box>
          <Typography variant="subtitle2">{t('Select Options')}</Typography>
          <SelectOptionsConfig readOnly={readOnly} select={value} />
        </Box>
      )}

      <Box>
        <FormControl>
          <FormControlLabel
            sx={{ display: 'flex', alignItems: 'center' }}
            label={t('required')}
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

      <Box display="flex" alignItems="center" gap={2}>
        {(!value.type || value.type === 'string') && (
          <>
            <Box flex={1}>
              <Typography variant="subtitle2">{t('minLength')}</Typography>

              <NumberField
                hiddenLabel
                placeholder={t('minLength')}
                size="medium"
                NumberProps={{
                  readOnly,
                  min: 1,
                  value: value.minLength,
                  onChange: (_, minLength) => (value.minLength = minLength),
                }}
              />
            </Box>

            <Box flex={1}>
              <Typography variant="subtitle2">{t('maxLength')}</Typography>

              <NumberField
                fullWidth
                hiddenLabel
                placeholder={t('maxLength')}
                size="medium"
                NumberProps={{
                  readOnly,
                  min: 1,
                  value: value.maxLength,
                  onChange: (_, maxLength) => (value.maxLength = maxLength),
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
                fullWidth
                label={t('min')}
                size="small"
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
                fullWidth
                label={t('max')}
                size="small"
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
    </Stack>
  );
}
