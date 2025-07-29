import { FormControl, FormControlLabel, FormHelperText, Switch, TextFieldProps } from '@mui/material';

import { BooleanParameter } from '../../types/assistant';

const BooleanField = (
  {
    ref,
    readOnly,
    parameter,
    onChange,
    ...props
  }
) => {
  return (
    <FormControl>
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
