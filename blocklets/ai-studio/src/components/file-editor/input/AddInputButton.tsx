import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import CheckIcon from '@iconify-icons/tabler/check';
import HistoryIcon from '@iconify-icons/tabler/history';
import MessageIcon from '@iconify-icons/tabler/message';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, ButtonProps, Divider, ListItemIcon, ListItemText, MenuItem } from '@mui/material';

import useVariablesEditorOptions from '../use-variables-editor-options';

export default function AddInputButton({
  assistant,
  ButtonProps,
}: {
  assistant: AssistantYjs;
  ButtonProps?: ButtonProps;
}) {
  const { t } = useLocaleContext();
  const { variables, addParameter, removeParameter } = useVariablesEditorOptions(assistant);

  return (
    <PopperMenu
      ButtonProps={{
        startIcon: <Box component={Icon} icon={PlusIcon} sx={{
          fontSize: 16
        }} />,
        children: <Box>{t('input')}</Box>,
        ...ButtonProps,
      }}
      PopperProps={{ placement: 'bottom-start' }}>
      <MenuItem
        selected={variables.includes('question')}
        onClick={(e) => {
          e.stopPropagation();
          if (variables.includes('question')) {
            removeParameter('question');
          } else {
            addParameter('question');
          }
        }}>
        <ListItemIcon>
          <Box component={Icon} icon={MessageIcon} />
        </ListItemIcon>
        <Box sx={{
          flex: 1
        }}>{t('questionInputTitle')}</Box>
        <Box sx={{ width: 40, textAlign: 'right' }}>
          {variables.includes('question') && <Box component={Icon} icon={CheckIcon} />}
        </Box>
      </MenuItem>
      <MenuItem
        selected={variables.includes('chatHistory')}
        onClick={(e) => {
          e.stopPropagation();
          if (variables.includes('chatHistory')) {
            removeParameter('chatHistory');
          } else {
            addParameter('chatHistory', {
              type: 'source',
              source: { variableFrom: 'history', chatHistory: { limit: 50, keyword: '' } },
            });
          }
        }}>
        <ListItemIcon>
          <Box component={Icon} icon={HistoryIcon} />
        </ListItemIcon>
        <Box sx={{
          flex: 1
        }}>{t('history.title')}</Box>
        <Box sx={{ width: 40, textAlign: 'right' }}>
          {variables.includes('chatHistory') && <Box component={Icon} icon={CheckIcon} />}
        </Box>
      </MenuItem>
      <Divider sx={{ my: '4px !important', p: 0 }} />
      <MenuItem
        onClick={() => {
          const id = addParameter('');
          setTimeout(() => {
            document.getElementById(`${id}-key`)?.focus();
          });
        }}>
        <ListItemIcon>
          <Box component={Icon} icon={PlusIcon} />
        </ListItemIcon>
        <ListItemText primary={t('customInput')} />
      </MenuItem>
    </PopperMenu>
  );
}
