import { AIGNE_RUNTIME_CUSTOM_COMPONENT_ID } from '@app/libs/constants';
import { useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import Header from '@blocklet/ui-react/lib/Header';
import { Box } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function PreviewPage() {
  const { aid } = useParams();
  if (!aid) throw new Error('Missing required param `aid`');

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
          aid,
          working: true,
        }}
      />
    </>
  );
}
