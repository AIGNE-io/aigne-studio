import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CancelIcon from '@mui/icons-material/Cancel';
import { Box, Button, IconButton, InputAdornment, Stack, TextFieldProps } from '@mui/material';
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
  maxFiles = 3,
  parameter,
  ...props
}: {
  maxFiles?: number;
  readOnly?: boolean;
  parameter: Parameter;
  onChange: (value: string | number | undefined | string[]) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocaleContext();

  if (parameter.type === 'source') return null;

  if (parameter.key === 'datasetId') {
    return null;
  }

  if (parameter.type === 'image') {
    const list = (Array.isArray(props.value) ? props.value : [props.value]).filter(Boolean);

    const handleFiles = async (files: File[]) => {
      if (parameter.multiple) {
        if (list.length + files.length > maxFiles) {
          Toast.error(t('maxFilesLimit', { limit: maxFiles }));
          return;
        }
      }

      try {
        const formData = new FormData();
        files.forEach((file) => formData.append('images', file));

        const response = await uploadImage({ input: formData });
        props.onChange(
          parameter.multiple ? [...list, ...(response.uploads || []).map((i) => i.url)] : response.uploads[0]?.url
        );
      } catch (error) {
        Toast.error(error.message);
      }
    };

    return (
      <>
        {!!parameter.multiple && !!list.length && (
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
            {list.map((url, index) => (
              <Box key={url} position="relative" display="flex">
                <img
                  src={url}
                  alt={`Uploaded ${index + 1}`}
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
                <Button
                  size="small"
                  sx={{ position: 'absolute', top: 0, right: 0, minWidth: 'unset', p: 0.5 }}
                  onClick={() => {
                    const newUrls = list.filter((_: any, i: any) => i !== index);
                    props.onChange(newUrls as any);
                  }}>
                  <CancelIcon style={{ color: 'red' }} />
                </Button>
              </Box>
            ))}
          </Stack>
        )}

        <StringField
          {...({ parameter } as any)}
          size="small"
          {...props}
          multiline={false}
          disabled={parameter.multiple}
          value={parameter.multiple ? '' : props.value}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ mr: -0.75 }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    multiple={Boolean(parameter.multiple)}
                    ref={fileInputRef}
                    onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
                  />
                  <IconButton onClick={() => fileInputRef.current?.click()}>
                    <AttachFileIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              </InputAdornment>
            ),
          }}
        />
      </>
    );
  }

  const FIELDS: { [type in NonNullable<Parameter['type']>]?: ComponentType<any> } = {
    number: NumberField,
    string: StringField,
    select: parameter.type === 'select' && parameter.style === 'checkbox' ? RadioField : SelectField,
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
