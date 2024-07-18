import DID from '@arcblock/ux/lib/DID';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import { RuntimeResourceBlockletState } from '@blocklet/ai-runtime/types/runtime/runtime-resource-blocklet-state';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Grid,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { joinURL, withQuery } from 'ufo';

const blockletsMap = Object.fromEntries(window.blocklet.componentMountPoints.map((i) => [i.did, i]));

export default function ApplicationListView({
  applications,
}: {
  applications: RuntimeResourceBlockletState['applications'];
}) {
  const apps = useMemo(
    () => applications.filter((i): i is typeof i & { identity: { blockletDid: string } } => !!i.identity.blockletDid),
    [applications]
  );

  return (
    <Container maxWidth="lg" sx={{ my: 2 }}>
      <Grid container spacing={2}>
        {apps.map((application) => (
          <Grid key={`${application.identity.blockletDid}-${application.identity.aid}`} item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea
                component={Link}
                href={
                  blockletsMap[application.identity.blockletDid]?.mountPoint ||
                  withQuery(joinURL(window.blocklet.prefix, '/apps', application.identity.aid), {
                    blockletDid: application.identity.blockletDid,
                  })
                }
                sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Stack direction="row" spacing={2}>
                    <Avatar
                      src={joinURL(
                        '/.well-known/service/blocklet/logo-bundle',
                        application.identity.blockletDid,
                        `?v=${blockletsMap[application.identity.blockletDid]?.version}`
                      )}
                      variant="rounded"
                      sx={{ width: 80, height: 80 }}
                    />

                    <Stack flex={1} gap={1} width={0}>
                      <Typography variant="h6" noWrap>
                        {application.project.name}
                      </Typography>

                      <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          overflow: 'hidden',
                        }}>
                        {application.project.description}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box flex={1} />

                  <Stack direction="row" spacing={1} alignItems="center" fontSize={14}>
                    <Typography variant="caption">By</Typography>

                    <Box flex={1} width={0}>
                      <DID did={application.project.createdBy} copyable={false} />
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      <RelativeTime value={application.project.updatedAt} />
                    </Typography>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
