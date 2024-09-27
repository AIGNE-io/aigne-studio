import { useUploader } from '@app/contexts/uploader';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Avatar, Tooltip } from '@mui/material';

import useDialog from '../../utils/use-dialog';

export default function ProjectSettingsAvatar({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { t } = useLocaleContext();

  const logoUrl = value || `${window.location.origin}/.well-known/service/static/images/logo.png`;
  const { dialog } = useDialog();

  const uploaderRef = useUploader();

  const handleOpen = () => {
    const allowedFileTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const uploader = uploaderRef?.current?.getUploader();
    if (uploader?.opts?.restrictions?.allowedFileTypes) {
      uploader.opts.restrictions.allowedFileTypes = allowedFileTypes;
    }

    uploader?.open();

    if (onChange) {
      // rewrite default emitter
      uploader.onceUploadSuccess(({ response }: any) => {
        const url = response?.data?.url || response?.data?.fileUrl;
        onChange(url);
      });
    }
  };

  return (
    <>
      <Tooltip title={t('uploadNewIcon')} disableInteractive placement="top">
        <Avatar
          variant="square"
          sx={{ width: 172, height: 172, cursor: 'pointer', borderRadius: 1 }}
          alt="Project Logo"
          src={logoUrl}
          onClick={handleOpen}
        />
      </Tooltip>

      {dialog}
    </>
  );
}
