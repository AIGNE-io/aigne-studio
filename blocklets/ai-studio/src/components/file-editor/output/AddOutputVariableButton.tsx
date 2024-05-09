import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, variableBlockListForAgent } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import CheckIcon from '@iconify-icons/tabler/check';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, Divider, ListItemIcon, MenuItem } from '@mui/material';

import { runtimeOutputVariables } from './type';

export default function AddOutputVariableButton({
  isRouteAssistant,
  assistant,
  onSelect,
}: {
  isRouteAssistant: boolean;
  assistant: AssistantYjs;
  onSelect?: (value: { name: string }) => void;
}) {
  const { t } = useLocaleContext();

  const exists = new Set(Object.values(assistant.outputVariables ?? {}).map((i) => i.data.name));

  return (
    <PopperMenu
      ButtonProps={{
        sx: { mt: 1 },
        startIcon: <Box fontSize={16} component={Icon} icon={PlusIcon} />,
        children: <Box>{t('output')}</Box>,
      }}
      PopperProps={{ placement: 'bottom-start' }}>
      {runtimeOutputVariables.flatMap((group) =>
        group.group === 'system' && isRouteAssistant
          ? []
          : [
              <Divider
                key={`group-${group.group}`}
                textAlign="left"
                sx={{ my: '4px !important', p: 0, fontSize: 13, color: 'text.secondary' }}>
                {t(group.group)}
              </Divider>,

              ...group.outputs.map((variable) => {
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
                      {exists.has(variable.name) && <Box component={Icon} icon={CheckIcon} />}
                    </Box>
                  </MenuItem>
                );
              }),
            ]
      )}

      {isRouteAssistant ? null : (
        <>
          <Divider sx={{ my: '4px !important', p: 0 }} />

          <MenuItem onClick={() => onSelect?.({ name: '' })}>
            <ListItemIcon>
              <Icon icon={PlusIcon} />
            </ListItemIcon>
            {t('customOutput')}
          </MenuItem>
        </>
      )}
    </PopperMenu>
  );
}
