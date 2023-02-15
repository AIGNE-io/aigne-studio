import { component } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { templates } from '../store/templates';

const router = Router();

router.get('/templates', component.verifySig, async (_, res) => {
  const list = await templates.paginate({ sort: { updatedAt: -1 } });
  res.json({ templates: list });
});

export default router;
