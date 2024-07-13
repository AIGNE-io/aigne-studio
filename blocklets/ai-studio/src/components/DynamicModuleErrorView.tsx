import Result from '@arcblock/ux/lib/Result';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import { useAsyncEffect } from 'ahooks';
import { useState } from 'react';
import { withQuery } from 'ufo';

const TRY_FETCH_DYNAMIC_MODULE_TIMEOUT = 5000;
const MAX_RETRY_FETCH_DYNAMIC_MODULE = 10;

export default function DynamicModuleErrorView({
  error,
  maxRetry = MAX_RETRY_FETCH_DYNAMIC_MODULE,
  retryTimeout = TRY_FETCH_DYNAMIC_MODULE_TIMEOUT,
}: {
  error: any;
  maxRetry?: number;
  retryTimeout?: number;
}) {
  const [innerError, setInnerError] = useState<Error>();

  const url = error?.message?.match(
    /failed\s+to\s+fetch\s+dynamically\s+imported\s+module:\s+(?<url>https?:\/\/[^ ]+)/i
  )?.groups?.url;

  useAsyncEffect(async () => {
    if (!url) return;

    try {
      await retry(() => sleepOnError(() => import(withQuery(url, { t: Date.now() })), retryTimeout), maxRetry);
      window.location.reload();
    } catch (error) {
      setInnerError(error);
    }
  }, [url]);

  if (!url || innerError) {
    return (
      <Box
        component={Result}
        status="error"
        description={error?.message}
        extra={<Button onClick={() => window.location.reload()}>Reload</Button>}
        sx={{ bgcolor: 'transparent', height: '80vh' }}
      />
    );
  }

  return (
    <Stack position="fixed" left={0} top={0} right={0} bottom={0} alignItems="center" justifyContent="center">
      <CircularProgress size={24} />
    </Stack>
  );
}

async function retry<T>(fn: () => Promise<T>, maxRetry = 3): Promise<T> {
  let retry = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (retry >= maxRetry) throw error;
    }
    retry++;
  }
}

async function sleepOnError<T>(fn: () => Promise<T>, minTime: number): Promise<T> {
  const r = await fn()
    .then((result) => ({ result }))
    .catch((error) => ({ error }));

  const timeout = new Promise((resolve) => {
    setTimeout(resolve, minTime);
  });

  if ('error' in r) {
    await timeout;
    throw r.error;
  }

  return r.result;
}
