import { Router } from 'express';

import ai from './ai';
import { branchRoutes } from './branch';
import collection from './collection';
import dataset from './dataset';
import datasetItems from './dataset-items';
import datasets from './datasets';
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
router.use('/dataset', dataset);
router.use('/collection', collection);
router.use('/datasets', datasets);
router.use('/datasets', datasetItems);
router.use(ws);

export default router;
