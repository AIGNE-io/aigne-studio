import Button from '@arcblock/ux/lib/Button';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Spinner from '@mui/material/CircularProgress';
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

function useMobileWidth() {
  const theme = useTheme();
  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));
  const minWidth = isBreakpointsDownSm ? 300 : theme.breakpoints.values.sm;
  return { minWidth };
}

export type Props = {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({ name, onClose, onConfirm, ...rest }: Props) {
  const [params, setParams] = useState({ __disableConfirm: true, inputVal: '' });
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const { t } = useLocaleContext();

  const onCallback = async (cb: (data: object) => void) => {
    if (typeof cb === 'function') {
      setLoading(true);
      try {
        await cb(params);
        setOpen(false);
      } catch (err) {
        setError(err?.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      setOpen(false);
    }
  };

  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));
  const { minWidth } = useMobileWidth();

  return (
    <Dialog
      component="form"
      fullScreen={isBreakpointsDownSm}
      onSubmit={(e) => e.preventDefault()}
      open={open}
      style={{ minWidth }}
      onClose={onClose}
      {...rest}>
      <DialogTitle>{`${t('alert.delete')} "${name}"`}</DialogTitle>
      <DialogContent style={{ minWidth }}>
        <DialogContentText component="div">
          <Box
            style={{ marginTop: 24, marginBottom: 24 }}
            dangerouslySetInnerHTML={{ __html: t('deleteProject', { name }) || '' }}
          />
          <Typography component="div">
            <TextField
              label={t('confirmDelete', { name })}
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
      <DialogActions className="delete-actions" style={{ padding: '8px 24px 24px' }}>
        <Button
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            onClose();
          }}>
          {t('alert.close')}
        </Button>

        <Button
          type="submit"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            onCallback(onConfirm);
          }}
          disabled={params.__disableConfirm || loading}
          variant="contained"
          autoFocus
          color="warning">
          {loading && <Spinner size={16} sx={{ mr: 1 }} />}
          {t('alert.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
