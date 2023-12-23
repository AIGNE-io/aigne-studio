import PromiseLoadingButton from '@app/components/promise-loading-button';
import { appRegister, appStatus } from '@app/libs/ai-kit';
import { CircularProgress, Stack, Typography } from '@mui/material';
import { useCallback } from 'react';
import { useAsync } from 'react-use';

export default function BillingPage() {
  const { value: app, error, loading } = useAsync(() => appStatus(), []);
  if (error) throw error;

  const linkToAiKit = useCallback(async () => {
    const res = await appRegister();
    if (res.paymentLink) {
      window.location.href = res.paymentLink;
    }
  }, []);

  if (loading) {
    return (
      <Stack alignItems="center" py={10}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (app?.subscription?.status === 'active') {
    return (
      <Stack alignItems="center" py={10}>
        <Typography>Subscribed</Typography>
      </Stack>
    );
  }

  return (
    <Stack alignItems="center">
      <PromiseLoadingButton variant="contained" onClick={linkToAiKit}>
        Subscribe
      </PromiseLoadingButton>
    </Stack>
  );
}
