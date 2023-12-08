import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import sortBy from 'lodash/sortBy';
import { forwardRef } from 'react';

import {
  NumberParameter,
  Parameter,
  ParameterYjs,
  SelectParameter,
  SelectParameterYjs,
  StringParameter,
} from '../../../api/src/store/templates';
import NumberField from '../number-field';

dayjs.extend(utc);
dayjs.extend(timezone);

export default function ParameterField({
  parameter,
  ...props
}: {
  readOnly?: boolean;
  parameter: ParameterYjs;
  onChange: (value: string | number | undefined) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  const Field = {
    number: NumberParameterField,
    string: StringParameterField,
    select: SelectParameterField,
    language: LanguageParameterField,
  }[parameter.type || 'string'];

  return <Field {...({ parameter } as any)} {...props} />;
}

export function parameterFieldComponent({ type }: { type: ParameterYjs['type'] }) {
  const Field = {
    number: NumberParameterField,
    string: StringParameterField,
    select: SelectParameterField,
    language: LanguageParameterField,
  }[type || 'string'];

  return Field;
}

const StringParameterField = forwardRef<
  HTMLDivElement,
  { readOnly?: boolean; parameter: StringParameter; onChange: (value: string) => void } & Omit<
    TextFieldProps,
    'onChange'
  >
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  return (
    <TextField
      ref={ref}
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      multiline={parameter.multiline}
      minRows={parameter.multiline ? 2 : undefined}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{
        ...props.InputProps,
        inputProps: { ...props.inputProps, maxLength: parameter.maxLength },
        readOnly,
      }}
    />
  );
});

const NumberParameterField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter: NumberParameter;
    onChange: (value: number | undefined) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, ...props }, ref) => {
  return (
    <NumberField
      ref={ref}
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      min={parameter.min}
      max={parameter.max}
      {...props}
      InputProps={{ ...props.InputProps, readOnly }}
    />
  );
});

const SelectParameterField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter: SelectParameterYjs;
    onChange: (value: string | undefined) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  return (
    <TextField
      ref={ref}
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      select
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{ ...props.InputProps, readOnly }}>
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {sortBy(Object.values(parameter.options ?? {}), (i) => i.index).map(({ data: option }) => (
        <MenuItem key={option.id} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
});

const languages = [
  { en: 'English', cn: '英语' },
  { en: 'Simplified Chinese', cn: '中文-简体' },
  { en: 'Traditional Chinese', cn: '中文-繁体' },
  { en: 'Spanish', cn: '西班牙语' },
  { en: 'French', cn: '法语' },
  { en: 'German', cn: '德语' },
  { en: 'Italian', cn: '意大利语' },
  { en: 'Portuguese', cn: '葡萄牙语' },
  { en: 'Japanese', cn: '日语' },
  { en: 'Korean', cn: '韩语' },
  { en: 'Russian', cn: '俄语' },
  { en: 'Polish', cn: '波兰语' },
  { en: 'Arabic', cn: '阿拉伯语' },
  { en: 'Dutch', cn: '荷兰语' },
  { en: 'Swedish', cn: '瑞典语' },
  { en: 'Finnish', cn: '芬兰语' },
  { en: 'Czech', cn: '捷克语' },
  { en: 'Danish', cn: '丹麦语' },
  { en: 'Greek', cn: '希腊语' },
  { en: 'Romanian', cn: '罗马尼亚语' },
  { en: 'Hungarian', cn: '匈牙利语' },
  { en: 'Bulgarian', cn: '保加利亚语' },
  { en: 'Slovak', cn: '斯洛伐克语' },
  { en: 'Norwegian', cn: '挪威语' },
  { en: 'Hebrew', cn: '希伯来语' },
  { en: 'Turkish', cn: '土耳其语' },
  { en: 'Thai', cn: '泰语' },
  { en: 'Indonesian', cn: '印尼语' },
  { en: 'Vietnamese', cn: '越南语' },
  { en: 'Hindi', cn: '印地语' },
];

const LanguageParameterField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter: SelectParameter;
    onChange: (value: string | undefined) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  const { locale } = useLocaleContext();

  return (
    <TextField
      ref={ref}
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      select
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{ ...props.InputProps, readOnly }}>
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {languages.map((option) => (
        <MenuItem key={option.en} value={option.en}>
          {locale === 'zh' ? option.cn : option.en}
        </MenuItem>
      ))}
    </TextField>
  );
});

export function parameterToStringValue(parameter: Parameter): string {
  switch (parameter.type) {
    case undefined:
    case 'string':
    case 'number':
    case 'language':
    case 'select':
      return parameter.value?.toString() ?? '';
    default:
      throw new Error(`Unsupported parameter to string value ${parameter}`);
  }
}
