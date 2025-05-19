import { Icon } from '@iconify/react';
import { Box } from '@mui/material';

function ImagePreviewItem({
  url,
  index,
  onRemove,
}: {
  url: string;
  index: number;
  onRemove: (url: string, index: number) => void;
}) {
  return (
    <Box position="relative" display="flex">
      <Box
        component="img"
        src={url}
        alt={`Uploaded ${index + 1}`}
        sx={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 1 }}
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
          border: '1px solid #e0e0e0',
          background: '#fff',
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
            background: '#A0A0A0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& svg > path': { strokeWidth: 3 },
            '&:hover': { background: '#BDBDBD' },
            transition: 'background 0.3s ease',
          }}>
          <Icon icon="tabler:x" color="#fff" width={12} height={12} />
        </Box>
      </Box>
    </Box>
  );
}

export default ImagePreviewItem;
