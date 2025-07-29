import { SubscriptionErrorType } from '@blocklet/aigne-hub/api';
import { SubscribeErrorAlert } from '@blocklet/aigne-hub/components';
import { ErrorRounded } from '@mui/icons-material';
import { Alert, Typography } from '@mui/material';
import { memo } from 'react';

interface CustomAlertProps {
  error: { message: string; [key: string]: unknown };
}

function ErrorCard({ error }: CustomAlertProps) {
  if (error?.type === SubscriptionErrorType.UNSUBSCRIBED) {
    return <SubscribeErrorAlert error={error} />;
  }

  const clickable = error.message.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
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
      <Typography dangerouslySetInnerHTML={{ __html: clickable }} />
    </Alert>
  );
}

export default memo(ErrorCard);
