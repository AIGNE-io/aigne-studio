import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, variableBlockListForAgent } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Box, Divider, ListItemIcon, MenuItem } from '@mui/material';

import { runtimeOutputVariables } from './type';

export default function AddOutputVariableButton({
  assistant,
  onSelect,
}: {
  assistant: AssistantYjs;
  onSelect?: (value: { name: string }) => void;
}) {
  const { t } = useLocaleContext();

  const exists = new Set(Object.values(assistant.outputVariables ?? {}).map((i) => i.data.name));

  return (
    <PopperMenu
      ButtonProps={{
        sx: { minWidth: 32, minHeight: 32, p: 0 },
        children: <Icon icon="tabler:plus" />,
      }}>
      <MenuItem onClick={() => onSelect?.({ name: '' })}>
        <ListItemIcon>
          <Icon icon="tabler:plus" />
        </ListItemIcon>
        {t('custom')}
      </MenuItem>

      <Divider />

      {runtimeOutputVariables.map((variable) => {
        const blockList = variableBlockListForAgent[assistant.type];
        if (blockList?.allow && !blockList.allow.has(variable.name)) return null;
        if (blockList?.block && blockList.block.has(variable.name)) return null;

        return (
          <MenuItem
            key={variable.name}
            selected={exists.has(variable.name)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.({ name: variable.name });
            }}>
            <ListItemIcon>{variable.icon}</ListItemIcon>

            <Box flex={1}>{t(variable.i18nKey)}</Box>

            <Box sx={{ width: 40, textAlign: 'right' }}>
              {exists.has(variable.name) && <Box component={Icon} icon="tabler:check" />}
            </Box>
          </MenuItem>
        );
      })}
    </PopperMenu>
  );
}
