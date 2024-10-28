import ApplicationHeader from '@app/components/application/ApplicationHeader';
import { MultiTenantBrandGuard } from '@app/components/multi-tenant-restriction';
import { RuntimeErrorHandler } from '@app/components/multi-tenant-restriction/runtime-error-handler';
import { getErrorMessage } from '@app/libs/api';
import { MakeYoursButton, ShareButton } from '@app/pages/explore/button';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import { getAgentByDeploymentId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { ScrollView } from '@blocklet/aigne-sdk/components/ai-runtime';
import { Box, CircularProgress, Container, Stack, ThemeProvider } from '@mui/material';
import { useRequest } from 'ahooks';
import { Suspense } from 'react';
import { useParams } from 'react-router-dom';

export default function AppPage() {
  const { appId } = useParams();
  const { t } = useLocaleContext();
  if (!appId) throw new Error('Missing required param `appId`');

  const { data, loading, error, mutate } = useRequest(() =>
    getAgentByDeploymentId({ deploymentId: appId, working: true })
  );

  const isNoSuchEntryAgentError = (error as any)?.response?.data?.error?.type === 'NoSuchEntryAgentError';
  const renderButtons = () => {
    if (!data) return undefined;
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
        <ShareButton deployment={data.deployment} project={data.project} />
        <MakeYoursButton deployment={data.deployment} variant="contained" />
      </Container>
    );
  };

  return (
    <ThemeProvider theme={agentViewTheme}>
      <MultiTenantBrandGuard
        deployment={data?.deployment}
        project={data?.project}
        onRemoveAigneBanner={() =>
          mutate((prev) => ({
            ...prev!,
            deployment: { ...prev!.deployment, aigneBannerVisible: false },
          }))
        }>
        <ScrollView component={Stack} scroll="element" initialScrollBehavior="auto">
          <Suspense fallback={<Loading />}>
            {(data || !loading) && <ApplicationHeader application={data} />}

            {renderButtons()}
            {data?.identity?.aid ? (
              <AgentView aid={data?.identity?.aid}>
                <RuntimeErrorHandler />
              </AgentView>
            ) : loading ? (
              <Loading />
            ) : (
              <Box
                component={Result}
                status={(error as any)?.response?.status || 500}
                title={isNoSuchEntryAgentError ? t('noEntryAgent') : ''}
                description={isNoSuchEntryAgentError ? t('noEntryAgentDescription') : getErrorMessage(error)}
                sx={{ bgcolor: 'transparent' }}
              />
            )}
          </Suspense>
        </ScrollView>
      </MultiTenantBrandGuard>
    </ThemeProvider>
  );
}

function Loading() {
  return (
    <Stack my={10} alignItems="center" justifyContent="center">
      <CircularProgress size={24} />
    </Stack>
  );
}
