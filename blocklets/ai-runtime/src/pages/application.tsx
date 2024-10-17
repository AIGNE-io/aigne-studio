import ApplicationHeader from '@app/components/application/ApplicationHeader';
import { useResourceBlockletState } from '@app/contexts/use-resource-blocklet-state';
import Result from '@arcblock/ux/lib/Result';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Box } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function ApplicationPage() {
  const { aid } = useParams();

  const application = useResourceBlockletState()?.applications.find((i) => i.identity.aid === aid);

  return (
    <>
      <ApplicationHeader application={application} />

      {application ? (
        <AgentView aid={application.identity.aid} />
      ) : (
        <Box component={Result} status={404} sx={{ bgcolor: 'transparent', my: 20 }} />
      )}
    </>
  );
}
