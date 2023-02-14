import { Router } from 'express';

import ai from './ai';
import templates from './templates';

const router = Router();

router.use('/ai', ai);
router.use('/templates', templates);

export default router;
