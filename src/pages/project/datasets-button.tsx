import { Storage } from '@mui/icons-material';
import { Button, Paper, Typography } from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { ComponentProps } from 'react';

import Datasets from '../../components/template-form/datasets';
import Popper from '../../components/template-form/popper';

export default function DatasetsButton({ ...props }: ComponentProps<typeof Datasets>) {
  const popperState = usePopupState({ variant: 'popper', popupId: 'datasets-button' });

  return (
    <>
      <Button startIcon={<Storage />} {...bindTrigger(popperState)}>
        Datasets
      </Button>

      <Popper sx={{ width: '100%', maxWidth: 'sm' }} {...bindPopper(popperState)} onClose={popperState.close}>
        <Paper elevation={5} sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight="bold">
            Datasets
          </Typography>

          <Datasets {...props} />
        </Paper>
      </Popper>
    </>
  );
}
