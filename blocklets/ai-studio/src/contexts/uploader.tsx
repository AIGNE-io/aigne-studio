import UploadIcon from '@mui/icons-material/Upload';
import { IconButton, IconButtonProps } from '@mui/material';
import { ReactNode, createContext, lazy, useContext, useEffect, useRef } from 'react';

// @ts-ignore
const UploaderComponent = lazy(() => import('@blocklet/uploader/react').then((res) => ({ default: res.Uploader })));

const defaultAllowedFileTypes = ['image/png', 'image/jpeg', 'image/gif'];

interface UploaderProviderProps {
  children: ReactNode;
  apiPathProps?: {
    uploader?: string;
    companion?: string;
    disableMediaKitPrefix?: boolean;
  };
}

export const UploaderContext = createContext(null);

export function useUploader() {
  const uploaderRef = useContext(UploaderContext);

  if (!uploaderRef) {
    throw new Error('useUploader must be used within an UploaderProvider');
  }

  useEffect(() => {
    const uploader = (uploaderRef as any)?.current?.getUploader();
    if (uploader) {
      uploader.onClose(() => {
        if (uploader?.opts?.restrictions?.allowedFileTypes) {
          uploader.opts.restrictions.allowedFileTypes = defaultAllowedFileTypes;
        }
      });
    }
  }, [uploaderRef]);

  return uploaderRef;
}

export function UploaderButton({
  onChange,
  allowedFileTypes = defaultAllowedFileTypes,
  ...props
}: { onChange?: Function; allowedFileTypes?: string[] } & Omit<IconButtonProps, 'onChange'>) {
  const uploaderRef = useUploader();

  const handleOpen = () => {
    // @ts-ignore
    const uploader = uploaderRef?.current?.getUploader();
    if (uploader?.opts?.restrictions?.allowedFileTypes) {
      uploader.opts.restrictions.allowedFileTypes = allowedFileTypes || defaultAllowedFileTypes;
    }

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
      className="upload-button"
      key="uploader-trigger"
      size="small"
      onClick={handleOpen}
      {...props}
      sx={{ borderRadius: 0.5, bgcolor: 'rgba(0, 0, 0, 0.06)', ...props.sx }}>
      <UploadIcon />
    </IconButton>
  );
}

export default function UploaderProvider({ children, ...restProps }: UploaderProviderProps) {
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
        // @ts-ignore
        ref={uploaderRef}
        popup
        onUploadFinish={handleUploadFinish}
        dashboardProps={{
          hideProgressAfterFinish: true,
        }}
        coreProps={{
          restrictions: {
            allowedFileTypes: defaultAllowedFileTypes,
            maxNumberOfFiles: 1,
          },
        }}
        {...restProps}
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
