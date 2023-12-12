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
  const Field = {
    number: NumberField,
    string: StringField,
    select: SelectField,
    language: LanguageField,
  }[parameter.type || 'string'];

  return <Field {...({ parameter } as any)} {...props} />;
}
