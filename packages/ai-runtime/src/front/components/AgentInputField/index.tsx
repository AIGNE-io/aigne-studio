import Toast from '@arcblock/ux/lib/Toast';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { IconButton, InputAdornment, Stack, TextFieldProps } from '@mui/material';
import { ComponentType, useRef } from 'react';

import { uploadImage } from '../../../api/ai-runtime/image';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (parameter.type === 'source') return null;

  if (parameter.key === 'datasetId') {
    return null;
  }

  if (parameter.type === 'string' && parameter.image) {
    const handleFiles = async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await uploadImage({ input: formData });
        props.onChange((response.uploads as { url: string })?.url);
      } catch (error) {
        Toast.error(error.message);
      }
    };

    return (
      <StringField
        {...({ parameter } as any)}
        size="small"
        {...props}
        multiline={false}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: -0.75 }}>
              <Stack direction="row" alignItems="center" gap={1}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFiles(file);
                    }
                  }}
                />
                <IconButton onClick={() => fileInputRef.current?.click()}>
                  <AttachFileIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </InputAdornment>
          ),
        }}
      />
    );
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
