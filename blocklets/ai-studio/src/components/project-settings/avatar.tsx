import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Avatar, Box } from '@mui/material';
import { useRef } from 'react';

import useDialog from '../../utils/use-dialog';
import GalleryImageList, { ImperativeImage } from './image-list';

export default function ProjectSettingsAvatar({ value, onChange }: { value: string; onChange: any }) {
  const logoUrl = value || `${window.location.origin}/.well-known/service/static/images/logo.png`;
  const { dialog, showDialog, closeDialog } = useDialog();
  const { t } = useLocaleContext();

  const gallery = useRef<ImperativeImage>(null);

  return (
    <>
      <Avatar
        variant="square"
        sx={{ width: 80, height: 80, cursor: 'pointer' }}
        alt="Project Logo"
        src={logoUrl}
        onClick={() => {
          let selected: any;

          showDialog({
            disableEnforceFocus: true,
            fullWidth: true,
            maxWidth: 'sm',
            title: t('projectSetting.icon'),
            content: (
              <Box height={500} overflow="auto">
                <GalleryImageList
                  ref={gallery}
                  onChange={(...arg) => {
                    closeDialog();
                    onChange(...arg);
                  }}
                  onSelected={(data) => {
                    selected = data;
                  }}
                />
              </Box>
            ),
            cancelText: t('alert.cancel'),
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

      {dialog}
    </>
  );
}
