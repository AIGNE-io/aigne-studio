import { unstable_useNumberInput as useNumberInput } from '@mui/base';
import { TextField, TextFieldProps, useForkRef } from '@mui/material';

const NumberField = ({
  ref,
  NumberProps,
  component: C = TextField,
  ...props
}: {
  NumberProps: Omit<Parameters<typeof useNumberInput>[0], 'onChange'> & {
    onChange?: (
      event: React.FocusEvent<HTMLInputElement> | React.PointerEvent | React.KeyboardEvent,
      value: number | undefined
    ) => void;
  };
} & TextFieldProps) => {
  const { getInputProps } = useNumberInput({
    ...NumberProps,
    onChange: (e, v) => NumberProps.onChange?.(e, v ?? undefined),
  });

  const inputProps = getInputProps();
  inputProps.ref = useForkRef(inputProps.ref, ref);

  return (
    <C
      {...props}
      InputProps={{ ...props.InputProps, inputProps: { ...props.InputProps?.inputProps, ...inputProps } }}
    />
  );
};

export default NumberField;
