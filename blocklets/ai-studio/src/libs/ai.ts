import { createImageGenerationApi, createTextCompletionApi } from '@blocklet/ai-kit/api';

import axios from './api';

export type { ImageGenerationSize } from '@blocklet/ai-kit/api';

export const textCompletions = createTextCompletionApi({ axios, path: '/api/ai/completions' });

export const imageGenerations = createImageGenerationApi({ axios, path: '/api/ai/image/generations' });
