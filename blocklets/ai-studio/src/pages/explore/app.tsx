import ApplicationHeader from '@app/components/application/ApplicationHeader';
import { getErrorMessage } from '@app/libs/api';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { getAgentByDeploymentId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Box, CircularProgress, Stack, ThemeProvider } from '@mui/material';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';

import { MakeYoursButton, ShareButton } from './button';

export default function AppPage() {
  const { appId } = useParams();
  if (!appId) throw new Error('Missing required param `appId`');

  const { data, loading, error } = useRequest(() => getAgentByDeploymentId({ deploymentId: appId, working: true }), {
    onError: (error) => {
      Toast.error(getErrorMessage(error));
    },
  });

  return (
    <ThemeProvider theme={agentViewTheme}>
      <ApplicationHeader application={data} />

      {data?.identity?.aid ? (
        <>
          <Stack direction="row" justifyContent="flex-end" gap={1} px={3} my={2}>
            <MakeYoursButton deployment={data.deployment} variant="contained" />
            <ShareButton deployment={data.deployment} project={data.project} />
          </Stack>

          <AgentView aid={data?.identity?.aid} working />
        </>
      ) : loading ? (
        <Box textAlign="center" my={10}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box
          component={Result}
          status={(error as any)?.response?.status || 500}
          description={error?.message}
          sx={{ bgcolor: 'transparent' }}
        />
      )}
    </ThemeProvider>
  );
}
