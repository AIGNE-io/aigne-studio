import { TextFieldProps } from '@mui/material';
import { ComponentType } from 'react';

import { Parameter } from '../../../types';
import BooleanField from './BooleanField';
import LanguageField from './LanguageField';
import NumberField from './NumberField';
import RadioField from './RadioField';
import SelectField from './SelectField';
import StringField from './StringField';

export default function AgentInputField({
  parameter,
  ...props
}: {
  readOnly?: boolean;
  parameter: Parameter;
  onChange: (value: string | number | undefined) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  if (parameter.type === 'source') return null;

  if (parameter.key === 'datasetId') {
    return null;
  }

  const FIELDS: { [type in NonNullable<Parameter['type']>]?: ComponentType<any> } = {
    number: NumberField,
    string: StringField,
    select:
      parameter.type === 'select' && parameter.options?.length && parameter.options.length <= 8
        ? RadioField
        : SelectField,
    language: LanguageField,
    boolean: BooleanField,
  };

  const Field = FIELDS[parameter.type || 'string'] || StringField;

  return (
    <Field
      label={parameter?.label}
      helperText={parameter?.helper}
      placeholder={parameter?.placeholder}
      {...({ parameter } as any)}
      size="small"
      {...props}
    />
  );
}
