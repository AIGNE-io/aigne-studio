import UploadIcon from '@mui/icons-material/Upload';
import { IconButton } from '@mui/material';
import { ReactNode, createContext, lazy, useContext, useRef } from 'react';

// @ts-ignore
const UploaderComponent = lazy(() => import('@blocklet/uploader/react').then((res) => ({ default: res.Uploader })));

interface UploaderProviderProps {
  children: ReactNode;
}

export const UploaderContext = createContext(null);

export function useUploader() {
  const uploaderRef = useContext(UploaderContext);
  if (!uploaderRef) {
    throw new Error('useUploader must be used within an UploaderProvider');
  }
  return uploaderRef;
}

export function UploaderButton({ onChange }: { onChange?: Function }) {
  const uploaderRef = useUploader();

  const handleOpen = () => {
    // @ts-ignore
    const uploader = uploaderRef?.current?.getUploader();

    uploader?.open();

    if (onChange) {
      // rewrite default emitter
      uploader.onceUploadSuccess((...args: any) => {
        onChange(...args);
      });
    }
  };

  return (
    <IconButton
      key="uploader-trigger"
      size="small"
      onClick={handleOpen}
      sx={{ borderRadius: 0.5, bgcolor: 'rgba(0, 0, 0, 0.06)' }}>
      <UploadIcon />
    </IconButton>
  );
}

export default function UploaderProvider({ children }: UploaderProviderProps) {
  const uploaderRef = useRef(null);

  const handleUploadFinish = () => {
    // @ts-ignore
    const uploader = uploaderRef?.current?.getUploader();

    uploader.close();
  };

  return (
    <UploaderContext.Provider value={uploaderRef as any}>
      {children}
      <UploaderComponent
        key="uploader"
        ref={uploaderRef}
        popup
        onUploadFinish={handleUploadFinish}
        dashboardProps={{
          hideProgressAfterFinish: true,
        }}
        coreProps={{
          restrictions: {
            allowedFileTypes: [
              'image/png',
              'image/jpeg',
              'image/gif',
              'image/webp',
              'image/svg+xml',
              'video/mp4',
              'video/webm',
            ],
            maxNumberOfFiles: 1,
          },
        }}
      />
    </UploaderContext.Provider>
  );
}
