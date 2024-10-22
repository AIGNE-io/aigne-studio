import { TextField, TextFieldProps } from '@mui/material';
import { pick } from 'lodash';
import { forwardRef } from 'react';

import { NumberParameter } from '../../types/assistant';

const NumberField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: NumberParameter;
    onChange: (value: number) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = Number(e.target.value);
    if (parameter?.min !== undefined && newValue < parameter?.min) {
      newValue = parameter?.min;
    }
    if (parameter?.max !== undefined && newValue > parameter?.max) {
      newValue = parameter?.max;
    }
    props.onChange?.(newValue);
  };

  return (
    <TextField
      ref={ref}
      type="number"
      helperText={parameter?.helper}
      {...pick(parameter, 'required', 'label', 'placeholder')}
      {...props}
      InputProps={{
        ...props.InputProps,
        readOnly,
        inputProps: {
          type: 'number',
          inputMode: 'decimal',
          pattern: '[0-9]*',
          min: parameter?.min,
          max: parameter?.max,
          ...props.inputProps,
        },
      }}
      value={props.value}
      onChange={handleChange}
    />
  );
});

export default NumberField;
