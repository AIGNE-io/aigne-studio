import {
  Box,
  Button,
  ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
} from '@mui/material';
import type { DialogProps } from '@mui/material';
import { ReactNode, useCallback, useMemo, useState } from 'react';

import PromiseLoadingButton from '../components/promise-loading-button';
import Close from '../pages/project/icons/close';

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
      middleIcon,
      middleVariant,
      okText = 'Ok',
      okIcon,
      okColor,
      okVariant,
      onOk,
      onMiddleClick,
      onCancel,
      formSx,
      ...props
    }: {
      title?: ReactNode;
      content?: ReactNode;
      cancelText?: string;
      okText?: string;
      okIcon?: ReactNode;
      okColor?: ButtonProps['color'];
      okVariant?: ButtonProps['variant'];
      middleText?: string;
      middleColor?: ButtonProps['color'];
      middleIcon?: ReactNode;
      middleVariant?: ButtonProps['variant'];
      onOk?: () => Promise<any> | any;
      onMiddleClick?: () => Promise<any> | any;
      onCancel?: () => Promise<any> | any;
      onClose?: () => any;
      formSx?: any;
    } & Omit<DialogProps, 'title' | 'open' | 'content' | 'onClose'>) => {
      setProps({
        ...props,
        open: true,
        children: (
          <Box component="form" onSubmit={(e) => e.preventDefault()} sx={{ ...(formSx || {}) }}>
            {title && (
              <DialogTitle className="between">
                <Box>{title}</Box>

                <IconButton size="small" onClick={() => closeDialog()}>
                  <Close />
                </IconButton>
              </DialogTitle>
            )}
            {content && (
              <DialogContent sx={{ mt: -3 }}>
                <Box pt={3}>{content}</Box>
              </DialogContent>
            )}
            <DialogActions sx={{ justifyContent: 'space-between', pl: 3 }}>
              {middleText && onMiddleClick ? (
                <PromiseLoadingButton
                  variant={middleVariant || 'contained'}
                  color={middleColor}
                  startIcon={middleIcon}
                  loadingPosition={middleIcon ? 'start' : 'center'}
                  onClick={async () => {
                    await onMiddleClick();
                    closeDialog();
                    props.onClose?.();
                  }}>
                  {middleText}
                </PromiseLoadingButton>
              ) : (
                <Box />
              )}

              <Stack direction="row" gap={1} alignItems="center">
                <Button
                  className="cancel"
                  onClick={async () => {
                    await onCancel?.();
                    closeDialog();
                    props.onClose?.();
                  }}>
                  {cancelText}
                </Button>
                {onOk && (
                  <PromiseLoadingButton
                    className="save"
                    variant={okVariant || 'contained'}
                    color={okColor}
                    startIcon={okIcon}
                    loadingPosition={okIcon ? 'start' : 'center'}
                    onClick={async () => {
                      await onOk?.();
                      closeDialog();
                      props.onClose?.();
                    }}
                    type="submit">
                    {okText}
                  </PromiseLoadingButton>
                )}
              </Stack>
            </DialogActions>
          </Box>
        ),
        onClose: async () => {
          await onCancel?.();
          closeDialog();
          props.onClose?.();
        },
      });
    },
    [closeDialog]
  );

  return { dialog, showDialog, closeDialog };
}
