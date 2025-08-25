import { Box, alpha } from '@mui/material';

import { getAssetUrl } from '../../api/asset';
import { useComponentPreferences } from '../../contexts/ComponentPreferences';
import { useCurrentAgent } from '../../contexts/CurrentAgent';
import type { SimpleChatPreferences } from '.';

export default function BackgroundImage() {
  const { aid } = useCurrentAgent();
  const preferences = useComponentPreferences<SimpleChatPreferences>();

  if (!preferences?.backgroundImage?.url) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${getAssetUrl({ aid, filename: preferences.backgroundImage?.url })}) !important`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        pointerEvents: 'none',
        zIndex: -1,
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: (theme) => alpha(theme.palette.common.black, 0.12),
          pointerEvents: 'none',
        },
      }}
    />
  );
}
