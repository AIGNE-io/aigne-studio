import { Slider, Stack, StackProps, TextField } from '@mui/material';
import { ChangeEvent } from 'react';

export default function SliderNumberField({
  value,
  min,
  max,
  step,
  onChange,
  ...props
}: {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (e: Event | ChangeEvent<HTMLInputElement>, value?: number) => any;
} & Omit<StackProps, 'onChange'>) {
  return (
    <Stack direction="row" alignItems="center" {...props}>
      <Slider
        min={min}
        max={max}
        step={step}
        sx={{ flex: 1, mr: 2 }}
        value={value}
        onChange={(e, v) => {
          if (!Array.isArray(v)) onChange?.(e, v);
        }}
      />

      <TextField
        hiddenLabel
        size="small"
        type="number"
        inputProps={{ min, max, step }}
        value={value}
        onChange={(e) => {
          let v = Number(e.target.value);
          if (Number.isNaN(v)) v = 0;
          if (typeof min === 'number') v = Math.max(min, v);
          if (typeof max === 'number') v = Math.min(max, v);

          onChange?.(e as any, v);
        }}
        sx={{ width: 60 }}
      />
    </Stack>
  );
}
