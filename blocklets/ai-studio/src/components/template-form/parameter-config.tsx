import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { ParameterYjs, parameterFromYjs } from '@blocklet/ai-runtime/types';
import { FormControl, FormControlLabel, Grid, Switch, TextField } from '@mui/material';

import NumberField from './number-field';
import SelectOptionsConfig from './select-options-config';

export default function ParameterConfig({ readOnly, value }: { readOnly?: boolean; value: ParameterYjs }) {
  const { t } = useLocaleContext();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('helperText')}
          size="small"
          value={value.helper || ''}
          onChange={(e) => (value.helper = e.target.value)}
          InputProps={{ readOnly }}
        />
      </Grid>
      <Grid item xs={12}>
        <ParameterField
          readOnly={readOnly}
          parameter={parameterFromYjs(value)}
          fullWidth
          label={t('defaultValue')}
          size="small"
          value={value.defaultValue ?? ''}
          onChange={(defaultValue: any) => (value.defaultValue = defaultValue)}
        />
      </Grid>
      {value.type === 'select' && (
        <Grid item xs={12}>
          <SelectOptionsConfig readOnly={readOnly} select={value} />
        </Grid>
      )}
      <Grid item xs={12}>
        <FormControl>
          <FormControlLabel
            label={t('required')}
            control={
              <Switch
                checked={value.required || false}
                onChange={(_, required) => !readOnly && (value.required = required)}
              />
            }
          />
        </FormControl>
      </Grid>
      {(!value.type || value.type === 'string') && (
        <>
          <Grid item xs={6}>
            <NumberField
              label={t('minLength')}
              size="small"
              NumberProps={{
                readOnly,
                min: 1,
                value: value.minLength,
                onChange: (_, minLength) => (value.minLength = minLength),
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('maxLength')}
              size="small"
              NumberProps={{
                readOnly,
                min: 1,
                value: value.maxLength,
                onChange: (_, maxLength) => (value.maxLength = maxLength),
              }}
            />
          </Grid>
        </>
      )}
      {value.type === 'number' && (
        <>
          <Grid item xs={6}>
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
          </Grid>
          <Grid item xs={6}>
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
          </Grid>
        </>
      )}
    </Grid>
  );
}
