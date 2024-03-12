import { Router } from 'express';

import ai from './ai';
import { branchRoutes } from './branch';
import dataset from './dataset/datasets';
import datasetItems from './dataset/documents';
import datasetSegments from './dataset/segments';
import { globalRoutes } from './global';
import { logRoutes } from './log';
import { messageRoutes } from './message';
import { projectRoutes } from './project';
import release from './release';
import { resourceRoutes } from './resource';
import { sessionRoutes } from './session';
import { treeRoutes } from './tree';
import { workingRoutes } from './working';
import ws from './ws';

const router = Router();

projectRoutes(router);
logRoutes(router);
branchRoutes(router);
globalRoutes(router);
workingRoutes(router);
treeRoutes(router);
resourceRoutes(router);
resourceRoutes(router);
sessionRoutes(router);
messageRoutes(router);

router.use('/ai', ai);
router.use('/releases', release);
router.use('/dataset', dataset);
router.use('/dataset', datasetItems);
router.use('/dataset', datasetSegments);
router.use(ws);

export default router;
