import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import Wifi from '@iconify-icons/material-symbols/wifi';
import WifiOff from '@iconify-icons/material-symbols/wifi-off';
import { Box, Tooltip } from '@mui/material';
import { useMemo } from 'react';

import { useProjectStore, useWebSocketStatus } from './yjs-state';

type StatusType = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

type ColorMap = {
  [key in StatusType]: {
    color: string;
    backgroundColor: string;
  };
};

function WsStatus({ projectId, gitRef }: { projectId: string; gitRef: string }) {
  const { synced } = useProjectStore(projectId, gitRef, true);
  const status = useWebSocketStatus(projectId, gitRef);
  const { t } = useLocaleContext();

  const currentStatus: StatusType = useMemo(() => {
    if (!synced) {
      if (status === 'CLOSED') return 'CLOSED';

      return 'CONNECTING';
    }

    return status;
  }, [synced, status]);

  const color = useMemo(() => {
    const map: ColorMap = {
      CONNECTING: {
        color: 'common.white',
        backgroundColor: 'grey.500',
      },
      OPEN: {
        color: 'success.contrastText',
        backgroundColor: 'success.light',
      },
      CLOSED: {
        color: 'error.contrastText',
        backgroundColor: 'error.light',
      },
      CLOSING: {
        color: 'common.white',
        backgroundColor: 'grey.500',
      },
    };

    return map[currentStatus] || map.CONNECTING;
  }, [currentStatus]);

  const text = useMemo(() => {
    const map = {
      CONNECTING: `${t('socket.connecting')}...`,
      OPEN: t('socket.connected'),
      CLOSED: t('socket.closed'),
      CLOSING: `${t('socket.closing')}...`,
    };

    return map[currentStatus];
  }, [currentStatus, t]);

  const icon = useMemo(() => {
    const map = {
      CONNECTING: Wifi,
      OPEN: Wifi,
      CLOSED: WifiOff,
      CLOSING: WifiOff,
    };

    return <Box component={Icon} icon={map[currentStatus]} sx={{ color: color.backgroundColor, fontSize: 20 }} />;
  }, [color, currentStatus]);

  return <Tooltip title={text}>{icon}</Tooltip>;
}

export default WsStatus;
