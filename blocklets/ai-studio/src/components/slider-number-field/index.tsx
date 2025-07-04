import { Stack, StackProps, TextField } from '@mui/material';
import React from 'react';

import Slider from '../custom/slider';

export default function SliderNumberField({
  readOnly,
  disabled,
  value,
  min,
  max,
  step,
  onChange,
  ...props
}: {
  readOnly?: boolean;
  disabled?: boolean;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (e: Event | React.SyntheticEvent, value?: number) => any;
} & Omit<StackProps, 'onChange'>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = Number(e.target.value);
    if (min !== undefined && newValue < min) {
      newValue = min;
    }
    if (max !== undefined && newValue > max) {
      newValue = max;
    }
    onChange?.(e, newValue);
  };

  return (
    <Stack
      direction="row"
      {...props}
      sx={[{
        alignItems: "center"
      }, ...(Array.isArray(props.sx) ? props.sx : [props.sx])]}>
      <Slider
        data-testid="slider"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        sx={{ flex: 1, mr: 2 }}
        value={value}
        defaultValue={props.defaultValue as number}
        onChange={(e, v) => {
          if (!readOnly && !Array.isArray(v)) onChange?.(e, v);
        }}
      />
      <TextField
        disabled={disabled}
        hiddenLabel
        size="small"
        type="number"
        sx={{ minWidth: 80, width: 80, border: '1px solid #E5E7EB', borderRadius: 1 }}
        value={value}
        onChange={handleChange}
        slotProps={{
          input: {
            readOnly,
            inputProps: { type: 'number', inputMode: 'decimal', pattern: '[0-9]*[.,]?[0-9]+', min, max, step },
          }
        }}
      />
    </Stack>
  );
}
