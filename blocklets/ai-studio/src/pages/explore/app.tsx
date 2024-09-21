import ApplicationHeader from '@app/components/application/ApplicationHeader';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { getAgentByDeploymentId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Box, CircularProgress, ThemeProvider, createTheme } from '@mui/material';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';

const theme = createTheme({ typography: { button: { textTransform: 'none' } } });

export default function AppPage() {
  const { appId } = useParams();
  if (!appId) throw new Error('Missing required param `appId`');

  const { data, loading, error } = useRequest(() => getAgentByDeploymentId({ deploymentId: appId, working: true }), {
    onError: (error) => {
      Toast.error((error as any)?.response?.data?.message || error?.message);
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <ApplicationHeader application={data} />

      {data?.identity?.aid ? (
        <AgentView aid={data?.identity?.aid} working />
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
