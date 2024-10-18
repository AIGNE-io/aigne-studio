import { FormControl, FormControlLabel, FormHelperText, Switch, TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';

import { BooleanParameter } from '../../../types';

const BooleanField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: BooleanParameter;
    onChange: (value: boolean) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  return (
    <FormControl sx={{ alignItems: 'flex-start' }}>
      <FormControlLabel
        ref={ref}
        required={parameter?.required}
        label={props.label || parameter?.label}
        labelPlacement="start"
        control={<Switch readOnly={readOnly} checked={!!props.value} onChange={(_, checked) => onChange(checked)} />}
      />

      {parameter?.helper && <FormHelperText>{parameter?.helper}</FormHelperText>}
    </FormControl>
  );
});

export default BooleanField;
