import ApplicationHeader from '@app/components/application/ApplicationHeader';
import { MultiTenantBrandGuard } from '@app/components/multi-tenant-restriction';
import { getErrorMessage } from '@app/libs/api';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import { getAgentByDeploymentId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Box, CircularProgress, Stack, ThemeProvider } from '@mui/material';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';

import { MakeYoursButton, ShareButton } from './button';

export default function AppPage() {
  const { appId } = useParams();
  const { t } = useLocaleContext();
  if (!appId) throw new Error('Missing required param `appId`');

  const { data, loading, error } = useRequest(() => getAgentByDeploymentId({ deploymentId: appId, working: true }));

  const isNoSuchEntryAgentError = (error as any)?.response?.data?.error?.type === 'NoSuchEntryAgentError';

  return (
    <ThemeProvider theme={agentViewTheme}>
      <MultiTenantBrandGuard deployment={data?.deployment}>
        <ApplicationHeader application={data} />

        {data?.identity?.aid ? (
          <>
            <Stack direction="row" justifyContent="flex-end" gap={1} px={3} my={2}>
              <MakeYoursButton deployment={data.deployment} variant="contained" />
              <ShareButton deployment={data.deployment} project={data.project} />
            </Stack>

            <AgentView aid={data?.identity?.aid} />
          </>
        ) : loading ? (
          <Box textAlign="center" my={10}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box
            component={Result}
            status={(error as any)?.response?.status || 500}
            title={isNoSuchEntryAgentError ? t('noEntryAgent') : ''}
            description={isNoSuchEntryAgentError ? t('noEntryAgentDescription') : getErrorMessage(error)}
            sx={{ bgcolor: 'transparent' }}
          />
        )}
      </MultiTenantBrandGuard>
    </ThemeProvider>
  );
}
