import { MoreVert } from '@mui/icons-material';
import {
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  listItemButtonClasses,
  listItemIconClasses,
} from '@mui/material';
import { bindPopper, bindTrigger } from 'material-ui-popup-state';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { ReactNode } from 'react';

import Popper from '../../components/template-form/popper';

export default function MenuButton({
  menus,
}: {
  menus: { disabled?: boolean; icon?: ReactNode; title: ReactNode; onClick: () => any }[];
}) {
  const popperState = usePopupState({ variant: 'popper', popupId: 'actions-menu' });

  return (
    <>
      <IconButton {...bindTrigger(popperState)}>
        <MoreVert />
      </IconButton>

      <Popper {...bindPopper(popperState)} onClose={popperState.close} placement="bottom-end">
        <Paper sx={{ p: 0.5 }}>
          <List
            disablePadding
            sx={{
              [`.${listItemButtonClasses.root}`]: { borderRadius: 1 },
              [`.${listItemIconClasses.root}`]: { minWidth: 32 },
            }}>
            {menus.map((menu, index) => (
              <ListItemButton key={index} disabled={menu.disabled} onClick={menu.onClick}>
                <ListItemIcon>{menu.icon}</ListItemIcon>

                <ListItemText primary={menu.title} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Popper>
    </>
  );
}
