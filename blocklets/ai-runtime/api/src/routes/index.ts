import { Router } from 'express';

import agent from './agent';
import ai from './ai';
import cacheRouter from './cache';
import datasets from './dataset/datasets';
import datasetDocuments from './dataset/documents';
import datasetSegments from './dataset/segments';
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
router.use('/datasets', datasets);
router.use('/datasets', datasetDocuments);
router.use('/datasets', datasetSegments);
router.use('/', cacheRouter);

export default router;
