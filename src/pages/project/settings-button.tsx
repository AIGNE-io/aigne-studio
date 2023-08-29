import { Settings } from '@mui/icons-material';
import { Button, Paper, Typography } from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { ComponentProps } from 'react';

import Popper from '../../components/template-form/popper';
import TemplateSettings from '../../components/template-form/template-settings';

export default function SettingsButton({ ...props }: ComponentProps<typeof TemplateSettings>) {
  const popperState = usePopupState({ variant: 'popper', popupId: 'settings-button' });

  return (
    <>
      <Button startIcon={<Settings />} {...bindTrigger(popperState)}>
        Settings
      </Button>

      <Popper sx={{ width: '100%', maxWidth: 'sm' }} {...bindPopper(popperState)} onClose={popperState.close}>
        <Paper elevation={5} sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight="bold">
            Settings
          </Typography>

          <TemplateSettings {...props} />
        </Paper>
      </Popper>
    </>
  );
}
