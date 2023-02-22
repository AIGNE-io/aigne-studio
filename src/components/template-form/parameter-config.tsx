import { FormControl, FormControlLabel, Grid, MenuItem, Switch, TextField, TextFieldProps } from '@mui/material';
import { ChangeEvent } from 'react';

import type { Parameter, ParameterType } from '.';

export default function ParameterConfig({
  value,
  onChange,
}: {
  value: Parameter;
  onChange: (value: Parameter) => void;
}) {
  const type = value.type ? PARAMETER_SELECT_MAP[value.type](value) : 'text';

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="Type"
          size="small"
          select
          value={type}
          onChange={(e) => onChange({ ...value, ...PARAMETER_SELECT_VALUE_MAP[e.target.value] })}>
          <MenuItem value="text">Short Text</MenuItem>
          <MenuItem value="long-text">Long Text</MenuItem>
          <MenuItem value="number">Number</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={6}>
        <TextField
          fullWidth
          label="Label"
          size="small"
          value={value.label || ''}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Placeholder"
          size="small"
          value={value.placeholder || ''}
          onChange={(e) => onChange({ ...value, placeholder: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Helper"
          size="small"
          value={value.helper || ''}
          onChange={(e) => onChange({ ...value, helper: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl>
          <FormControlLabel
            label="Required"
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
              label="Min Length"
              size="small"
              min={1}
              value={value.minLength ?? ''}
              onChange={(val) => onChange({ ...value, minLength: val })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Max Length"
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
              label="Min"
              size="small"
              value={value.min ?? ''}
              onChange={(min) => onChange({ ...value, min })}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Max"
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

export function NumberField({
  min,
  max,
  default: def,
  onChange,
  ...props
}: { min?: number; max?: number; default?: number; onChange?: (value?: number) => void } & Omit<
  TextFieldProps,
  'onChange'
>) {
  const correctValue = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value.trim();
    if (!value) {
      return def;
    }
    let num = Number(Number(value).toFixed(0));
    if (!Number.isInteger(num)) {
      return def;
    }

    if (typeof min === 'number') {
      num = Math.max(min, num);
    }
    if (typeof max === 'number') {
      num = Math.min(max, num);
    }
    return num;
  };

  return (
    <TextField
      onChange={(e) => onChange?.(correctValue(e))}
      inputProps={{
        type: 'number',
        inputMode: 'numeric',
        pattern: '[0-9]*',
        min,
        max,
        ...props.inputProps,
      }}
      {...props}
    />
  );
}

const PARAMETER_SELECT_MAP: { [key in ParameterType]: (value: Parameter) => string } = {
  number: () => 'number',
  string: (value) => (value.multiline ? 'long-text' : 'text'),
};

const PARAMETER_SELECT_VALUE_MAP: { [key: string]: Parameter } = {
  text: { type: 'string', multiline: false },
  'long-text': { type: 'string', multiline: true },
  number: { type: 'number' },
};
