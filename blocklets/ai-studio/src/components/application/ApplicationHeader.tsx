import { Agent } from '@blocklet/aigne-sdk/api/agent';
import { getAgentProfile } from '@blocklet/aigne-sdk/utils/agent';
import { HeaderWidgetCreator, useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import Header from '@blocklet/ui-react/lib/Header';
import { Avatar, Box, Tooltip } from '@mui/material';
import { useEffect, useMemo } from 'react';

import { PlanUpgradeButton } from '../multi-tenant-restriction';

export default function ApplicationHeader({ application, meta }: { application?: Agent; meta?: any }) {
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
    props.logo = (
      <Tooltip title={profile.name || ''}>
        <Avatar variant="rounded" src={profile.icon} sx={{ width: 'auto', height: '100%' }} />
      </Tooltip>
    );
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
