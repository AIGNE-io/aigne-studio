import ApplicationHeader from '@app/components/application/ApplicationHeader';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { getAgentByPublishId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Box, CircularProgress } from '@mui/material';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';

export default function PreviewPage() {
  const { publishId } = useParams();
  if (!publishId) throw new Error('Missing required param `publishId`');

  const { data, loading, error } = useRequest(() => getAgentByPublishId({ publishId, working: true }), {
    onError: (error) => {
      Toast.error((error as any)?.response?.data?.message || error?.message);
    },
  });

  return (
    <>
      <ApplicationHeader application={data} />

      {data?.identity?.aid ? (
        <AgentView aid={data?.identity?.aid} working />
      ) : loading ? (
        <Box textAlign="center" my={10}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box component={Result} status={error ? 500 : 404} sx={{ bgcolor: 'transparent', my: 10 }} />
      )}
    </>
  );
}
