import { useResourceBlockletState } from '@app/contexts/use-resource-blocklet-state';
import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '@app/libs/constants';
import { useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import Header from '@blocklet/ui-react/lib/Header';
import { Box } from '@mui/material';

export default function HomePage() {
  const { logo, brand, description, addons } = useHeaderState();

  const applications = useResourceBlockletState()?.applications;

  const app = applications?.[0];
  if (!app) throw new Error('No application found');

  return (
    <>
      <Box
        component={Header}
        hideNavMenu
        {...(logo ? { logo } : {})}
        {...(brand ? { brand } : {})}
        {...(description ? { description } : {})}
        sx={{ position: 'sticky', top: 0, '.header-container': { maxWidth: '100%' } }}
        addons={addons}
      />

      <CustomComponentRenderer
        componentId={AIGNE_RUNTIME_CUSTOM_COMPONENT_ID}
        props={{
          blockletDid: app.blockletDid,
          aid: app.aid,
          working: false,
        }}
      />
    </>
  );
}
