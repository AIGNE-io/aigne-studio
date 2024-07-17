import ApplicationHeader from '@app/components/application/ApplicationHeader';
import { useResourceBlockletState } from '@app/contexts/use-resource-blocklet-state';
import Result from '@arcblock/ux/lib/Result';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Box } from '@mui/material';
import { useParams, useSearchParams } from 'react-router-dom';

export default function ApplicationPage() {
  const { aid } = useParams();
  const blockletDid = useSearchParams()[0].get('blockletDid');

  const application = useResourceBlockletState()?.applications.find(
    (i) => i.identity.aid === aid && i.identity.blockletDid === blockletDid
  );

  return (
    <>
      <ApplicationHeader application={application} />

      {application ? (
        <AgentView blockletDid={application.identity.blockletDid} aid={application.identity.aid} />
      ) : (
        <Box component={Result} status={404} sx={{ bgcolor: 'transparent', my: 20 }} />
      )}
    </>
  );
}
