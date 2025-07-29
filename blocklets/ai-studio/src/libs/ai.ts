import { createImageGenerationApi, createTextCompletionApi } from '@blocklet/aigne-hub/api';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { createFetch } from '@blocklet/js-sdk';

import axios from './api';

export const textCompletions = createTextCompletionApi({
  fetch: createFetch(undefined, { componentDid: AIGNE_STUDIO_COMPONENT_DID }),
  path: '/api/ai/completions',
});

export const imageGenerations = createImageGenerationApi({ axios, path: '/api/ai/image/generations' });
