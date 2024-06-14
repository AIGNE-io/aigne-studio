import { Router } from 'express';

import agent from './agent';
import ai from './ai';
import memory from './memory';
import { messageRoutes } from './message';
import secret from './secret';
import { sessionRoutes } from './session';

const router = Router();

messageRoutes(router);
sessionRoutes(router);

router.use('/ai', ai);
router.use('/agents', agent);
router.use('/secrets', secret);
router.use('/memories', memory);

export default router;
