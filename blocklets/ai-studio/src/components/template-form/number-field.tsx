import { unstable_useNumberInput as useNumberInput } from '@mui/base';
import { TextField, TextFieldProps } from '@mui/material';

export default function NumberField({
  NumberProps,
  ...props
}: {
  NumberProps: Omit<Parameters<typeof useNumberInput>[0], 'onChange'> & {
    onChange?: (
      event: React.FocusEvent<HTMLInputElement> | React.PointerEvent | React.KeyboardEvent,
      value: number | undefined
    ) => void;
  };
} & TextFieldProps) {
  const { getInputProps } = useNumberInput({
    ...NumberProps,
    onChange: (e, v) => NumberProps.onChange?.(e, v ?? undefined),
  });

  const inputProps = getInputProps();

  return <TextField {...props} inputProps={inputProps} />;
}
