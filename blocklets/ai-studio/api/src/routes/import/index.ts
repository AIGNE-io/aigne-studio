import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

import { fromDidSpaces } from './from-did-spaces';
import { importProject } from './import-project';
import { listProjects } from './list-projects';

const importRouter = Router();

importRouter.get('/from-did-spaces/list-projects', user(), listProjects);
importRouter.get('/from-did-spaces/import-project', user(), importProject);
importRouter.get('/from-did-spaces', user(), fromDidSpaces);

export default importRouter;
