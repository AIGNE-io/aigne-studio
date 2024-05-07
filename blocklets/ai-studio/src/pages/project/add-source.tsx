import { useIsAdmin } from '@app/contexts/session';
import { Icon } from '@iconify-icon/react';
import ArrowUp from '@iconify-icons/tabler/arrow-big-up-line';
import { Box, IconButton, svgIconClasses } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { PUBLISH_RESOURCE_PATH } from '../../libs/constants';

export default function Exporter() {
  const [showCreateResource, setShowCreateResource] = useState(false);
  const isAdmin = useIsAdmin();

  const iframeRef = useRef(null);

  useEffect(() => {
    const listener = (event: any) => {
      if (event?.data?.event === 'resourceDialog.close') {
        setShowCreateResource(false);
      }
    };
    setTimeout(() => {
      if (showCreateResource && iframeRef.current) {
        window.addEventListener('message', listener);
      }
    }, 600);
    return () => {
      window.removeEventListener('message', listener);
    };
  }, [showCreateResource]);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <IconButton
        sx={{
          position: 'relative',
          minWidth: 40,
          minHeight: 40,
          borderRadius: '100%',
          [`.${svgIconClasses.root}`]: {
            color: 'text.secondary',
          },
        }}
        onClick={() => setShowCreateResource(true)}>
        <Box component={Icon} icon={ArrowUp} style={{ fontSize: 24 }} />
      </IconButton>

      {showCreateResource && (
        <iframe
          className="iframe"
          ref={iframeRef}
          src={PUBLISH_RESOURCE_PATH}
          title="Create Resource"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            border: 0,
          }}
        />
      )}
    </>
  );
}
