import { unstable_useNumberInput as useNumberInput } from '@mui/base';
import { TextField, TextFieldProps } from '@mui/material';

export default function NumberField({
  NumberProps,
  ...props
}: { NumberProps: Parameters<typeof useNumberInput>[0] } & TextFieldProps) {
  const { getInputProps } = useNumberInput(NumberProps);

  const inputProps = getInputProps();

  return <TextField {...props} inputProps={inputProps} />;
}
