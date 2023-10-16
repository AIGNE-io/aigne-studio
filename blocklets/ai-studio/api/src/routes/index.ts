import { Router } from 'express';

import ai from './ai';
import { branchRoutes } from './branch';
import datasetItems from './dataset-items';
import datasets from './datasets';
import { logRoutes } from './log';
import { projectRoutes } from './project';
import { resourcesRoutes } from './resources';
import { templateTagRoutes } from './template-tag';
import { templateRoutes } from './templates';
import { treeRoutes } from './tree';
import { workingRoutes } from './working';
import ws from './ws';

const router = Router();

projectRoutes(router);
logRoutes(router);
branchRoutes(router);
templateTagRoutes(router);
templateRoutes(router);
workingRoutes(router);
treeRoutes(router);
resourcesRoutes(router);

router.use('/ai', ai);
router.use('/datasets', datasets);
router.use('/datasets', datasetItems);
router.use(ws);

export default router;
