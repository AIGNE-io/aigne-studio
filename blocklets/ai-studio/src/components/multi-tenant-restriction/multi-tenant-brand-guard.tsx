import { Deployment, updateAigneBannerVisible } from '@app/libs/deployment';
import { MakeYoursButton, ShareButton } from '@app/pages/explore/button';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ArrowsShuffleIcon from '@iconify-icons/tabler/arrows-shuffle';
import { Close } from '@mui/icons-material';
import { Box, BoxProps, IconButton } from '@mui/material';
import { useEffect, useState } from 'react';

import AigneLogo from '../aigne-logo';
import { premiumPlanEnabled, useMultiTenantRestriction } from './state';

interface Props {
  deployment?: Deployment;
  project?: ProjectSettings;
  onRemoveAigneBanner?: () => void;
}

export function MultiTenantBrandGuard({
  deployment,
  project,
  onRemoveAigneBanner,
  sx,
  children,
  ...rest
}: Props & BoxProps) {
  const { quotaChecker } = useMultiTenantRestriction();
  const [aigneBannerVisible, setAigneBannerVisible] = useState(false);
  const bottomHeight = 64;
  const mergedSx = [
    {
      position: 'relative',
      height: '100%',
      pb: `${bottomHeight}px`,
      bgcolor: '#f0eee6',

      ...(!aigneBannerVisible && {
        p: 0,
        pb: 0,
      }),
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];

  const removeBrand = async () => {
    if (quotaChecker.checkCustomBrand()) {
      await updateAigneBannerVisible(deployment?.id!, false);
      setAigneBannerVisible(false);
      onRemoveAigneBanner?.();
    }
  };

  useEffect(() => {
    if (deployment) {
      setAigneBannerVisible(deployment.aigneBannerVisible ?? true);
    }
  }, [deployment]);

  return (
    <Box sx={mergedSx} {...rest}>
      <Box
        sx={{
          height: '100%',
        }}>
        <Box
          sx={{
            height: '100%',
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
      {aigneBannerVisible && (
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

            <IconButton size="small" onClick={removeBrand}>
              <Close />
            </IconButton>
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
      target="_blank"
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
