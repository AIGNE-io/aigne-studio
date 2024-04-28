import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import { ListItemIcon, MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useMemo } from 'react';

export default function ParameterConfigType(props: TextFieldProps) {
  const { t } = useLocaleContext();

  const list = useMemo(() => {
    return [
      {
        icon: <Icon icon="tabler:cursor-text" />,
        label: t('text'),
        value: 'string',
      },
      {
        icon: <Icon icon="tabler:text-wrap" />,
        label: t('multiline'),
        value: 'multiline',
      },
      {
        icon: <Icon icon="tabler:square-number-1" />,
        label: t('number'),
        value: 'number',
      },
      {
        icon: <Icon icon="tabler:list-check" />,
        label: t('select'),
        value: 'select',
      },
      {
        icon: <Icon icon="tabler:language-hiragana" />,
        label: t('language'),
        value: 'language',
      },
    ];
  }, [t]);

  return (
    <TextField {...props} select>
      {list.map((item) => (
        <MenuItem value={item.value} key={item.value}>
          <ListItemIcon>{item.icon}</ListItemIcon>

          {item.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
