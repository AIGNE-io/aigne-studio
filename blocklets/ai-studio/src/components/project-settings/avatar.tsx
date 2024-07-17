import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Avatar, Tooltip } from '@mui/material';
import { useRef } from 'react';

import useDialog from '../../utils/use-dialog';
import GalleryImageList, { ImperativeImage } from './image-list';

export default function ProjectSettingsAvatar({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { t } = useLocaleContext();

  const logoUrl = value || `${window.location.origin}/.well-known/service/static/images/logo.png`;
  const { dialog, showDialog, closeDialog } = useDialog();
  const gallery = useRef<ImperativeImage>(null);

  return (
    <>
      <Tooltip title={t('uploadNewIcon')} disableInteractive placement="top">
        <Avatar
          variant="square"
          sx={{ width: 172, height: 172, cursor: 'pointer', borderRadius: 1 }}
          alt="Project Logo"
          src={logoUrl}
          onClick={() => {
            let selected: any;

            showDialog({
              disableEnforceFocus: true,
              fullWidth: true,
              maxWidth: 'sm',
              title: t('projectSetting.icon'),
              DialogContentProps: { sx: { height: 500, maxHeight: '70vh' } },
              scroll: 'paper',
              content: (
                <GalleryImageList
                  ref={gallery}
                  onChange={(url) => {
                    closeDialog();
                    onChange(url);
                  }}
                  onSelected={(data) => {
                    selected = data;
                  }}
                />
              ),
              cancelText: t('cancel'),
              okText: t('confirm'),
              onOk: () => {
                if (!selected) {
                  Toast.error(t('projectSetting.selectedFail'));
                  throw new Error(t('projectSetting.selectedFail'));
                }

                onChange(selected);
              },
            });
          }}
        />
      </Tooltip>

      {dialog}
    </>
  );
}
