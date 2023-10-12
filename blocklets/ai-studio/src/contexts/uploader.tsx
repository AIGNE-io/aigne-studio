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

    setTimeout(() => {
      // reset uploader state
      uploader.setState({ files: {}, currentUploads: {} });
    }, 200);
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

export function getVideoSize(url: string) {
  return new Promise<{ naturalWidth: number; naturalHeight: number }>((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url;
    video.onloadedmetadata = () => {
      const { videoWidth: naturalWidth, videoHeight: naturalHeight } = video;
      resolve({ naturalWidth, naturalHeight });
    };
    video.onerror = (e) => reject(e);
  });
}

export function getImageSize(url: string) {
  return new Promise<{ naturalWidth: number; naturalHeight: number }>((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const { naturalWidth, naturalHeight } = img;
      resolve({ naturalWidth, naturalHeight });
    };
    img.onerror = (e) => reject(e);
  });
}
