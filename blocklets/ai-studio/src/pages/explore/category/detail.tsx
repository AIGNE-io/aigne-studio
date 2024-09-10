import { Icon } from '@iconify-icon/react';
import ChevronLeft from '@iconify-icons/tabler/chevron-left';
import { Box, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function CategoryDetail() {
  const navigate = useNavigate();

  return (
    <Box p={2.5}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <IconButton>
          <Box component={Icon} icon={ChevronLeft} onClick={() => navigate(-1)} />
        </IconButton>
      </Box>
    </Box>
  );
}
