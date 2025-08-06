import { TextField, TextFieldProps } from '@mui/material';
import { pick } from 'lodash';

import { NumberParameter } from '../../types/assistant';

const NumberField = ({
  ref,
  readOnly = undefined,
  parameter = undefined,
  ...props
}: {
  readOnly?: boolean;
  parameter?: NumberParameter;
  onChange: (value: number) => void;
} & Omit<TextFieldProps, 'onChange'>) => {
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
      value={props.value}
      onChange={handleChange}
      slotProps={{
        input: {
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
        },
      }}
    />
  );
};

export default NumberField;
