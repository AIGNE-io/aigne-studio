import SubscribeButton from '@app/components/subscribe';
import { Dashboard } from '@blocklet/studio-ui';
import Footer from '@blocklet/ui-react/lib/Footer';
import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

export default function Home() {
  return (
    <Dashboard
      HeaderProps={{
        addons: (exists: ReactNode[]) => [<SubscribeButton />, ...exists],
      }}>
      <Box mx="auto" flexGrow={1} my={4} maxWidth={800}>
        {blocklet && (
          <Box textAlign="center">
            <Box component="img" src={blocklet.appLogo} width={80} />
            <Typography variant="h4">{blocklet.appName}</Typography>
            <Typography variant="caption" component="div">
              v{blocklet.version}
            </Typography>
            <Typography variant="body1" component="div">
              {blocklet.appDescription}
            </Typography>
          </Box>
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
