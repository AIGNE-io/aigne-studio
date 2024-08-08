import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Tooltip, styled } from '@mui/material';
import { useMemo } from 'react';

import { useProjectStore } from './yjs-state';

type StatusType = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

type ColorMap = {
  [key in StatusType]: {
    color: string;
    backgroundColor: string;
  };
};

function WsStatus({ projectId, gitRef }: { projectId: string; gitRef: string }) {
  const { synced, status } = useProjectStore(projectId, gitRef, true);
  const { t } = useLocaleContext();

  const currentStatus: StatusType = useMemo(() => {
    if (!synced) {
      return 'CONNECTING';
    }

    return status;
  }, [synced, status]);

  const color = useMemo(() => {
    const map: ColorMap = {
      CONNECTING: {
        color: '#fff',
        backgroundColor: 'warning.light',
      },
      OPEN: {
        color: '#fff',
        backgroundColor: 'success.light',
      },
      CLOSED: {
        color: '#fff',
        backgroundColor: 'error.light',
      },
      CLOSING: {
        color: '#fff',
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

  return (
    <Tooltip title={text}>
      <Status sx={{ backgroundColor: color?.backgroundColor }} />
    </Tooltip>
  );
}

const Status = styled(Box)`
  width: 8px;
  height: 8px;
  border-radius: 100%;
  position: relative;
  cursor: pointer;

  &.loading {
    animation: ball-scale infinite linear 2s;
  }

  @keyframes ball-scale {
    0% {
      transform: scale(0.1);
      opacity: 1;
    }

    100% {
      transform: scale(1.1);
      opacity: 0;
    }
  }
`;

export default WsStatus;
