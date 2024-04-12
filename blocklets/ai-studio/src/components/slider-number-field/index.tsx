import { Stack, StackProps, TextField } from '@mui/material';
import { ChangeEvent } from 'react';

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
  onChange?: (e: Event | ChangeEvent<HTMLInputElement>, value?: number) => any;
} & Omit<StackProps, 'onChange'>) {
  return (
    <Stack direction="row" alignItems="center" {...props}>
      <Slider
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        sx={{ flex: 1, mr: 2 }}
        value={value}
        onChange={(e, v) => {
          if (!readOnly && !Array.isArray(v)) onChange?.(e, v);
        }}
      />

      <TextField
        disabled={disabled}
        hiddenLabel
        size="small"
        type="number"
        InputProps={{ readOnly, inputProps: { min, max, step } }}
        value={value}
        onChange={(e) => {
          let v = Number(e.target.value);
          if (Number.isNaN(v)) v = 0;
          if (typeof min === 'number') v = Math.max(min, v);
          if (typeof max === 'number') v = Math.min(max, v);

          onChange?.(e as any, v);
        }}
        sx={{ minWidth: 80, border: '1px solid #E5E7EB', borderRadius: 1 }}
      />
    </Stack>
  );
}
