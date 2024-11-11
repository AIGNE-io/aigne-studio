import type { DialogContentProps, DialogProps } from '@mui/material';
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
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

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
      DialogContentProps,
      form,
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
      onOk?: (...args: any[]) => Promise<any> | any;
      onMiddleClick?: () => Promise<any> | any;
      onCancel?: () => Promise<any> | any;
      onClose?: () => any;
      DialogContentProps?: DialogContentProps;
      formSx?: any;
      form?: UseFormReturn<any>;
    } & Omit<DialogProps, 'title' | 'open' | 'content' | 'onClose'>) => {
      const onSave = async (...args: any[]) => {
        await onOk?.(...args);
        closeDialog();
        props.onClose?.();
      };

      const onSubmit = async () => {
        if (form && onOk) {
          await form.handleSubmit(onSave)();
        } else {
          await onSave();
        }
      };

      setProps({
        ...props,
        open: true,
        component: 'form',
        sx: { ...(formSx || {}) },
        children: (
          <>
            {title && (
              <DialogTitle className="between" zIndex="appBar" bgcolor="background.paper">
                <Box>{title}</Box>

                <IconButton
                  size="small"
                  onClick={async () => {
                    await onCancel?.();
                    closeDialog();
                    props.onClose?.();
                  }}>
                  <Close />
                </IconButton>
              </DialogTitle>
            )}
            {content && (
              <DialogContent {...DialogContentProps} sx={{ py: 1, ...DialogContentProps?.sx }}>
                <Box>{content}</Box>
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
                  data-testid="dialog-cancel-button"
                  className="cancel"
                  variant="outlined"
                  onClick={async () => {
                    await onCancel?.();
                    closeDialog();
                    props.onClose?.();
                  }}>
                  {cancelText}
                </Button>
                {onOk && (
                  <PromiseLoadingButton
                    onClick={onSubmit}
                    data-testid="dialog-ok-button"
                    className="save"
                    variant={okVariant || 'contained'}
                    color={okColor}
                    startIcon={okIcon}
                    loadingPosition={okIcon ? 'start' : 'center'}>
                    {okText}
                  </PromiseLoadingButton>
                )}
              </Stack>
            </DialogActions>
          </>
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
