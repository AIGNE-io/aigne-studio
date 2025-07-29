import { proxyToAIKit } from '@blocklet/ai-kit/api/call';
import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';

const router = Router();

// @ts-ignore express5 is not compatible
router.get('/status', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/status'));

router.post(
  '/:type(chat)?/completions',
  ensureComponentCallOrPromptsEditor(),
  // @ts-ignore express5 is not compatible
  proxyToAIKit('/api/v1/chat/completions')
);

// @ts-ignore express5 is not compatible
router.post('/image/generations', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/image/generations'));

export default router;
