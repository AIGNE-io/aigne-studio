import { LoadingButton } from '@mui/lab';
import { Box, Button, ButtonProps, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { DialogProps } from '@mui/material';
import { ReactNode, useCallback, useMemo, useState } from 'react';

export default function useDialog() {
  const [props, setProps] = useState<DialogProps>();

  const dialog = useMemo(() => (props ? <Dialog {...props} /> : null), [props]);

  const closeDialog = useCallback(() => {
    setProps(undefined);
  }, []);

  const [loading, setLoading] = useState(false);

  const showDialog = useCallback(
    ({
      title,
      content,
      cancelText = 'Cancel',
      middleText,
      middleColor,
      okText = 'Ok',
      okColor,
      onOk,
      onMiddleClick,
      onCancel,
      ...props
    }: {
      title?: ReactNode;
      content?: ReactNode;
      cancelText?: string;
      okText?: string;
      okColor?: ButtonProps['color'];
      middleText?: string;
      middleColor?: ButtonProps['color'];
      onOk?: () => Promise<any> | any;
      onMiddleClick?: () => Promise<any> | any;
      onCancel?: () => Promise<any> | any;
    } & Omit<DialogProps, 'open'>) => {
      setProps({
        ...props,
        open: true,
        children: (
          <form onSubmit={(e) => e.preventDefault()}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {content && (
              <DialogContent sx={{ mt: -3 }}>
                <Box pt={3}>{content}</Box>
              </DialogContent>
            )}
            <DialogActions>
              <Button
                onClick={async () => {
                  await onCancel?.();
                  closeDialog();
                }}>
                {cancelText}
              </Button>
              {middleText && onMiddleClick ? (
                <Button
                  variant="contained"
                  color={middleColor}
                  onClick={async () => {
                    await onMiddleClick();
                    closeDialog();
                  }}>
                  {middleText}
                </Button>
              ) : null}
              <LoadingButton
                variant="contained"
                color={okColor}
                loading={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await onOk?.();
                  } finally {
                    setLoading(false);
                  }
                  closeDialog();
                }}
                type="submit">
                {okText}
              </LoadingButton>
            </DialogActions>
          </form>
        ),
        onClose: async () => {
          await onCancel?.();
          closeDialog();
        },
      });
    },
    [closeDialog]
  );

  return { dialog, showDialog, closeDialog };
}
