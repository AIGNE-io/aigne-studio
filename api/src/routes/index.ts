import { Router } from 'express';

import ai from './ai';
import sdk from './sdk';
import templates from './templates';

const router = Router();

router.use('/ai', ai);
router.use('/templates', templates);
router.use('/sdk', sdk);

export default router;
