import ApplicationHeader from '@app/components/application/ApplicationHeader';
import { getAgent } from '@app/libs/agent';
import Result from '@arcblock/ux/lib/Result';
import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '@blocklet/ai-runtime/constants';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
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
      <ApplicationHeader application={data && { aid, project: data.project }} />

      {data ? (
        <CustomComponentRenderer componentId={AIGNE_RUNTIME_CUSTOM_COMPONENT_ID} props={{ aid, working: true }} />
      ) : loading ? (
        <Box textAlign="center" my={10}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box component={Result} status={404} sx={{ bgcolor: 'transparent', my: 10 }} />
      )}
    </>
  );
}
