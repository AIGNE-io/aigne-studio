import { createImageGenerationApi, createTextCompletionApi } from '@blocklet/ai-kit/api';

import axios, { aigneStudioFetch } from './api';

export const textCompletions = createTextCompletionApi({ fetch: aigneStudioFetch, path: '/api/ai/completions' });

export const imageGenerations = createImageGenerationApi({ axios, path: '/api/ai/image/generations' });
