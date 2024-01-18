import { getDatasetProtocols } from '@blocklet/dataset-sdk';
import { env } from '@blocklet/sdk/lib/config';
import { Router } from 'express';

const router = Router();

router.get('/list', async (_req, res) => {
  const list = await getDatasetProtocols(env.appUrl);
  res.json({ list });
});

export default router;
