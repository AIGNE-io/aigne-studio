import type { Deployment } from '@app/libs/deployment';
import { MakeYoursButton, ShareButton } from '@app/pages/explore/button';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ArrowsShuffleIcon from '@iconify-icons/tabler/arrows-shuffle';
import DotsVerticalIcon from '@iconify-icons/tabler/dots-vertical';
import FullscreenExitOutlinedIcon from '@mui/icons-material/FullscreenExitOutlined';
import { Box, BoxProps, Button, Link, MenuItem } from '@mui/material';
import { useState } from 'react';

import AigneLogo from '../aigne-logo';
import PopperMenu from '../menu/PopperMenu';
import { useMultiTenantRestriction } from './state';

interface Props {
  deployment?: Deployment;
  project?: ProjectSettings;
}

export function MultiTenantBrandGuard({ deployment, project, sx, children, ...rest }: Props & BoxProps) {
  const { quotaChecker } = useMultiTenantRestriction();
  const [brandBarRemoved, setBrandBarRemoved] = useState(false);
  const bottomHeight = 64;
  const mergedSx = [
    {
      position: 'relative',
      height: '100%',
      pb: `${bottomHeight}px`,
      bgcolor: '#f0eee6',

      ...(brandBarRemoved && {
        p: 0,
        pb: 0,
      }),
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];

  const removeBrand = () => {
    if (quotaChecker.checkCustomBrand()) {
      setBrandBarRemoved(!brandBarRemoved);
    }
  };

  return (
    <Box sx={mergedSx} {...rest}>
      <Box
        sx={{
          height: '100%',
          border: '#eee solid 16px',
          borderTopColor: 'grey.200',
          borderBottomColor: 'grey.100',

          ...(brandBarRemoved && { borderWidth: 0 }),
        }}>
        <Box
          sx={{
            height: '100%',
            borderRadius: 1.5,
            overflow: 'hidden',
            bgcolor: '#fff',
          }}>
          <Box
            sx={{
              height: '100%',
              overflowY: 'auto',
            }}>
            {children}
          </Box>
        </Box>
      </Box>
      {brandBarRemoved && (
        <>
          <Box
            color="primary"
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              width: 180,
              height: 32,
              px: 1,
              borderRadius: 1,
              bgcolor: 'rgba(0,0,0,0.08)',
            }}>
            <MadeWithAigne />
          </Box>
          <Button
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 16,
              bgcolor: 'rgba(0,0,0,0.08)',
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
            bgcolor: '#f0eee6',
          }}>
          <MadeWithAigne />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {deployment && project && (
              <>
                <MakeYoursButton
                  deployment={deployment}
                  color="primary"
                  variant="contained"
                  startIcon={<Box component={Icon} icon={ArrowsShuffleIcon} sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: 'warning.main',
                    '&:hover': {
                      bgcolor: 'warning.dark',
                    },
                  }}
                />

                <ShareButton deployment={deployment} project={project} />
              </>
            )}
            <PopperMenu
              ButtonProps={{
                sx: { minWidth: 0, p: 0.5, ml: -0.5 },
                children: <Box component={Icon} icon={DotsVerticalIcon} sx={{ fontSize: 16, color: 'text.primary' }} />,
              }}
              PopperProps={{ placement: 'bottom-end' }}>
              <MenuItem onClick={removeBrand}>Remove AIGNE banner</MenuItem>
              <MenuItem component={Link} href="https://www.aigne.io">
                About
              </MenuItem>
            </PopperMenu>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function MadeWithAigne() {
  return (
    <Box
      component="a"
      href="https://www.aigne.io"
      sx={{
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontSize: 14,
        fontWeight: 'bold',
        color: 'text.secondary',
        whiteSpace: 'nowrap',
      }}>
      <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
        Made with
      </Box>
      <Box sx={{ transform: 'scale(0.7) translateX(-25%)' }}>
        <AigneLogo />
      </Box>
    </Box>
  );
}
