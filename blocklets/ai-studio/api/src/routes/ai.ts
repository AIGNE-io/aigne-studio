import { proxyToAIKit } from '@blocklet/aigne-hub/api/call';
import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';

const router = Router();

router.get('/status', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/status'));

router.post(
  '/:type(chat)?/completions',
  ensureComponentCallOrPromptsEditor(),
  proxyToAIKit('/api/v1/chat/completions')
);

router.post('/image/generations', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/image/generations'));

export default router;
