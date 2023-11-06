import { useCallback, useMemo, useState } from 'react';

import DelConfirm from './del-confirm';
import type { Props } from './del-confirm';

export default function useDialog() {
  const [props, setProps] = useState<Props>();

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
      confirmProps,
    }: Props) => {
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
        confirmProps,
      });
    },
    [closeDialog]
  );

  return { dialog, showDialog, closeDialog };
}
