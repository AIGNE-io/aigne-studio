import { SubscriptionError } from '@blocklet/ai-kit/api';
import { ErrorRounded } from '@mui/icons-material';
import { Alert, Stack } from '@mui/material';
import { memo } from 'react';

import SubscribeButton from '../subsuribe';

interface CustomAlertProps {
  error: { message: string } | SubscriptionError;
}

function ErrorCard({ error }: CustomAlertProps) {
  const isError = error instanceof Error;
  const isSubscriptionError = error instanceof SubscriptionError;

  if (isSubscriptionError) {
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

        {error instanceof SubscriptionError && (
          <Stack mt={1} direction="row" sx={{ justifyContent: 'flex-end' }}>
            <SubscribeButton />
          </Stack>
        )}
      </Alert>
    );
  }

  if (isError) {
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

        {error instanceof SubscriptionError && (
          <Stack mt={1} direction="row" sx={{ justifyContent: 'flex-end' }}>
            <SubscribeButton />
          </Stack>
        )}
      </Alert>
    );
  }

  return null;
}

export default memo(ErrorCard);
