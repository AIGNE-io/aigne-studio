import PopperMenu from '@app/components/menu/PopperMenu';
import { Icon } from '@iconify-icon/react';
import { Divider, ListItemIcon, MenuItem } from '@mui/material';

import { runtimeOutputVariables } from './type';

export default function AddOutputVariableButton({ onSelect }: { onSelect?: (value: { name: string }) => void }) {
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
        Custom Variable
      </MenuItem>

      <Divider textAlign="left" sx={{ fontSize: 13 }}>
        Runtime metadata
      </Divider>

      {runtimeOutputVariables.map((variable) => (
        <MenuItem key={variable.name} onClick={() => onSelect?.({ name: variable.name })}>
          <ListItemIcon>{variable.icon}</ListItemIcon>

          {variable.title}
        </MenuItem>
      ))}
    </PopperMenu>
  );
}
