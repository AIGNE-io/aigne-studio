import { FormControl, FormControlLabel, Grid, MenuItem, Switch, TextField, TextFieldProps } from '@mui/material';
import { useUpdate } from 'ahooks';
import { ChangeEvent } from 'react';

import type { Parameter, ParameterType } from '.';

export default function ParameterConfig({ value }: { value: Parameter }) {
  const update = useUpdate();

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
          onChange={(e) => {
            Object.assign(value, PARAMETER_SELECT_VALUE_MAP[e.target.value]!);
            update();
          }}>
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
          onChange={(e) => {
            value.label = e.target.value;
            update();
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Placeholder"
          size="small"
          value={value.placeholder || ''}
          onChange={(e) => {
            value.placeholder = e.target.value;
            update();
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Helper"
          size="small"
          value={value.helper || ''}
          onChange={(e) => {
            value.helper = e.target.value;
            update();
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControl>
          <FormControlLabel
            label="Required"
            control={
              <Switch
                checked={value.required || false}
                onChange={(_, v) => {
                  value.required = v;
                  update();
                }}
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
              label="Min Length"
              size="small"
              value={value.minLength || ''}
              inputProps={{ type: 'number' }}
              onChange={(val) => {
                value.minLength = val;
                update();
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Max Length"
              size="small"
              value={value.maxLength ?? ''}
              onChange={(val) => {
                value.maxLength = val;
                update();
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
              label="Min"
              size="small"
              value={value.min ?? ''}
              onChange={(val) => {
                value.min = val;
                update();
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <NumberField
              fullWidth
              label="Max"
              size="small"
              value={value.max ?? ''}
              onChange={(val) => {
                value.max = val;
                update();
              }}
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
