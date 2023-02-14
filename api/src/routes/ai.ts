import { Router } from 'express';

import { proxyToComponent } from '../libs/component';

const router = Router();

router.get('/status', async (_, res) => {
  await proxyToComponent(
    {
      name: 'ai-kit',
      url: '/api/v1/sdk/status',
    },
    res
  );
});

router.post('/completions', async (req, res) => {
  await proxyToComponent(
    {
      name: 'ai-kit',
      url: '/api/v1/sdk/completions',
      method: 'POST',
      data: req.body,
    },
    res
  );
});

router.post('/image/generations', async (req, res) => {
  await proxyToComponent(
    {
      name: 'ai-kit',
      url: '/api/v1/sdk/image/generations',
      method: 'POST',
      data: req.body,
    },
    res
  );
});

export default router;
