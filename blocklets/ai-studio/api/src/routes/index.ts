import { Router } from 'express';

import ai from './ai';
import { branchRoutes } from './branch';
import datasets from './dataset/datasets';
import datasetDocuments from './dataset/documents';
import datasetSegments from './dataset/segments';
import datastores from './datastore';
import { globalRoutes } from './global';
import importRouter from './import';
import { logRoutes } from './log';
import { messageRoutes } from './message';
import { projectRoutes } from './project';
import release from './release';
import { resourceRoutes } from './resource';
import { sessionRoutes } from './session';
import subscription from './subscription';
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
sessionRoutes(router);
messageRoutes(router);

router.use('/ai', ai);
router.use('/releases', release);
router.use('/subscriptions', subscription);
router.use('/datasets', datasets);
router.use('/datasets', datasetDocuments);
router.use('/datasets', datasetSegments);
router.use('/datastore', datastores);
router.use(ws);

router.use('/import', importRouter);

export default router;
