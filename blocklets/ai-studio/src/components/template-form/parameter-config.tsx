import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { FormControl, FormControlLabel, Grid, MenuItem, Switch, TextField } from '@mui/material';

import { ParameterYjs, StringParameter } from '../../../api/src/store/templates';
import NumberField from '../number-field';
import ParameterField from '../parameter-field';
import SelectOptionsConfig from './select-options-config';

export default function ParameterConfig({ readOnly, value }: { readOnly?: boolean; value: ParameterYjs }) {
  const { t } = useLocaleContext();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.type')}
          size="small"
          select
          value={(!value.type || value.type === 'string') && value.multiline ? 'multiline' : value.type ?? 'string'}
          onChange={(e) => {
            const newValue = e.target.value as any;

            if (newValue === 'multiline') {
              value.type = 'string';
              (value as StringParameter).multiline = true;
            } else {
              value.type = newValue;
              (value as StringParameter).multiline = false;
            }
          }}
          InputProps={{ readOnly }}>
          <MenuItem value="string">{t('form.parameter.typeText')}</MenuItem>
          <MenuItem value="multiline">{t('form.parameter.multiline')}</MenuItem>
          <MenuItem value="number">{t('form.parameter.typeNumber')}</MenuItem>
          <MenuItem value="select">{t('form.parameter.typeSelect')}</MenuItem>
          <MenuItem value="language">{t('form.parameter.typeLanguage')}</MenuItem>
          <MenuItem value="horoscope">{t('form.parameter.typeHoroscope')}</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.label')}
          size="small"
          value={value.label || ''}
          onChange={(e) => (value.label = e.target.value)}
          InputProps={{ readOnly }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.placeholder')}
          size="small"
          value={value.placeholder || ''}
          onChange={(e) => (value.placeholder = e.target.value)}
          InputProps={{ readOnly }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.helper')}
          size="small"
          value={value.helper || ''}
          onChange={(e) => (value.helper = e.target.value)}
          InputProps={{ readOnly }}
        />
      </Grid>
      <Grid item xs={12}>
        <ParameterField
          readOnly={readOnly}
          parameter={value}
          fullWidth
          label={t('form.parameter.defaultValue')}
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
            label={t('form.parameter.required')}
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
              fullWidth
              label={t('form.parameter.minLength')}
              size="small"
              min={1}
              value={value.minLength ?? ''}
              onChange={(minLength) => (value.minLength = minLength)}
              InputProps={{ readOnly }}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('form.parameter.maxLength')}
              size="small"
              min={1}
              value={value.maxLength ?? ''}
              onChange={(maxLength) => (value.maxLength = maxLength)}
              InputProps={{ readOnly }}
            />
          </Grid>
        </>
      )}
      {value.type === 'number' && (
        <>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('form.parameter.min')}
              size="small"
              value={value.min ?? ''}
              onChange={(min) => (value.min = min)}
              InputProps={{ readOnly }}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('form.parameter.max')}
              size="small"
              value={value.max ?? ''}
              onChange={(max) => (value.max = max)}
              InputProps={{ readOnly }}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
}
