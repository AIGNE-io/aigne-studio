import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import ArrowUpIcon from '@iconify-icons/tabler/circle-arrow-up';
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
  const { isRestricted, hidePlanUpgrade, planUpgradeVisible, type } = useMultiTenantRestriction();
  const { t } = useLocaleContext();
  const downSm = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));

  if (!isRestricted) {
    return null;
  }

  return (
    <Dialog
      fullScreen={downSm}
      open={planUpgradeVisible}
      onClose={hidePlanUpgrade}
      PaperProps={{ sx: { width: 440, maxWidth: '100%' } }}
      {...rest}>
      <DialogTitle className="between" sx={{ border: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Icon icon={ArrowUpIcon} />
          <span>Upgrade plan</span>
        </Box>

        <IconButton size="small" onClick={hidePlanUpgrade}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {type && <DialogContentText>{t(`multiTenantRestriction.${type}.desc`)}</DialogContentText>}

        <Box
          component={Link}
          href="https://www.arcblock.io/blog/tags/en/aigne"
          target="_blank"
          sx={{ display: 'block', color: 'text.secondary', fontSize: 14, mt: 1, textDecorationColor: 'inherit' }}>
          Learn how to launch a serverless AIGNE
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
          Launch My Serverless AIGNE
        </Button>
      </DialogActions>
    </Dialog>
  );
}
