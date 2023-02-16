import { component } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { getTemplates } from './templates';

const router = Router();

router.get('/templates', component.verifySig, getTemplates);

export default router;
