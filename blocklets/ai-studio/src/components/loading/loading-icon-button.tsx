import { CircularProgress, IconButton, IconButtonProps } from '@mui/material';
import { MouseEvent, ReactNode, forwardRef, useCallback, useState } from 'react';

interface LoadingIconButtonProps extends IconButtonProps {
  icon: ReactNode;
  size?: IconButtonProps['size'];
}

const LoadingIconButton = forwardRef<HTMLButtonElement, LoadingIconButtonProps>(
  ({ onClick, icon, size, ...props }, ref) => {
    const [loading, setLoading] = useState(false);

    const handleClick = useCallback(
      async (e: MouseEvent<HTMLButtonElement>) => {
        setLoading(true);
        if (onClick) {
          e.persist();
          await onClick(e);
        }
        setLoading(false);
      },
      [onClick]
    );

    return (
      <IconButton ref={ref} {...props} onClick={handleClick} size={size} disabled={loading}>
        {loading ? <CircularProgress size={18} color="inherit" /> : icon}
      </IconButton>
    );
  }
);

export default LoadingIconButton;
