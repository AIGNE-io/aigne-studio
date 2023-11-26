import Button from '@arcblock/ux/lib/Button';
import UploadIcon from '@mui/icons-material/Upload';
import { useEffect, useRef, useState } from 'react';

import { PUBLISH_RESOURCE_PATH } from '../../libs/constants';

export default function Exporter() {
  const [showCreateResource, setShowCreateResource] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateResource]);

  return (
    <>
      <Button sx={{ position: 'relative', minWidth: 32, minHeight: 32 }} onClick={() => setShowCreateResource(true)}>
        <UploadIcon />
      </Button>

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
            backgroundColor: 'transparent',
            border: 0,
          }}
        />
      )}
    </>
  );
}
