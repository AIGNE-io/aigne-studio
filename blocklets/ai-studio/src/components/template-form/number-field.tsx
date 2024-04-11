import { unstable_useNumberInput as useNumberInput } from '@mui/base';
import { TextField, TextFieldProps } from '@mui/material';

export default function NumberField({
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
} & TextFieldProps) {
  const { getInputProps } = useNumberInput({
    ...NumberProps,
    onChange: (e, v) => NumberProps.onChange?.(e, v ?? undefined),
  });

  const inputProps = getInputProps();

  return <C {...props} inputProps={inputProps} />;
}
