import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Autocomplete, Box, MenuItem, Stack, TextField, TextFieldProps } from '@mui/material';
import { forwardRef } from 'react';

import { languages } from '../../constant/languages';
import { SelectParameter } from '../../types/assistant';

type Option = {
  ch: string;
  en: string;
  cn: string;
  abbr: string;
  flag: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
};

const filter = (options: Option[], state: { inputValue: string }) => {
  return options.filter((o: Option) => {
    if (state.inputValue) {
      return (
        o.en.toLowerCase().includes(state.inputValue.toLowerCase()) ||
        o.ch.toLowerCase().includes(state.inputValue.toLowerCase())
      );
    }

    return true;
  });
};

const LanguageField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: SelectParameter;
    onChange: (value: string | undefined) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  const value = props?.value ? languages.find((o) => o.en === props.value) : null;
  const { locale } = useLocaleContext();

  return (
    <Autocomplete
      options={languages}
      renderInput={(params) => (
        <TextField
          ref={ref}
          required={parameter?.required}
          label={parameter?.label}
          placeholder={parameter?.placeholder}
          helperText={parameter?.helper}
          {...params}
          {...props}
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
          }}
        />
      )}
      getOptionLabel={(o: Option) => {
        return locale === 'zh' ? o.cn : o.en;
      }}
      getOptionKey={(i) => i.en}
      value={value}
      isOptionEqualToValue={(option, value) => {
        if (value === null) return false;
        return option?.en === value?.en;
      }}
      onChange={(_e, newValue) => {
        onChange?.(newValue?.en);
      }}
      renderOption={(props, option) => {
        return (
          <MenuItem {...props}>
            <Stack direction="row" gap={1}>
              <Box>
                <option.flag />
              </Box>
              <Box>
                {`${option.ch} `}
                {locale === 'zh' ? option.cn : option.en}
              </Box>
              <Box>{`(${option.abbr})`}</Box>
            </Stack>
          </MenuItem>
        );
      }}
      filterOptions={filter}
    />
  );
});

export default LanguageField;
