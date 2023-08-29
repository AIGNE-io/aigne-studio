import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ArrowDropDown, CallSplit, Save } from '@mui/icons-material';
import {
  Button,
  ButtonGroup,
  CircularProgress,
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

import Popper from '../../components/template-form/popper';

export default function SaveButton({
  disabled,
  loading,
  changed,
  onSave,
}: {
  disabled?: boolean;
  loading?: boolean;
  changed?: boolean;
  onSave?: (options?: { newBranch?: boolean }) => any;
}) {
  const { t } = useLocaleContext();

  const popperState = usePopupState({ variant: 'popper', popupId: 'save-button-menu' });

  return (
    <>
      <ButtonGroup variant="contained">
        <Button
          disabled={disabled || loading}
          startIcon={loading ? <CircularProgress size={18} /> : <Save />}
          onClick={() => onSave?.()}>
          {t('form.save')}
        </Button>

        <Button {...bindTrigger(popperState)} sx={{ px: 0 }}>
          <ArrowDropDown />
        </Button>
      </ButtonGroup>

      <Popper {...bindPopper(popperState)} onClose={popperState.close} placement="bottom-end">
        <Paper sx={{ p: 0.5 }}>
          <List
            disablePadding
            sx={{
              [`.${listItemButtonClasses.root}`]: { borderRadius: 1 },
              [`.${listItemIconClasses.root}`]: { minWidth: 32 },
            }}>
            <ListItemButton onClick={() => onSave?.({ newBranch: true })}>
              <ListItemIcon>
                <CallSplit />
              </ListItemIcon>
              <ListItemText primary={changed ? t('alert.saveInNewBranch') : t('alert.newBranch')} />
            </ListItemButton>
          </List>
        </Paper>
      </Popper>
    </>
  );
}
