import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Checkbox, FormControl, FormControlLabel, Grid, MenuItem, Switch, TextField } from '@mui/material';

import { Parameter } from '../../../api/src/store/templates';
import NumberField from '../number-field';
import ParameterField from '../parameter-field';
import SelectOptionsConfig from './select-options-config';

export default function ParameterConfig({
  value,
  onChange,
}: {
  value: Parameter;
  onChange: (value: Parameter) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label={t('form.parameter.type')}
          size="small"
          select
          value={value.type ?? 'string'}
          onChange={(e) => onChange({ ...value, type: e.target.value as any })}>
          <MenuItem value="string">{t('form.parameter.typeText')}</MenuItem>
          <MenuItem value="number">{t('form.parameter.typeNumber')}</MenuItem>
          <MenuItem value="select">{t('form.parameter.typeSelect')}</MenuItem>
          <MenuItem value="language">{t('form.parameter.typeLanguage')}</MenuItem>
          <MenuItem value="horoscope">{t('form.parameter.typeHoroscope')}</MenuItem>
        </TextField>
      </Grid>
      {(!value.type || value.type === 'string') && (
        <Grid item xs={6} display="flex" alignItems="center" minHeight="100%" justifyContent="flex-end">
          <FormControlLabel
            label={t('form.parameter.multiline')}
            control={<Checkbox />}
            checked={value.multiline ?? false}
            onChange={(_, multiline) => onChange({ ...value, multiline })}
          />
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.label')}
          size="small"
          value={value.label || ''}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.placeholder')}
          size="small"
          value={value.placeholder || ''}
          onChange={(e) => onChange({ ...value, placeholder: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.parameter.helper')}
          size="small"
          value={value.helper || ''}
          onChange={(e) => onChange({ ...value, helper: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <ParameterField
          parameter={value}
          fullWidth
          label={t('form.parameter.defaultValue')}
          size="small"
          value={value.defaultValue ?? ''}
          onChange={(defaultValue: any) => onChange({ ...value, defaultValue })}
        />
      </Grid>
      {value.type === 'select' && (
        <Grid item xs={12}>
          <SelectOptionsConfig options={value.options} onChange={(options) => onChange({ ...value, options })} />
        </Grid>
      )}
      <Grid item xs={12}>
        <FormControl>
          <FormControlLabel
            label={t('form.parameter.required')}
            control={
              <Switch checked={value.required || false} onChange={(_, required) => onChange({ ...value, required })} />
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
              onChange={(val) => onChange({ ...value, minLength: val })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('form.parameter.maxLength')}
              size="small"
              min={1}
              value={value.maxLength ?? ''}
              onChange={(val) => onChange({ ...value, maxLength: val })}
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
              onChange={(min) => onChange({ ...value, min })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label={t('form.parameter.max')}
              size="small"
              value={value.max ?? ''}
              onChange={(max) => onChange({ ...value, max })}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
}
