import { useHeaderState } from '@blocklet/pages-kit/builtin/page/header';
import Header from '@blocklet/ui-react/lib/Header';
import { Box } from '@mui/material';

export default function ApplicationHeader({ hideNavMenu = true }: { hideNavMenu?: boolean }) {
  const { logo, brand, description, addons } = useHeaderState();

  return (
    <Box
      component={Header}
      hideNavMenu={hideNavMenu}
      {...(logo ? { logo } : {})}
      {...(brand ? { brand } : {})}
      {...(description ? { description } : {})}
      sx={{ position: 'sticky', top: 0, '.header-container': { maxWidth: '100%' } }}
      addons={addons}
    />
  );
}
