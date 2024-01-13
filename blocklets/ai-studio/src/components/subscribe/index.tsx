import useAiKitServiceStore from '@app/store/ai-kit-service-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { LoadingButtonProps } from '@mui/lab';
import { useCallback, useEffect } from 'react';
import { withQuery } from 'ufo';

import LoadingButton from '../loading/loading-button';

export default function SubscribeButton(props: LoadingButtonProps) {
  const { t } = useLocaleContext();
  const fetchSubscribeStatus = useAiKitServiceStore((i) => i.fetchSubscribeStatus);
  const fetchRegisterStatus = useAiKitServiceStore((i) => i.fetchRegisterStatus);
  const loading = useAiKitServiceStore((i) => i.loading);
  const paymentLink = useAiKitServiceStore((i) => i.appRegisterState?.paymentLink);
  const isSubscriptionAvailable = useAiKitServiceStore((i) => i.computed.isSubscriptionAvailable);

  const linkToAiKit = useCallback(async () => {
    if (paymentLink) {
      const win = window.open(withQuery(paymentLink, { redirect: window.location.href }));
      win?.focus();
    }
  }, [paymentLink]);

  useEffect(() => {
    if (!paymentLink) {
      fetchRegisterStatus();
    }
  }, [fetchRegisterStatus, paymentLink]);

  useEffect(() => {
    fetchSubscribeStatus();
  }, [fetchSubscribeStatus]);

  if (!loading && !isSubscriptionAvailable) {
    return (
      <LoadingButton
        onClick={linkToAiKit}
        size="small"
        key="button"
        variant="outlined"
        color="primary"
        type="button"
        {...props}
        sx={{ mx: 0.5 }}>
        {t('subscribeAIService')}
      </LoadingButton>
    );
  }

  return null;
}
