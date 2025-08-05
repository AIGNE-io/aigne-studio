import { ButtonProps, Button as MuiLoadingButton } from '@mui/material';
import { MouseEvent, useCallback, useState } from 'react';

const LoadingButton = ({
  ref = undefined,
  onClick,
  ...props
}: Partial<ButtonProps> & {
  ref?: React.Ref<HTMLButtonElement>;
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      try {
        setLoading(true);
        await onClick?.(e);
      } finally {
        setLoading(false);
      }
    },
    [onClick]
  );

  return (
    <MuiLoadingButton
      ref={ref}
      loadingPosition="end"
      {...props}
      loading={props.loading || loading}
      onClick={handleClick}
    />
  );
};

export default LoadingButton;
