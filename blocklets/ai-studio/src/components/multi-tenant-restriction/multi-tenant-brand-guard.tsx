import type { Deployment } from '@app/libs/deployment';
import { MakeYoursButton } from '@app/pages/explore/button';
import { Icon } from '@iconify-icon/react';
import DotsVerticalIcon from '@iconify-icons/tabler/dots-vertical';
import FullscreenExitOutlinedIcon from '@mui/icons-material/FullscreenExitOutlined';
import { Box, BoxProps, Button, MenuItem } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PopperMenu from '../menu/PopperMenu';
import { useMultiTenantRestriction } from './state';

interface Props {
  deployment?: Deployment;
}

export function MultiTenantBrandGuard({ deployment, sx, children, ...rest }: Props & BoxProps) {
  const { checkMultiTenantRestriction } = useMultiTenantRestriction();
  const [brandBarRemoved, setBrandBarRemoved] = useState(false);
  const navigate = useNavigate();
  const bottomHeight = 64;
  const mergedSx = [
    {
      position: 'relative',
      height: '100%',
      p: 2,
      pb: `${bottomHeight + 16}px`,
      bgcolor: 'grey.100',

      ...(brandBarRemoved && {
        p: 0,
        pb: 0,
      }),
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];

  const removeBrand = () => {
    if (checkMultiTenantRestriction('customBranding')) {
      setBrandBarRemoved(!brandBarRemoved);
    }
  };

  return (
    <Box sx={mergedSx} {...rest}>
      <Box
        sx={{
          height: '100%',
          overflow: 'hidden',
          border: 1,
          borderColor: 'grey.300',
          borderRadius: 1.5,
        }}>
        <Box
          sx={{
            height: '100%',
            overflowY: 'auto',
          }}>
          {children}
        </Box>
      </Box>
      {brandBarRemoved && (
        <>
          <Box
            color="primary"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 16,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              bgcolor: 'rgba(0,0,0,0.15)',
              color: 'grey.50',
            }}>
            Made with AIGNE
          </Box>
          <Button
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.1)',
              color: 'text.secondary',
              minWidth: 0,
            }}
            onClick={removeBrand}>
            <FullscreenExitOutlinedIcon style={{ fontSize: 20 }} />
          </Button>
        </>
      )}
      {!brandBarRemoved && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: bottomHeight,
            p: 2,
            bgcolor: 'grey.200',
          }}>
          <Box sx={{ fontSize: 14, fontWeight: 'medium', color: 'text.secondary' }}>Made with AIGNE</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {deployment && <MakeYoursButton deployment={deployment} color="primary" variant="contained" />}
            <PopperMenu
              ButtonProps={{
                sx: { minWidth: 0, p: 0.5, ml: -0.5 },
                children: <Box component={Icon} icon={DotsVerticalIcon} sx={{ fontSize: 16, color: 'text.primary' }} />,
              }}
              PopperProps={{ placement: 'bottom-end' }}>
              <MenuItem onClick={removeBrand}>Remove branding</MenuItem>
              <MenuItem onClick={() => navigate('/')}>About</MenuItem>
            </PopperMenu>
          </Box>
        </Box>
      )}
    </Box>
  );
}
