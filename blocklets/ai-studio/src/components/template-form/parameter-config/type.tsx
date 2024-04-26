import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useMemo } from 'react';

export default function ParameterConfigType(props: TextFieldProps) {
  const { t } = useLocaleContext();

  const list = useMemo(() => {
    return [
      {
        label: t('text'),
        value: 'string',
      },
      {
        label: t('multiline'),
        value: 'multiline',
      },
      {
        label: t('number'),
        value: 'number',
      },
      {
        label: t('select'),
        value: 'select',
      },
      {
        label: t('language'),
        value: 'language',
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
