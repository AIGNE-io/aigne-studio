import { callRemoteApi } from '@blocklet/aigne-hub/api/call';
import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';

const router = Router();

// router.get('/status', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/status'));

router.post('/:type(chat)?/completions', ensureComponentCallOrPromptsEditor(), async (req, res) => {
  const url = 'api/v2/chat/completions';
  const { stream } = req.body;

  const result = await callRemoteApi(req.body, { endpoint: url }, { responseType: stream ? 'stream' : undefined });

  if (stream) {
    return result.data.pipe(res);
  }

  return res.json((await result).data);
});

// router.post('/image/generations', ensureComponentCallOrPromptsEditor(), proxyToAIKit('/api/v1/image/generations'));

export default router;
