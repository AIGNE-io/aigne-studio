import { component } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { getTemplate, getTemplates } from './templates';

const router = Router();

router.get('/templates', component.verifySig, getTemplates);
router.get('/templates/:templateId', component.verifySig, getTemplate);

export default router;
