import { TextFieldProps } from '@mui/material';

import UploaderProvider from '../../context/uploader';
import { useCurrentAgent } from '../../front';
import VerifyVC from '../../front/components/AgentInputField/VerifyVC';
import { Parameter } from '../../types/assistant';
import BooleanField from './BooleanField';
import ImageFiled from './ImageField';
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
  const aid = useCurrentAgent({ optional: true })?.aid;

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

  if (['llmInputMessages', 'llmInputTools', 'llmInputToolChoice', 'llmInputResponseFormat'].includes(parameter.type!)) {
    return <StringField {...({ parameter } as any)} size="small" {...props} multiline />;
  }

  if (parameter.type === 'image') {
    return (
      <UploaderProvider>
        <ImageFiled {...({ parameter } as any)} size="small" {...props} />
      </UploaderProvider>
    );
  }

  const Field = (
    {
      number: NumberField,
      string: StringField,
      select: SelectField,
      language: LanguageField,
      boolean: BooleanField,
      verify_vc: aid ? VerifyVC : undefined,
    } as any
  )[parameter.key === 'question' ? 'string' : parameter.type || 'string'];

  if (!Field) return null;

  return <Field aid={aid} parameter={parameter} data-testid="parameter-field" {...({ parameter } as any)} {...props} />;
}
