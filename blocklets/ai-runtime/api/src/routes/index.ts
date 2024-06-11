import { Router } from 'express';

import agent from './agent';
import ai from './ai';
import { messageRoutes } from './message';
import { sessionRoutes } from './session';

const router = Router();

messageRoutes(router);
sessionRoutes(router);

router.use('/ai', ai);
router.use('/agents', agent);

export default router;
