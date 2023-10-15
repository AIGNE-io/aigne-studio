import { Avatar } from '@mui/material';

import { useUploader } from '../../contexts/uploader';

export default function ProjectSettingsAvatar({ value, onChange }: { value: string; onChange: any }) {
  const logoUrl = value || `${window.location.origin}/.well-known/service/static/images/logo.png`;

  const uploaderRef = useUploader();

  return (
    <Avatar
      variant="square"
      sx={{ width: 80, height: 80, cursor: 'pointer' }}
      alt="Project Logo"
      src={logoUrl}
      onClick={() => {
        // @ts-ignore
        const uploader = uploaderRef?.current?.getUploader();

        uploader?.open('Uploaded');

        uploader.onceUploadSuccess((args: any) => {
          const url = args.response?.data?.url || args.response?.data?.fileUrl;
          onChange(url);
        });
      }}
    />
  );
}
