import { Router } from 'express';

import ai from './ai';
import { branchRoutes } from './branch';
import datasetItems from './dataset-items';
import datasets from './datasets';
import { importRoutes } from './import';
import { logRoutes } from './log';
import { projectRoutes } from './project';
import { templateTagRoutes } from './template-tag';
import { templateRoutes } from './templates';
import { treeRoutes } from './tree';
import ws from './ws';

const router = Router();

projectRoutes(router);
treeRoutes(router);
logRoutes(router);
importRoutes(router);
branchRoutes(router);
templateTagRoutes(router);
templateRoutes(router);

router.use('/ai', ai);
router.use('/datasets', datasets);
router.use('/datasets', datasetItems);
router.use(ws);

export default router;
