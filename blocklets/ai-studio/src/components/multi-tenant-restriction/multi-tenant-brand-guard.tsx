import { useIsAdmin, useSessionContext } from '@app/contexts/session';
import type { Deployment } from '@app/libs/deployment';
import type { ProjectSettings } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import InfoSquareIcon from '@iconify-icons/tabler/info-square';
import type { BoxProps } from '@mui/material';
import { Box, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

import { MakeYoursButton } from '../../pages/explore/button';
import AigneLogo from '../aigne-logo';
import { premiumPlanEnabled } from './state';

interface Props {
  deployment?: Deployment;
  project?: ProjectSettings;
}

export function MultiTenantBrandGuard({ deployment, project, sx, children, ...rest }: Props & BoxProps) {
  const [aigneBannerVisible, setAigneBannerVisible] = useState(false);
  const { session } = useSessionContext();
  const isAdmin = useIsAdmin();
  const isDeploymentOwner = session?.user?.did && session.user.did === deployment?.createdBy;
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

  useEffect(() => {
    if (project && premiumPlanEnabled) {
      setAigneBannerVisible(project?.appearance?.aigneBannerVisible ?? true);
    }
  }, [project]);

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
            {deployment && project && <MakeYoursButton deployment={deployment} project={project} />}
            {(isAdmin || isDeploymentOwner) && (
              <Tooltip title="The AIGNE branding banner can be disabled in your project appearance settings (Only available for Premium users)">
                <Box component={Icon} icon={InfoSquareIcon} sx={{ fontSize: 18, color: 'text.secondary' }} />
              </Tooltip>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function MadeWithAigne() {
  return (
    <Tooltip title="Built with AIGNE - Visit aigne.io to create your own AI applications">
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
    </Tooltip>
  );
}
