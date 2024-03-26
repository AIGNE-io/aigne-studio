import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';

import { languages } from '../../constant/languages';
import { SelectParameter } from '../../types/assistant';

const LanguageField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: SelectParameter;
    onChange: (value: string | undefined) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  const { locale } = useLocaleContext();

  return (
    <TextField
      ref={ref}
      required={parameter?.required}
      label={parameter?.label}
      placeholder={parameter?.placeholder}
      helperText={parameter?.helper}
      select
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{ ...props.InputProps, readOnly }}
      sx={{
        ...props.sx,
        '& .MuiSelect-select .notranslate::after': parameter?.placeholder
          ? {
              content: `"${parameter.placeholder}"`,
              opacity: 0.42,
            }
          : {},
        '& .MuiFormLabel-root:not(.MuiInputLabel-shrink) + .MuiInputBase-root > .MuiSelect-select .notranslate::after':
          {
            opacity: 0,
          },
      }}>
      {languages.map((option) => (
        <MenuItem key={option.en} value={option.en}>
          {locale === 'zh' ? option.cn : option.en}
        </MenuItem>
      ))}
    </TextField>
  );
});

export default LanguageField;
