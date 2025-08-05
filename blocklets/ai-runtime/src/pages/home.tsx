import ApplicationHeader from '@app/components/application/ApplicationHeader';
import ApplicationListView from '@app/components/application/ApplicationListView';
import { useIsAdmin } from '@app/contexts/session';
import { useResourceBlockletState } from '@app/contexts/use-resource-blocklet-state';
import Result from '@arcblock/ux/lib/Result';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { AddComponent } from '@blocklet/ui-react/lib/ComponentManager';
import { Button as LoadingButton } from '@mui/material';

export default function HomePage() {
  const applications = useResourceBlockletState()?.applications;

  const app = applications?.length === 1 ? applications?.[0] : undefined;

  const isAdmin = useIsAdmin();

  return (
    <>
      <ApplicationHeader application={app} />

      {!applications?.length ? (
        <Result
          status="info"
          title="You haven't installed the agent yet. Install now?"
          extra={
            isAdmin && (
              <AddComponent
                componentDid={window.blocklet.appId}
                resourceDid={AIGNE_STUDIO_COMPONENT_DID}
                resourceType="application"
                autoClose={false}
                render={({ onClick, loading }) => (
                  <LoadingButton onClick={onClick} loading={loading} variant="contained">
                    Install Now
                  </LoadingButton>
                )}
                onClose={() => {}}
                onComplete={() => {
                  window.location.reload();
                }}
              />
            )
          }
          // @ts-ignore
          sx={{ bgcolor: 'transparent', my: 20 }}
        />
      ) : app ? (
        <AgentView aid={app.identity.aid} />
      ) : (
        <ApplicationListView applications={applications} />
      )}
    </>
  );
}
