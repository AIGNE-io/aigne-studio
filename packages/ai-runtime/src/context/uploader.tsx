import { ReactNode, createContext, lazy, useContext, useRef } from 'react';

// @ts-ignore
const UploaderComponent = lazy(() => import('@blocklet/uploader').then((res) => ({ default: res.Uploader })));
const defaultAllowedFileTypes = ['image/png', 'image/jpeg', 'image/gif'];

interface UploaderProviderProps {
  children: ReactNode;
  plugins?: string[];
  dashboardProps?: {
    fileManagerSelectionType?: string;
  };
  restrictions?: {
    allowedFileTypes?: string[];
    maxFileSize?: number;
  };
  apiPathProps?: {
    uploader?: string;
    disableMediaKitPrefix?: boolean;
    disableAutoPrefix?: boolean;
  };
}

export const UploaderContext = createContext<any>(null);

export function useUploader() {
  const uploaderRef = useContext(UploaderContext);

  if (!uploaderRef) {
    throw new Error('useUploader must be used within an UploaderProvider');
  }

  return uploaderRef;
}

export default function UploaderProvider({
  children,
  restrictions,
  plugins,
  dashboardProps,
  apiPathProps,
}: UploaderProviderProps) {
  const uploaderRef = useRef<any>(null);

  const handleUploadFinish = () => {
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
          ...(dashboardProps || {}),
        }}
        coreProps={{
          restrictions: {
            allowedFileTypes: defaultAllowedFileTypes,
            maxNumberOfFiles: 1,
            ...(restrictions || {}),
          },
        }}
        apiPathProps={apiPathProps}
        plugins={plugins}
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
