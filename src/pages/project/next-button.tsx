import { Link as LinkIcon } from '@mui/icons-material';
import { Button, Paper, Typography } from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { ComponentProps } from 'react';

import Next from '../../components/template-form/next';
import Popper from '../../components/template-form/popper';

export default function NextButton({ ...props }: ComponentProps<typeof Next>) {
  const popperState = usePopupState({ variant: 'popper', popupId: 'next-button' });

  return (
    <>
      <Button startIcon={<LinkIcon />} {...bindTrigger(popperState)}>
        Next
      </Button>

      <Popper sx={{ width: '100%', maxWidth: 'sm' }} {...bindPopper(popperState)} onClose={popperState.close}>
        <Paper elevation={5} sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight="bold">
            Next
          </Typography>

          <Next {...props} />
        </Paper>
      </Popper>
    </>
  );
}
