import { SubscriptionErrorType } from '@blocklet/aigne-hub/api';
import { SubscribeErrorAlert } from '@blocklet/aigne-hub/components';
import { ErrorRounded } from '@mui/icons-material';
import { Alert } from '@mui/material';
import { memo } from 'react';

interface CustomAlertProps {
  error: { message: string; [key: string]: unknown };
}

function ErrorCard({ error }: CustomAlertProps) {
  if (error?.type === SubscriptionErrorType.UNSUBSCRIBED) {
    return <SubscribeErrorAlert error={error} />;
  }

  return (
    <Alert
      variant="standard"
      icon={<ErrorRounded />}
      color="error"
      sx={{
        display: 'inline-flex',
        px: 1,
        py: 0,
        '.MuiAlert-icon': {
          mr: 0.5,
        },
      }}>
      {error.message}
    </Alert>
  );
}

export default memo(ErrorCard);
