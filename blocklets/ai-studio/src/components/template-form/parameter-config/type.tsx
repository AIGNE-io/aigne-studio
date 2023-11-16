import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useMemo } from 'react';

export default function ParameterConfigType(props: TextFieldProps) {
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
  }, [t]);

  return (
    <TextField {...props} select>
      {list.map((item) => (
        <MenuItem value={item.value} key={item.value}>
          {item.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
