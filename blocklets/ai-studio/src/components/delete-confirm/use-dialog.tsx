import { useCallback, useMemo, useState } from 'react';

import DelConfirm from './del-confirm';

export default function useDialog() {
  const [props, setProps] = useState<{
    keyName: string;
    title: any;
    description?: any;
    confirmPlaceholder?: string;
    cancel: string;
    confirm: string;
    params?: object;
    onCancel: () => any;
    onConfirm: () => any;
  }>();

  const dialog = useMemo(() => (props ? <DelConfirm {...props} /> : null), [props]);

  const closeDialog = useCallback(() => {
    setProps(undefined);
  }, []);

  const showDialog = useCallback(
    ({
      title,
      description,
      confirmPlaceholder,
      cancel,
      confirm,
      params: initialParams,
      onCancel,
      onConfirm,
      keyName,
    }: {
      keyName: string;
      title: any;
      description?: any;
      confirmPlaceholder?: string;
      cancel: string;
      confirm: string;
      params?: object;
      onCancel: () => any;
      onConfirm: () => any;
    }) => {
      setProps({
        title,
        description,
        confirmPlaceholder,
        cancel,
        confirm,
        params: initialParams,
        onCancel,
        onConfirm,
        keyName,
      });
    },
    [closeDialog]
  );

  return { dialog, showDialog, closeDialog };
}
