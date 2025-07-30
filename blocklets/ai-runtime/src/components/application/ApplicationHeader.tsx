import DID from '@arcblock/ux/lib/DID';
import { Agent } from '@blocklet/aigne-sdk/api/agent';
import { getAgentProfile } from '@blocklet/aigne-sdk/utils/agent';
import { useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import Header from '@blocklet/ui-react/lib/Header';
import { Avatar, Box, Stack, Theme, Typography, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';

export default function ApplicationHeader({ application = undefined }: { application?: Agent }) {
  const { addons } = useHeaderState();

  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));

  const props: any = {};

  const profile = useMemo(() => application && getAgentProfile(application), [application]);

  if (application && profile) {
    props.logo = <Avatar variant="rounded" src={profile.icon} sx={{ width: 'auto', height: '100%' }} />;

    if (!isMobile) {
      props.brand = (
        <Box
          sx={{
            height: 18,
            fontSize: 18,
          }}>
          {profile.name || 'Unnamed'}
        </Box>
      );
      if (application.project.createdBy) {
        props.description = (
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              maxWidth: 200,
              fontSize: 12,
              gap: 1,
            }}>
            <Typography variant="caption">By</Typography>
            {/* @ts-ignore */}
            <Box component={DID} did={application.project.createdBy} copyable={false} sx={{ flex: 1, width: 1 }} />
          </Stack>
        );
      }
    }
  }

  return (
    <Box
      component={Header}
      hideNavMenu={!!application}
      {...props}
      sx={{ position: 'sticky', top: 0, '.header-container': { maxWidth: '100%' } }}
      addons={addons}
    />
  );
}
