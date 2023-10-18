import { TextField, TextFieldProps } from '@mui/material';
import { ChangeEvent, forwardRef } from 'react';

const NumberField = forwardRef<
  HTMLDivElement,
  {
    min?: number;
    max?: number;
    default?: number;
    onChange?: (value?: number) => void;
    autoCorrectValue?: boolean;
  } & Omit<TextFieldProps, 'onChange'>
>(({ min, max, default: def, onChange, autoCorrectValue = true, ...props }, ref) => {
  const correctValue = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!autoCorrectValue) return e.target.value as any;

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
      ref={ref}
      {...props}
      onChange={(e) => onChange?.(correctValue(e))}
      inputProps={{
        type: 'number',
        inputMode: 'numeric',
        pattern: '[0-9]*',
        min,
        max,
        ...props.inputProps,
      }}
    />
  );
});

export default NumberField;
