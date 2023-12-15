import { createImageGenerationApi, createStatusApi, createTextCompletionApi } from '@blocklet/ai-kit';

import axios from './api';

export type { ImageGenerationSize } from '@blocklet/ai-kit';

export const getAIStatus = createStatusApi({ axios, path: '/api/ai/status' });

export const textCompletions = createTextCompletionApi({ axios, path: '/api/ai/completions' });

export const imageGenerations = createImageGenerationApi({ axios, path: '/api/ai/image/generations' });
