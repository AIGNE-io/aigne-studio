import { Router } from 'express';

import ai from './ai';
import branches from './branches';
import datasetItems from './dataset-items';
import datasets from './datasets';
import importRouter from './import';
import logs from './logs';
import tags from './tags';
import templates from './templates';
import tree from './tree';

const router = Router();

router.use('/templates', templates);
router.use('/ai', ai);
router.use('/tags', tags);
router.use('/import', importRouter);
router.use('/datasets', datasets);
router.use('/datasets', datasetItems);
router.use('/tree', tree);
router.use('/logs', logs);
router.use('/branches', branches);

export default router;
