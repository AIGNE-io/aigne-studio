import { Router } from 'express';

import ai from './ai';
import datasetItems from './dataset-items';
import datasets from './datasets';
import folders from './folders';
import importRouter from './import';
import sdk from './sdk';
import tags from './tags';
import templates from './templates';

const router = Router();

router.use('/ai', ai);
router.use('/templates', templates);
router.use('/sdk', sdk);
router.use('/tags', tags);
router.use('/folders', folders);
router.use('/import', importRouter);
router.use('/datasets', datasets);
router.use('/datasets', datasetItems);

export default router;
