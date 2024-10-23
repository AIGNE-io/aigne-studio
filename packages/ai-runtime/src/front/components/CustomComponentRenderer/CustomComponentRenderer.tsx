import { CustomComponentRenderer as CustomComponentRendererOriginal } from '@blocklet/pages-kit/components';
import { cx } from '@emotion/css';
import SettingsIcon from '@iconify-icons/tabler/settings';
import { Icon } from '@iconify/react';
import { Box, Button, Tooltip } from '@mui/material';
import { ComponentProps, useRef } from 'react';

import { parseIdentity } from '../../../common/aid';
import { RuntimeOutputVariable } from '../../../types';
import { useDebug } from '../../contexts/Debug';

export default function CustomComponentRenderer({
  aid,
  output,
  ...props
}: { aid: string; output: { id: string } | { name: RuntimeOutputVariable } } & ComponentProps<
  typeof CustomComponentRendererOriginal
>) {
  const openSettings = useDebug((s) => s.open);
  const selected = useDebug((s) => 'id' in output && output.id === s.outputId);
  const hovered = useDebug((s) => 'id' in output && output.id === s.hoverOutputId);
  const setTabId = useDebug((s) => s.setTabId);
  const buttonRef = useRef<HTMLDivElement>(null);

  if (!openSettings) return <CustomComponentRendererOriginal {...props} />;

  return (
    <Box
      className={cx('ai-runtime-custom-component-renderer', (hovered || selected) && 'selected')}
      sx={{
        position: 'relative',
        '> .settings': { display: 'none' },
        '&.selected,:not(:has(.ai-runtime-custom-component-renderer:hover)):hover': {
          outline: 1,
          outlineColor: 'primary.main',
          outlineOffset: -1,
        },
        ':not(:has(.ai-runtime-custom-component-renderer:hover)):hover': {
          '> .settings': { display: 'block' },
        },
      }}>
      <CustomComponentRendererOriginal {...props} />

      <Box ref={buttonRef} className="settings" sx={{ position: 'absolute', left: 4, top: 4 }}>
        <Tooltip title="Setup component">
          <Button
            onMouseEnter={() => setTabId?.('id' in output ? output.id : output.name)}
            onMouseLeave={() => setTabId?.('')}
            variant="contained"
            sx={{ minWidth: 32, minHeight: 32, p: 0 }}
            onClick={() => openSettings({ agentId: parseIdentity(aid, { rejectWhenError: true }).agentId, output })}>
            <Icon icon={SettingsIcon} fontSize={24} />
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
}
