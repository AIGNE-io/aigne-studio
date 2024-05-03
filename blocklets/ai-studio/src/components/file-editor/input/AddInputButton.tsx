import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
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
        startIcon: <Box fontSize={16} component={Icon} icon="tabler:plus" />,
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
          <Box component={Icon} icon="tabler:message" />
        </ListItemIcon>
        <Box flex={1}>{t('questionInputTitle')}</Box>
        <Box sx={{ width: 40, textAlign: 'right' }}>
          {variables.includes('question') && <Box component={Icon} icon="tabler:check" />}
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
          <Box component={Icon} icon="tabler:history" />
        </ListItemIcon>
        <Box flex={1}>{t('history.title')}</Box>
        <Box sx={{ width: 40, textAlign: 'right' }}>
          {variables.includes('chatHistory') && <Box component={Icon} icon="tabler:check" />}
        </Box>
      </MenuItem>

      {/* <MenuItem onClick={() => addParameter('datasetId')}>
			  <ListItemIcon>
				<Box component={Icon} icon="tabler:database" />
			  </ListItemIcon>
			  <ListItemText primary={t('datasetId')} />
			</MenuItem> */}

      <Divider sx={{ my: '4px !important', p: 0 }} />

      <MenuItem
        onClick={() => {
          const id = addParameter('');
          setTimeout(() => {
            document.getElementById(`${id}-key`)?.focus();
          });
        }}>
        <ListItemIcon>
          <Box component={Icon} icon="tabler:plus" />
        </ListItemIcon>
        <ListItemText primary={t('customInput')} />
      </MenuItem>
    </PopperMenu>
  );
}
