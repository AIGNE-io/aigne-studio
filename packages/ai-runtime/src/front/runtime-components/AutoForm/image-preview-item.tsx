import ImagePreview from '@blocklet/aigne-hub/components/image-preview';
import { Icon } from '@iconify/react';
import { Box, useTheme } from '@mui/material';

function ImagePreviewItem({
  url,
  index,
  onRemove,
}: {
  url: string;
  index: number;
  onRemove: (url: string, index: number) => void;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
      }}>
      <ImagePreview
        dataSource={[{ src: url, alt: `Uploaded ${index + 1}` }]}
        itemWidth={100}
        itemHeight={100}
        borderRadius={8}
        showDownloadButton={false}
      />
      <Box
        component="button"
        sx={{
          cursor: 'pointer',
          position: 'absolute',
          top: 5,
          right: 5,
          minWidth: 'unset',
          p: 0,
          width: 17,
          height: 17,
          borderRadius: '50%',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => onRemove(url, index)}>
        <Box
          sx={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            bgcolor: 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg > path': { strokeWidth: 3 },
            '&:hover': { bgcolor: 'grey.400' },
            transition: 'background 0.3s ease',
          }}>
          <Icon icon="tabler:x" color={theme.palette.text.primary} width={12} height={12} />
        </Box>
      </Box>
    </Box>
  );
}

export default ImagePreviewItem;
