import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { createTextCompletionApi } from '@blocklet/aigne-hub/api';
import { createFetch } from '@blocklet/js-sdk';

export const textCompletions = createTextCompletionApi({
  fetch: createFetch(undefined, { componentDid: AIGNE_STUDIO_COMPONENT_DID }),
  path: '/api/ai/completions',
});
