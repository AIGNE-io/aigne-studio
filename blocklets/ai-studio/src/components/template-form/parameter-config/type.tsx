import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import CursorTextIcon from '@iconify-icons/tabler/cursor-text';
import LanguageIcon from '@iconify-icons/tabler/language-hiragana';
import ListCheckIcon from '@iconify-icons/tabler/list-check';
import SquareNumberIcon from '@iconify-icons/tabler/square-number-1';
import TextWrapIcon from '@iconify-icons/tabler/text-wrap';
import { ListItemIcon, MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useMemo } from 'react';

export default function ParameterConfigType(props: TextFieldProps) {
  const { t } = useLocaleContext();

  const list = useMemo(() => {
    return [
      {
        icon: <Icon icon={CursorTextIcon} />,
        label: t('text'),
        value: 'string',
      },
      {
        icon: <Icon icon={TextWrapIcon} />,
        label: t('multiline'),
        value: 'multiline',
      },
      {
        icon: <Icon icon={SquareNumberIcon} />,
        label: t('number'),
        value: 'number',
      },
      {
        icon: <Icon icon={ListCheckIcon} />,
        label: t('select'),
        value: 'select',
      },
      {
        icon: <Icon icon={LanguageIcon} />,
        label: t('languageSelect'),
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
