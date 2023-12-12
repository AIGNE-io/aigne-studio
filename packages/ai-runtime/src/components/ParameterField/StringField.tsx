import { TextField, TextFieldProps } from '@mui/material';
import { pick } from 'lodash';
import { forwardRef } from 'react';

import { StringParameter } from '../../types/assistant';

const StringField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: StringParameter;
    onChange: (value: string) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  return (
    <TextField
      ref={ref}
      {...pick(parameter, 'required', 'label', 'placeholder', 'multiline')}
      helperText={parameter?.helper}
      minRows={parameter?.multiline ? 2 : undefined}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{
        ...props.InputProps,
        inputProps: { ...props.inputProps, maxLength: parameter?.maxLength },
        readOnly,
      }}
    />
  );
});

export default StringField;
