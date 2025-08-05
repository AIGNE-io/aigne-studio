import { Icon } from '@iconify/react';
import { LoadingButtonProps } from '@mui/lab';
import { Box, Tooltip, TooltipProps } from '@mui/material';
import { ReactNode, useRef, useState } from 'react';

import LoadingButton from './LoadingButton';

export default function ActionButton({
  tip = undefined,
  tipSucceed = undefined,
  title = undefined,
  titleSucceed = undefined,
  icon = undefined,
  iconSucceed = undefined,
  autoReset = undefined,
  placement = 'top',
  ...props
}: {
  tip?: ReactNode;
  tipSucceed?: ReactNode;
  title?: ReactNode;
  titleSucceed?: ReactNode;
  icon?: ReactNode;
  iconSucceed?: ReactNode;
  autoReset?: boolean;
  placement?: TooltipProps['placement'];
  target?: string;
} & Omit<Partial<LoadingButtonProps>, 'title'>) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<Error>();

  const timer = useRef<number>(undefined);

  const onClose = () => {
    setError(undefined);

    if (autoReset) {
      timer.current = window.setTimeout(() => {
        setActive(false);
      }, 3000);
    }
  };

  const onOpen = () => {
    clearTimeout(timer.current);
  };

  const realIcon = active ? iconSucceed : icon;

  const toolTipTitleText = error ? (
    <Box
      sx={{
        color: 'error',
      }}>
      {error.message}
    </Box>
  ) : (
    (active && tipSucceed) || tip
  );
  const buttonText = active ? titleSucceed : title;

  return (
    <Tooltip title={toolTipTitleText} disableInteractive placement={placement} onClose={onClose} onOpen={onOpen}>
      <span>
        <LoadingButton
          loadingPosition="start"
          startIcon={realIcon && (typeof realIcon === 'string' ? <Icon icon={realIcon} /> : realIcon)}
          {...props}
          onClick={async (e: any) => {
            if (!props.onClick) return;
            try {
              await props.onClick(e);
              setActive(true);
            } catch (error) {
              setError(error);
            }
          }}>
          {buttonText}
        </LoadingButton>
      </span>
    </Tooltip>
  );
}
