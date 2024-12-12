import { Router } from 'express';

import agent from './agent';
import ai from './ai';
import cacheRouter from './cache';
import cronHistoryRoutes from './cron-history';
import image from './image';
import knowledgeDocuments from './knowledge/documents';
import knowledge from './knowledge/knowledge';
import knowledgeSegments from './knowledge/segments';
import memory from './memory';
import { messageRoutes } from './message';
import { projectRoutes } from './project';
import secret from './secret';
import { sessionRoutes } from './session';

const router = Router();

messageRoutes(router);
sessionRoutes(router);
projectRoutes(router);

router.use('/ai', ai);
router.use('/agents', agent);
router.use('/secrets', secret);
router.use('/memories', memory);
router.use('/datasets', knowledge);
router.use('/datasets', knowledgeDocuments);
router.use('/datasets', knowledgeSegments);
router.use('/', cacheRouter);
router.use('/cron-histories', cronHistoryRoutes);
router.use('/images', image);

export default router;
