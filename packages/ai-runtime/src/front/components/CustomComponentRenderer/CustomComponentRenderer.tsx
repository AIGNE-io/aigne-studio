import { CustomComponentRenderer as CustomComponentRendererOriginal } from '@blocklet/pages-kit/components';
import SettingsIcon from '@iconify-icons/tabler/settings';
import { Icon } from '@iconify/react';
import { Box, Button, Tooltip } from '@mui/material';
import { ComponentProps } from 'react';

import { RuntimeOutputVariable } from '../../../types';
import { useAIGNEApi } from '../../contexts/Api';

export default function CustomComponentRenderer({
  aid,
  output,
  ...props
}: { aid: string; output: { id: string } | { name: RuntimeOutputVariable } } & ComponentProps<
  typeof CustomComponentRendererOriginal
>) {
  const { openOutputSettings } = useAIGNEApi();

  if (!openOutputSettings) return <CustomComponentRendererOriginal {...props} />;

  return (
    <Box
      className="ai-runtime-custom-component-renderer"
      sx={{
        position: 'relative',
        '> .settings': { display: 'none' },
        ':not(:has(.ai-runtime-custom-component-renderer:hover)):hover': {
          outline: 1,
          outlineColor: 'primary.main',
          outlineOffset: -1,
          '> .settings': { display: 'block' },
        },
      }}>
      <CustomComponentRendererOriginal {...props} />

      <Box className="settings" sx={{ position: 'absolute', left: 4, top: 4 }}>
        <Tooltip title="Setup component">
          <Button
            variant="contained"
            sx={{ minWidth: 32, minHeight: 32, p: 0 }}
            onClick={(e) => openOutputSettings({ e, aid, output })}>
            <Icon icon={SettingsIcon} fontSize={24} />
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
}
