import { useSessionContext } from '@app/contexts/session';
import { getProjectDataUrlInSpace } from '@app/libs/did-spaces';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ReConnect } from '@blocklet/did-space-react/lib/components/SessionConnectTo';
import { SpaceStatus } from '@blocklet/did-space-react/lib/types';
import { Button } from '@mui/material';

import { getErrorMessage } from '../../../libs/api';
import DidSpaces from '../icons/did-spaces';

function GatewayAction({
  spaceStatus,
  refresh,
  projectId,
}: {
  spaceStatus: SpaceStatus;
  refresh: Function;
  projectId: string;
}) {
  const { t } = useLocaleContext();
  const { session } = useSessionContext();

  // 打开 Space URL
  if (spaceStatus === SpaceStatus.CONNECTED) {
    return (
      <Button
        size="small"
        variant="outlined"
        startIcon={<DidSpaces />}
        onClick={async () => {
          try {
            window.open(getProjectDataUrlInSpace(session.user?.didSpace?.endpoint, projectId));
          } catch (error) {
            console.error(error);
            Toast.error(getErrorMessage(error));
          }
        }}>
        {t('viewData')}
      </Button>
    );
  }

  // 重新连接 Space
  if (spaceStatus === SpaceStatus.DISCONNECTED) {
    return (
      <ReConnect
        variant="outlined"
        spaceDid={session.user?.didSpace?.did}
        spaceGatewayUrl={session.user?.didSpace?.url}
        onConnected={async () => {
          session.refresh();
          refresh();
        }}
        onError={(error) => {
          console.error(error);
          Toast.error(getErrorMessage(error));
        }}
      />
    );
  }
  return null;
}

export default GatewayAction;
