import { Box } from '@mui/material';
import { useDeferredValue, useMemo } from 'react';

import { Parameter } from '../../../api/src/store/templates';
import encode from '../../libs/encode';
import { parameterToStringValue } from '../parameter-field';

export default function TokenCounter({ value }: { value: string | Parameter }) {
  const deferred = useDeferredValue(value);
  const count = useMemo(
    () => encode(typeof deferred === 'string' ? deferred : parameterToStringValue(deferred)).length,
    [deferred]
  );
  return <Box component="span">{count} tokens</Box>;
}
