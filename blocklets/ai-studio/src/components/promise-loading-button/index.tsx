import type { LoadingButtonProps } from '@mui/lab';
import { LoadingButton } from '@mui/lab';
import { useState } from 'react';

export default function PromiseLoadingButton(props: LoadingButtonProps) {
  const [loading, setLoading] = useState(false);

  return (
    <LoadingButton
      {...props}
      loading={props.loading || loading}
      onClick={(e) => {
        const res = props.onClick?.(e) as any;
        if (res instanceof Promise) {
          setLoading(true);
          res.finally(() => {
            setLoading(false);
          });
        }
      }}
    />
  );
}
