import ApplicationHeader from '@app/components/application/ApplicationHeader';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { getAgentByDeploymentId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { loadingButtonClasses } from '@mui/lab';
import { Box, CircularProgress, ThemeProvider, createTheme } from '@mui/material';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';

import { MakeYoursButton } from './button';

const theme = createTheme({
  typography: { button: { textTransform: 'none' } } as any,
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          lineHeight: 1.5,
        },

        contained: {
          backgroundColor: '#030712',
          color: 'white',

          '&:hover': {
            backgroundColor: '#030712',
          },

          [`&.${loadingButtonClasses.loading}`]: {
            color: 'grey',
          },
        },
        outlined: {
          backgroundColor: '#fff',
          color: '#000',
          border: '1px solid #E5E7EB',
          fontSize: '13px',
          fontWeight: 500,
          padding: '5px 12px',

          '&:hover': {
            border: '1px solid #E5E7EB',
          },
        },
      },
    },
  },
});

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
        <Box sx={{ position: 'relative' }}>
          <Box display="flex" gap={1} alignItems="stretch" sx={{ position: 'absolute', top: 10, right: 10 }}>
            <MakeYoursButton deployment={data.deployment} />
            {/* <ShareButton deployment={data.deployment} /> */}
          </Box>

          <AgentView aid={data?.identity?.aid} working />
        </Box>
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
