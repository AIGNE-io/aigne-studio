import { Box } from '@mui/material';
import { useDeferredValue, useMemo } from 'react';

import { Parameter } from '../../../api/src/store/templates';
import encode from '../../libs/encode';
import { parameterToStringValue } from '../parameter-field';

export default function TokenCounter({ value, ...rest }: { value: string | Parameter; [ket: string]: any }) {
  const deferred = useDeferredValue(value);
  const count = useMemo(
    () => encode(typeof deferred === 'string' ? deferred : parameterToStringValue(deferred)).length,
    [deferred]
  );
  return (
    <Box component="span" {...rest}>
      {count} tokens
    </Box>
  );
}
