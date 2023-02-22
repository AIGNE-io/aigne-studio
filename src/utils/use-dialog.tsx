import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { DialogProps } from '@mui/material';
import { ReactNode, useCallback, useMemo, useState } from 'react';

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
      okText = 'Ok',
      onOk,
      onClose,
    }: {
      title?: ReactNode;
      content?: ReactNode;
      cancelText?: string;
      okText?: string;
      onOk?: () => Promise<any> | any;
      onClose?: () => any;
    }) => {
      setProps({
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
              <Button onClick={onClose ?? closeDialog}>{cancelText}</Button>
              <Button
                variant="contained"
                onClick={async () => {
                  await onOk?.();
                  if (onClose) {
                    onClose();
                  } else {
                    closeDialog();
                  }
                }}
                type="submit">
                {okText}
              </Button>
            </DialogActions>
          </form>
        ),
        onClose: onClose ?? closeDialog,
      });
    },
    [closeDialog]
  );

  return { dialog, showDialog, closeDialog };
}
