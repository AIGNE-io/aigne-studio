import { TextField, TextFieldProps } from '@mui/material';
import { pick } from 'lodash';
import { forwardRef } from 'react';

import { NumberParameter } from '../../types/assistant';

const NumberField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: NumberParameter;
    onChange: (value: string) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, ...props }, ref) => {
  return (
    <TextField
      ref={ref}
      helperText={parameter?.helper}
      {...pick(parameter, 'required', 'label', 'placeholder')}
      {...props}
      InputProps={{
        ...props.InputProps,
        readOnly,
        inputProps: {
          type: 'number',
          inputMode: 'numeric',
          pattern: '[0-9]*',
          min: parameter?.min,
          max: parameter?.max,
          ...props.inputProps,
        },
      }}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  );
});

export default NumberField;
