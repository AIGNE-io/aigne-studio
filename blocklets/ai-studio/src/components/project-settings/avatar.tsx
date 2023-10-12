import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Avatar, Box } from '@mui/material';
import { useRef, useState } from 'react';

import useDialog from '../../utils/use-dialog';
import GalleryImageList, { ImperativeImage } from './image-list';

export default function ProjectSettingsAvatar({ value, onChange }: { value: string; onChange: any }) {
  const logoUrl = value || `${window.location.origin}/.well-known/service/static/images/logo.png`;
  const { dialog, showDialog, closeDialog } = useDialog();
  const { t } = useLocaleContext();
  const [selected, onSelected] = useState('');

  const gallery = useRef<ImperativeImage>(null);

  return (
    <>
      <Avatar
        variant="square"
        sx={{ width: 80, height: 80, cursor: 'pointer' }}
        alt="Project Logo"
        src={logoUrl}
        onClick={() => {
          showDialog({
            fullWidth: true,
            maxWidth: 'sm',
            title: t('alert.export'),
            content: (
              <Box height={500} overflow="auto">
                <GalleryImageList
                  ref={gallery}
                  onChange={(...arg) => {
                    closeDialog();
                    onChange(...arg);
                  }}
                  selected={selected}
                  onSelected={(data) => {
                    onSelected(data);
                  }}
                />
              </Box>
            ),
            cancelText: t('alert.cancel'),
            okText: t('alert.export'),
            onOk: () => {},
          });
        }}
      />

      {dialog}
    </>
  );
}
