import DID from '@arcblock/ux/lib/DID';
import { useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import Header from '@blocklet/ui-react/lib/Header';
import { Avatar, Box, Stack, Theme, Typography, useMediaQuery } from '@mui/material';
import { joinURL, withQuery } from 'ufo';

export default function ApplicationHeader({
  application,
  working,
}: {
  application?: {
    aid: string;
    blockletDid?: string;
    project?: { name?: string; createdBy?: string; iconVersion?: string };
  };
  working?: boolean;
}) {
  const { addons } = useHeaderState();

  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));

  const props: any = {};

  if (application) {
    props.logo = (
      <Avatar
        variant="rounded"
        src={withQuery(joinURL(blocklet?.prefix || '/', '/api/agents/', application.aid, 'logo'), {
          blockletDid: application.blockletDid,
          imageFilter: 'resize',
          w: 160,
          version: application.project?.iconVersion,
          working,
        })}
        sx={{ width: 'auto', height: '100%' }}
      />
    );

    if (!isMobile && application.project) {
      props.brand = (
        <Box
          sx={{
            height: 18,
            fontSize: 18,
          }}>
          {application.project?.name || 'Unnamed'}
        </Box>
      );
      if (application.project.createdBy) {
        props.description = (
          <Stack direction="row" alignItems="center" maxWidth={200} fontSize={12} gap={1}>
            <Typography variant="caption">By</Typography>
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
