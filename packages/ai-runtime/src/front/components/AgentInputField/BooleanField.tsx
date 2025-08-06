import { FormControl, FormControlLabel, FormHelperText, Switch, TextFieldProps } from '@mui/material';

import { BooleanParameter } from '../../../types';

const BooleanField = ({
  ref,
  readOnly = undefined,
  parameter = undefined,
  onChange,
  ...props
}: {
  readOnly?: boolean;
  parameter?: BooleanParameter;
  onChange: (value: boolean) => void;
} & Omit<TextFieldProps, 'onChange'>) => {
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
};

export default BooleanField;
