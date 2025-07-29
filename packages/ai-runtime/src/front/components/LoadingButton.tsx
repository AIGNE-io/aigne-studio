import { LoadingButtonProps, LoadingButton as MuiLoadingButton } from '@mui/lab';
import { MouseEvent, useCallback, useState } from 'react';

const LoadingButton = (
  {
    ref,
    onClick,
    ...props
  }: Partial<LoadingButtonProps> & {
    ref: React.RefObject<HTMLButtonElement | null>;
  }
) => {
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

  return <MuiLoadingButton ref={ref} {...props} loading={props.loading || loading} onClick={handleClick} />;
};

export default LoadingButton;
