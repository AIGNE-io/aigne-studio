import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { MenuItem, Select, TextField } from '@mui/material';
import { useMemo } from 'react';

export default function ParameterConfigType({
  label,
  readOnly,
  value,
  onChange,
  ...props
}: {
  label?: string;
  readOnly?: boolean;
  value: string;
  onChange: (data: string) => void;
  [key: string]: any;
}) {
  const { t } = useLocaleContext();

  const list = useMemo(() => {
    return [
      {
        label: t('form.parameter.typeText'),
        value: 'string',
      },
      {
        label: t('form.parameter.typeTextMultiline'),
        value: 'multiline',
      },
      {
        label: t('form.parameter.typeNumber'),
        value: 'number',
      },
      {
        label: t('form.parameter.typeSelect'),
        value: 'select',
      },
      {
        label: t('form.parameter.typeLanguage'),
        value: 'language',
      },
      {
        label: t('form.parameter.typeHoroscope'),
        value: 'horoscope',
      },
    ];
  }, []);

  if (label) {
    return (
      <TextField
        fullWidth
        label={label}
        size="small"
        select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputProps={{ readOnly }}
        {...props}>
        {list.map((item) => {
          return (
            <MenuItem value={item.value} key={item.value}>
              {item.label}
            </MenuItem>
          );
        })}
      </TextField>
    );
  }

  return (
    <Select
      variant="standard"
      autoWidth
      size="small"
      readOnly={readOnly}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}>
      {list.map((item) => {
        return (
          <MenuItem value={item.value} key={item.value}>
            {item.label}
          </MenuItem>
        );
      })}
    </Select>
  );
}
