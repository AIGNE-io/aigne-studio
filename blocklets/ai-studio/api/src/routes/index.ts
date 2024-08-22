import { Router } from 'express';

import agent from './agent';
import ai from './ai';
import { branchRoutes } from './branch';
import { globalRoutes } from './global';
import importRouter from './import';
import { logRoutes } from './log';
import { messageRoutes } from './message';
import { projectRoutes } from './project';
import { resourceRoutes } from './resource';
import { sessionRoutes } from './session';
import { treeRoutes } from './tree';
import { workingRoutes } from './working';

const router = Router();

projectRoutes(router);
logRoutes(router);
branchRoutes(router);
globalRoutes(router);
workingRoutes(router);
treeRoutes(router);
resourceRoutes(router);
sessionRoutes(router);
messageRoutes(router);

router.use('/agents', agent);
router.use('/ai', ai);

router.use('/import', importRouter);

export default router;
