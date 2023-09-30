import { Box, Button, ButtonProps, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { DialogProps } from '@mui/material';
import { ReactNode, useCallback, useMemo, useState } from 'react';

import PromiseLoadingButton from '../components/promise-loading-button';

export default function useDialog() {
  const [props, setProps] = useState<DialogProps>();

  const dialog = useMemo(() => (props ? <Dialog {...props} /> : null), [props]);

  const closeDialog = useCallback(() => {
    setProps(undefined);
  }, []);

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
    } & Omit<DialogProps, 'title' | 'open' | 'content'>) => {
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
              {onOk && (
                <PromiseLoadingButton
                  variant="contained"
                  color={okColor}
                  onClick={async () => {
                    await onOk?.();
                    closeDialog();
                  }}
                  type="submit">
                  {okText}
                </PromiseLoadingButton>
              )}
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
