import type { Agent } from '@blocklet/aigne-sdk/api/agent';
import { getAgentProfile } from '@blocklet/aigne-sdk/utils/agent';
import type { HeaderWidgetCreator } from '@blocklet/pages-kit/builtin/page/header';
import { useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import Header from '@blocklet/ui-react/lib/Header';
import { Avatar, Box, Tooltip } from '@mui/material';
import { useEffect, useMemo } from 'react';
import { joinURL } from 'ufo';

import { AIGNE_STUDIO_MOUNT_POINT } from '../../libs/constants';
import type { Deployment } from '../../libs/deployment';
import { getProjectIconUrl } from '../../libs/project';
import { PlanUpgradeButton } from '../multi-tenant-restriction';

export default function ApplicationHeader({
  application,
  meta,
}: {
  application?: Agent & { deployment: Deployment };
  meta?: any;
}) {
  const { addons, add: addHeader, delete: deleteHeader } = useHeaderState();

  useEffect(() => {
    const creator: HeaderWidgetCreator = () => ({
      addons: (exists) => [<PlanUpgradeButton />, ...exists],
    });

    addHeader(creator);

    return () => deleteHeader(creator);
  }, []);

  const props: any = {};

  const profile = useMemo(() => application && getAgentProfile(application), [application]);

  if (application && profile) {
    const logoUrl = getProjectIconUrl(application.project.id, {
      blockletDid: application.identity.blockletDid,
      projectRef: application.identity.projectRef,
      updatedAt: application.project.updatedAt,
    });
    props.logo = (
      <Tooltip title={profile.name || ''}>
        <Avatar variant="rounded" src={logoUrl} sx={{ width: 'auto', height: '100%' }} />
      </Tooltip>
    );
  }
  if (application?.deployment?.id) {
    props.homeLink = joinURL(AIGNE_STUDIO_MOUNT_POINT, 'apps', application.deployment.id);
  }

  return (
    <Box
      component={Header}
      {...props}
      meta={meta}
      sx={{ position: 'sticky', top: 0, '.header-container': { maxWidth: '100%' } }}
      addons={addons}
    />
  );
}
