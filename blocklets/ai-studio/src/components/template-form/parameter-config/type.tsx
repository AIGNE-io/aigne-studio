import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import SwitchIcon from '@iconify-icons/material-symbols/switches';
import CursorTextIcon from '@iconify-icons/tabler/cursor-text';
import DirectionsIcon from '@iconify-icons/tabler/directions';
import HierarchyIcon from '@iconify-icons/tabler/hierarchy';
import JsonIcon from '@iconify-icons/tabler/json';
import LanguageIcon from '@iconify-icons/tabler/language-hiragana';
import ListCheckIcon from '@iconify-icons/tabler/list-check';
import MessagesIcon from '@iconify-icons/tabler/messages';
import ImageIcon from '@iconify-icons/tabler/picture-in-picture-top';
import SquareNumberIcon from '@iconify-icons/tabler/square-number-1';
import TextWrapIcon from '@iconify-icons/tabler/text-wrap';
import { Box, ListItemIcon, MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useMemo } from 'react';

import DIDConnectSvg from '../../../icons/did-connect.svg?url';

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
        icon: <Icon icon={ImageIcon} />,
        label: t('image'),
        value: 'image',
      },
      {
        icon: <Icon icon={SquareNumberIcon} />,
        label: t('number'),
        value: 'number',
      },
      {
        icon: <Icon icon={SwitchIcon} />,
        label: t('boolean'),
        value: 'boolean',
      },
      {
        icon: <Icon icon={ListCheckIcon} />,
        label: t('select'),
        value: 'select',
      },
      {
        icon: (
          <Box
            component="img"
            alt=""
            src={DIDConnectSvg}
            sx={{
              width: 14,
              height: 14,
            }}
          />
        ),
        label: t('verifyVC'),
        value: 'verify_vc',
      },
      {
        icon: <Icon icon={LanguageIcon} />,
        label: t('languageSelect'),
        value: 'language',
      },
      {
        icon: <Icon icon={MessagesIcon} />,
        label: t('llmInputMessages'),
        value: 'llmInputMessages',
      },
      {
        icon: <Icon icon={HierarchyIcon} />,
        label: t('llmInputTools'),
        value: 'llmInputTools',
      },
      {
        icon: <Icon icon={DirectionsIcon} />,
        label: t('llmInputToolChoice'),
        value: 'llmInputToolChoice',
      },
      {
        icon: <Icon icon={JsonIcon} />,
        label: t('llmInputResponseFormat'),
        value: 'llmInputResponseFormat',
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
