import { TextField, TextFieldProps } from '@mui/material';

import { NumberParameter } from '../../../types';

const NumberField = (
  {
    ref,
    readOnly,
    parameter,
    ...props
  }
) => {
  return (
    <TextField
      ref={ref}
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
      onChange={(e) => props.onChange?.(Number(e.target.value))}
    />
  );
};

export default NumberField;
