import { SubscriptionErrorType } from '@blocklet/ai-kit/api';
import { SubscribeButton } from '@blocklet/ai-kit/components';
import { ErrorRounded } from '@mui/icons-material';
import { Alert, Stack } from '@mui/material';
import { memo } from 'react';

interface CustomAlertProps {
  error: { message: string; [key: string]: unknown };
}

function ErrorCard({ error }: CustomAlertProps) {
  if (error?.type === SubscriptionErrorType.UNSUBSCRIBED) {
    return (
      <Alert
        variant="standard"
        icon={<ErrorRounded />}
        color="warning"
        sx={{
          display: 'inline-flex',
          px: 1,
          py: 0,
          '.MuiAlert-icon': {
            mr: 0.5,
          },
        }}>
        {error.message}
        <Stack mt={1} direction="row" sx={{ justifyContent: 'flex-end' }}>
          <SubscribeButton />
        </Stack>
      </Alert>
    );
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
