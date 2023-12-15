import { LoadingButtonProps, LoadingButton as MuiLoadingButton } from '@mui/lab';
import { useState } from 'react';

export default function LoadingButton(props: LoadingButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <MuiLoadingButton
      {...props}
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
