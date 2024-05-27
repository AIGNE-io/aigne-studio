import { Stack, StackProps } from '@mui/material';
import React from 'react';

import Slider from '../custom/slider';
import NumberField from '../template-form/number-field';

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
  return (
    <Stack direction="row" alignItems="center" {...props}>
      <Slider
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

      <NumberField
        disabled={disabled}
        hiddenLabel
        size="small"
        type="number"
        InputProps={{ readOnly, inputProps: { min, max, step } }}
        sx={{ minWidth: 80, width: 80, border: '1px solid #E5E7EB', borderRadius: 1 }}
        NumberProps={{
          min,
          max,
          step,
          value,
          onChange: (e, v) => {
            onChange?.(e, v);
          },
        }}
      />
    </Stack>
  );
}
