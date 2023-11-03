import Button from '@arcblock/ux/lib/Button';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import styled from '@emotion/styled';
import Alert from '@mui/material/Alert';
import Spinner from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useTheme from '@mui/material/styles/useTheme';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';

function useMobileWidth() {
  const theme = useTheme();
  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));
  const minWidth = isBreakpointsDownSm ? 300 : theme.breakpoints.values.sm;
  return { minWidth };
}

export default function ConfirmDialog({
  title,
  description,
  showCancel,
  cancel,
  confirm,
  color,
  params: initialParams,
  onCancel,
  onConfirm,
  loading: inputLoading,
  ...rest
}: {
  title: any;
  description: any;
  showCancel?: boolean;
  cancel: string;
  confirm: string;
  color?: string;
  params: { [key: string]: any };
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [params, setParams] = useState(initialParams);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { t: changeLocale } = useLocaleContext();
  const theme = useTheme();

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

  const t = typeof title === 'function' ? title() : title;
  const d = typeof description === 'function' ? description(params, setParams, setError) : description;

  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  };
  const { minWidth } = useMobileWidth();

  return (
    <StyledDialog onClick={handleClick} fullScreen={isBreakpointsDownSm} open={open} style={{ minWidth }} {...rest}>
      <DialogTitle>{t}</DialogTitle>
      <DialogContent style={{ minWidth }}>
        <DialogContentText component="div">{d}</DialogContentText>
        {!!error && (
          <Alert severity="error" style={{ width: '100%', marginTop: 8 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions className="delete-actions" style={{ padding: '8px 24px 24px' }}>
        {showCancel && (
          <Button
            onClick={(e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              onCallback(onCancel);
            }}
            color="inherit"
            data-cy="cancel-confirm-dialog">
            {cancel || changeLocale('common.cancel')}
          </Button>
        )}
        <Button
          onClick={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            onCallback(onConfirm);
          }}
          color={color}
          // eslint-disable-next-line no-underscore-dangle
          disabled={params.__disableConfirm || loading || inputLoading}
          variant="contained"
          data-cy="submit-confirm-dialog"
          autoFocus>
          {(loading || inputLoading) && <Spinner size={16} sx={{ mr: 1 }} />}
          {confirm}
        </Button>
      </DialogActions>
    </StyledDialog>
  );
}

const StyledDialog = styled(Dialog)`
  .delete-actions .Mui-disabled {
    color: rgba(0, 0, 0, 0.26) !important;
    box-shadow: none;
    background-color: rgba(0, 0, 0, 0.12) !important;
  }
`;
