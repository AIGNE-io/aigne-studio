import { TextFieldProps } from '@mui/material';

import { Parameter } from '../../types/assistant';
import LanguageField from './LanguageField';
import NumberField from './NumberField';
import SelectField from './SelectField';
import StringField from './StringField';

export default function ParameterField({
  parameter,
  ...props
}: {
  readOnly?: boolean;
  parameter: Parameter;
  onChange: (value: string | number | undefined) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  if (parameter.type === 'source') {
    if (parameter.source?.variableFrom === 'secret') {
      return (
        <StringField
          {...({ parameter } as any)}
          size="small"
          {...props}
          InputProps={{ type: 'password', ...props.InputProps }}
        />
      );
    }

    return null;
  }

  const Field = {
    number: NumberField,
    string: StringField,
    select: SelectField,
    language: LanguageField,
    llmInputMessages: StringField,
  }[parameter.type || 'string'];

  if (!Field) return null;

  return (
    <Field
      {...({ parameter } as any)}
      size="small"
      {...props}
      multiline={parameter.type === 'llmInputMessages' ? true : props.multiline}
      minRows={parameter.type === 'llmInputMessages' ? 3 : props.minRows}
    />
  );
}
