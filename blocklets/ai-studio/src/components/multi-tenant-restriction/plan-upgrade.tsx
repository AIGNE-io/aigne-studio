import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Theme,
  useMediaQuery,
} from '@mui/material';

import { useMultiTenantRestriction } from './state';

interface Props {}

const AI_STUDIO_STORE = 'https://registry.arcblock.io/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export function PlanUpgrade({ ...rest }: Props) {
  const { isRestricted, type, hidePlanUpgrade } = useMultiTenantRestriction();
  const { t } = useLocaleContext();
  const downSm = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));

  if (!isRestricted || !type) {
    return null;
  }

  return (
    <Dialog
      fullScreen={downSm}
      open={!!type}
      onClose={hidePlanUpgrade}
      PaperProps={{ sx: { width: 440, maxWidth: '100%' } }}
      {...rest}>
      <DialogTitle className="between" sx={{ border: 0 }}>
        <Box>Launch a serverless Aigne</Box>

        <IconButton size="small" onClick={hidePlanUpgrade}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <DialogContentText>{t(`multiTenantRestriction.${type}.desc`)}</DialogContentText>

        <Box
          component={Link}
          href="https://www.arcblock.io/blog/tags/en/aigne"
          target="_blank"
          sx={{ display: 'block', color: 'text.secondary', fontSize: 14, mt: 1, textDecorationColor: 'inherit' }}>
          Learn how to launch a serverless Aigne
        </Box>
      </DialogContent>

      <DialogActions sx={{ border: 0 }}>
        <Button onClick={hidePlanUpgrade} variant="outlined">
          {t('cancel')}
        </Button>
        <Button
          onClick={() => {
            hidePlanUpgrade();
            window.open(AI_STUDIO_STORE, '_blank');
          }}
          variant="contained"
          color="primary">
          Launch My Serverless Aigne
        </Button>
      </DialogActions>
    </Dialog>
  );
}
