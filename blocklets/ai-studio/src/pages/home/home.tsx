import AigneLogo from '@app/components/aigne-logo';
import { useIsRole, useSessionContext } from '@app/contexts/session';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { SubscribeButton } from '@blocklet/aigne-hub/components';
import { Dashboard } from '@blocklet/studio-ui';
import Footer from '@blocklet/ui-react/lib/Footer';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

export default function Home() {
  const { t } = useLocaleContext();
  const { session } = useSessionContext();
  const isAdmin = useIsRole(['owner', 'admin']);

  return (
    <Dashboard
      HeaderProps={{
        logo: <AigneLogo />,
        addons: (exists: ReactNode[]) => [<SubscribeButton />, ...exists],
      }}>
      <Box mx="auto" flexGrow={1} my={4} maxWidth={800}>
        {blocklet && (
          <Stack alignItems="center" gap={2} mt="30%">
            <Box sx={{ transform: 'scale(2)' }} my={2}>
              <AigneLogo />
            </Box>
            <Typography variant="h4">{blocklet.appName}</Typography>
            <Typography variant="caption" component="div">
              v{blocklet.version}
            </Typography>
            <Typography variant="body1" component="div">
              {blocklet.appDescription}
            </Typography>

            <Stack direction="row" gap={3}>
              {!isAdmin && (
                <Button onClick={session.user ? session.switchDid : session.login} variant="contained">
                  {window.blocklet?.tenantMode === 'multiple' ? t('login') : t('loginAsAdminButton')}
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Box>

      <Footer
        // FIXME: remove following undefined props after issue https://github.com/ArcBlock/ux/issues/1136 solved
        meta={undefined}
        theme={undefined}
      />
    </Dashboard>
  );
}
