import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { importProject } from './import-project';
import { listProjects } from './list-projects';

const importRouter = Router();

importRouter.get('/from-did-spaces/list-projects', middlewares.session(), listProjects);
importRouter.post('/from-did-spaces/import-project', middlewares.session(), importProject);

export default importRouter;
