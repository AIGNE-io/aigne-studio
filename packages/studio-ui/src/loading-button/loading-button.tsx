import { ButtonProps as LoadingButtonProps, Button as MuiLoadingButton } from '@mui/material';
import { useState } from 'react';

export default function LoadingButton(props: LoadingButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <MuiLoadingButton
      {...props}
      loadingPosition="end"
      loading={props.loading || loading}
      onClick={(e) => {
        const res: Promise<any> | undefined = props.onClick?.(e) as any;
        if (typeof res?.finally === 'function') {
          setLoading(true);
          res.finally(() => setLoading(false));
        }
      }}
    />
  );
}
