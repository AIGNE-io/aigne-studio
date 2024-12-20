import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Button, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useTheme from '@mui/material/styles/useTheme';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';

import Close from '../../pages/project/icons/close';

function useMobileWidth() {
  const theme = useTheme();
  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));
  const minWidth = isBreakpointsDownSm ? 300 : theme.breakpoints.values.sm;
  return { minWidth };
}

export type Props = {
  name: string;
  isReset?: boolean;
  onClose: () => any;
  onConfirm: () => any;
};

export default function ConfirmDialog({ name, isReset, onClose, onConfirm, ...rest }: Props) {
  const [params, setParams] = useState({ __disableConfirm: true, inputVal: '' });
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const { t } = useLocaleContext();

  const onSubmit = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(err?.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));
  const { minWidth } = useMobileWidth();

  const [copied, setCopied] = useState(false);

  return (
    <Dialog
      component="form"
      fullScreen={isBreakpointsDownSm}
      onSubmit={(e) => e.preventDefault()}
      open={open}
      style={{ minWidth }}
      onClose={onClose}
      {...rest}>
      <DialogTitle className="between" sx={{ border: 0 }}>
        <Box>{`${t(isReset ? 'reset' : 'alert.delete')} "${name}"`}</Box>

        <IconButton size="small" onClick={() => setOpen(false)}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ minWidth }}>
        <DialogContentText component={Stack} gap={1.5}>
          <Box fontWeight={400} fontSize={16} lineHeight="28px">
            {t(isReset ? 'resetProjectAlertPrefix' : 'deleteProjectAlertPrefix')}
            <Tooltip
              title={copied ? t('copied') : t('copy')}
              placement="top"
              onClose={() => setCopied(false)}
              disableInteractive>
              <Typography
                component="span"
                sx={{ color: '#4B5563', cursor: 'pointer', fontWeight: 500, fontSize: '16px' }}
                onClick={() => {
                  navigator.clipboard.writeText(name);
                  setCopied(true);
                }}>
                {' '}
                "{name}"{' '}
              </Typography>
            </Tooltip>
            {t(isReset ? 'resetProjectAlertSuffix' : 'deleteProjectAlertSuffix')}
          </Box>

          <Box fontWeight={400} fontSize={16} lineHeight="28px">
            {t('confirmTip')}
          </Box>

          <Typography component="div">
            <TextField
              label={t(isReset ? 'confirmReset' : 'confirmDelete', { name })}
              autoComplete="off"
              variant="outlined"
              fullWidth
              autoFocus
              value={params.inputVal}
              onChange={(e) => {
                setParams({ ...params, inputVal: e.target.value, __disableConfirm: name !== e.target.value });
              }}
            />
          </Typography>
        </DialogContentText>
        {!!error && (
          <Alert severity="error" style={{ width: '100%', marginTop: 8 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ border: 0 }}>
        <Button onClick={onClose} variant="outlined">
          {t('close')}
        </Button>

        <Button
          type="submit"
          onClick={onSubmit}
          disabled={params.__disableConfirm || loading}
          variant="contained"
          autoFocus
          color="warning"
          sx={{
            border: 0,
            background: '#E11D48',
            color: '#fff',

            '&:hover': {
              background: '#E11D48',
            },
          }}>
          {loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
          {t(isReset ? 'reset' : 'alert.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
