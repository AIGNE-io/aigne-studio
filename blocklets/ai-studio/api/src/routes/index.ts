import { Router } from 'express';

import ai from './ai';
import { branchRoutes } from './branch';
import datasetsItems from './dataset-items';
import datasetItems from './dataset/item';
import dataset from './dataset/list';
import datasets from './datasets';
import { globalRoutes } from './global';
import { logRoutes } from './log';
import { projectRoutes } from './project';
import publish from './publish';
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
resourceRoutes(router);

router.use('/ai', ai);
router.use('/publish', publish);
router.use('/dataset', dataset);
router.use('/dataset', datasetItems);
router.use('/datasets', datasets);
router.use('/datasets', datasetsItems);
router.use(ws);

export default router;
