import { TextField, TextFieldProps } from '@mui/material';
import { ChangeEvent } from 'react';

export default function NumberField({
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
}
