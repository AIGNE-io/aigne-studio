import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { SubscriptionErrorType } from '@blocklet/aigne-hub/api';
import { SubscribeErrorAlert } from '@blocklet/aigne-hub/components';
import CloseIcon from '@mui/icons-material/Close';
import { Alert, Button, IconButton, Stack, Typography, alertClasses } from '@mui/material';
import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useAgent } from '../contexts/Agent';
import { useEntryAgent } from '../contexts/EntryAgent';
import { useIsAgentAdmin } from '../hooks/use-agent-admin';
import { settingsDialogState } from './AgentSettings/AgentSettingsDialog';

export function AgentErrorBoundary({ children }: { children?: ReactNode }) {
  return <ErrorBoundary FallbackComponent={AgentErrorView}>{children}</ErrorBoundary>;
}

export function AgentErrorView({
  error,
  fallbackErrorMessage,
  fallbackErrorClosable: closable,
  fallbackErrorOnClose: onClose,
}: {
  error: any;
  fallbackErrorMessage?: string;
  fallbackErrorClosable?: boolean;
  fallbackErrorOnClose?: () => void;
}) {
  if (error.type === 'MissingSecretError') {
    return <MissingSecretErrorView />;
  }

  if (error.type === SubscriptionErrorType.UNSUBSCRIBED) {
    return <SubscribeErrorAlert error={error} />;
  }

  // 隐藏 session#message 的请求超限错误
  if (error.type === 'RequestExceededError') {
    return null;
  }

  const action = closable ? (
    <IconButton aria-label="close" color="inherit" size="small" onClick={onClose}>
      <CloseIcon fontSize="inherit" />
    </IconButton>
  ) : undefined;

  const clickable = (fallbackErrorMessage ?? String(error?.message)).replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return (
    <Alert severity="error" action={action}>
      <Typography dangerouslySetInnerHTML={{ __html: clickable }} />
    </Alert>
  );
}

function MissingSecretErrorView() {
  const { t } = useLocaleContext();
  const agent = useAgent({ aid: useEntryAgent().aid });
  const isAdmin = useIsAgentAdmin(agent);

  const allSecretsHasValue = agent.config.secrets.every((i) => i.hasValue);

  return (
    <Alert severity={allSecretsHasValue ? 'info' : 'error'} sx={{ [`.${alertClasses.message}`]: { flex: 1 } }}>
      <Stack width="100%">
        {allSecretsHasValue
          ? 'Configuration successful, you can continue to use it now!'
          : 'The required configuration is missing. Please complete the setup before proceeding!'}

        {isAdmin && (
          <Stack alignItems="flex-end">
            <Button size="small" variant="outlined" onClick={() => settingsDialogState.getState().open()}>
              {t('setup')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Alert>
  );
}
