import { useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import Header from '@blocklet/ui-react/lib/Header';
import { Box } from '@mui/material';

const AIGNE_RUNTIME_CUSTOM_COMPONENT_ID = 'grc9q1cveub6pnl8';

function Home() {
  const { logo, brand, description, addons } = useHeaderState();

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
          blockletDid: 'z2qaL77cHGYerN8EdirhmLJ5rUoaDDwynuPGW',
          aid: 'NDQ4MTM3OTQ3NDIyNjU0NDY0L21haW4vMjAyNDA1MjEyMzAwMTctZ2V0VTVy',
          working: true,
        }}
      />
    </>
  );
}

export default Home;
