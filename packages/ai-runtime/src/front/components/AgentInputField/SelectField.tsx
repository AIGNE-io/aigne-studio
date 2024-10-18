import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';

import { SelectParameter } from '../../../types';

const SelectField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: SelectParameter;
    onChange: (value: string) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  return (
    <TextField
      ref={ref}
      select
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{ ...props.InputProps, readOnly }}
      SelectProps={{
        ...props.SelectProps,
        MenuProps: {
          disableScrollLock: true,
          ...props.SelectProps?.MenuProps,
          sx: {
            ...props.SelectProps?.MenuProps?.sx,
            '.MuiMenuItem-root': {
              whiteSpace: 'pre-wrap',
            },
          },
        },
      }}>
      {parameter?.options?.map((option) => (
        <MenuItem key={option.id} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
});

export default SelectField;
