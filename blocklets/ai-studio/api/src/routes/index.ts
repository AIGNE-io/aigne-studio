import { Router } from 'express';

import ai from './ai';
import { branchRoutes } from './branch';
import datasetItems from './dataset/item';
import dataset from './dataset/list';
import datasetSegments from './dataset/segment';
import { globalRoutes } from './global';
import { logRoutes } from './log';
import { projectRoutes } from './project';
import { resourceRoutes } from './resource';
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

router.use('/ai', ai);
router.use('/datasets/datasets', dataset);
router.use('/datasets/units', datasetItems);
router.use('/datasets/segments', datasetSegments);
router.use(ws);

export default router;
