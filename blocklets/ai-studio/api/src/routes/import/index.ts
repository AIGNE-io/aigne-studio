import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { importProject } from './import-project';
import { listProjects } from './list-projects';

const importRouter = Router();

importRouter.get('/from-did-spaces/list-projects', user(), listProjects);
importRouter.post('/from-did-spaces/import-project', user(), importProject);

export default importRouter;
