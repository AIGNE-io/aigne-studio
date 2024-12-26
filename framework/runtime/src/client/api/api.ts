import { createFetch } from '@blocklet/js-sdk';

const fetch = createFetch();

export const fetchApi: typeof fetch = (...args) =>
  fetch(...args).then(async (result) => {
    if (!result.ok) {
      let message: string | undefined;

      try {
        const json = await result.json();
        const msg = json.error?.message || json.message;
        if (msg && typeof msg === 'string') {
          message = msg;
        }
      } catch {
        // ignore
      }

      throw new Error(message || `Failed to fetch url ${args[0]} with status ${result.status}`);
    }

    return result;
  });
