import ApplicationHeader from '@app/components/application/ApplicationHeader';
import Result from '@arcblock/ux/lib/Result';
import { getAgent } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Box, CircularProgress } from '@mui/material';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';

export default function PreviewPage() {
  const { aid } = useParams();
  if (!aid) throw new Error('Missing required param `aid`');

  const { data, loading, error } = useRequest(() => getAgent({ aid, working: true }));
  if (error) throw error;

  return (
    <>
      <ApplicationHeader application={data} />
      {data ? (
        <AgentView aid={aid} working />
      ) : loading ? (
        <Box
          sx={{
            textAlign: 'center',
            my: 10,
          }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box component={Result} status={404} sx={{ bgcolor: 'transparent', my: 10 }} />
      )}
    </>
  );
}
