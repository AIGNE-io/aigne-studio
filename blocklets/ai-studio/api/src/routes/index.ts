import { initLocalStorageServer } from '@blocklet/uploader/middlewares';
import express, { Router } from 'express';

import { Config } from '../libs/env';
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

// init uploader server
const localStorageServer = initLocalStorageServer({
  path: Config.uploadDir,
  express,
  onUploadFinish: async (req: any, res: any, uploadMetadata: any) => {
    console.warn(1111, req.query, uploadMetadata.runtime.absolutePath);

    return {
      ...uploadMetadata,
      abc: true,
    };
  },
  // only for debug uploader
  // onUploadCreate(req, res, uploadMetadata) {
  //   console.warn(uploadMetadata);
  //   throw new Error('debug error');
  // },
});

router.use('/uploads', localStorageServer.handle);

export default router;
