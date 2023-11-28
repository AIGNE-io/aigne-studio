import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';

import { SelectParameter } from '../../types/template';

const SelectField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter: SelectParameter;
    onChange: (value: string) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  return (
    <TextField
      ref={ref}
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      select
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{ ...props.InputProps, readOnly }}>
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {parameter.options?.map((option) => (
        <MenuItem key={option.id} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
});

export default SelectField;
