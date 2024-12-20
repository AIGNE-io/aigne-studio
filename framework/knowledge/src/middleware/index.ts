import compression from 'compression';
import { Router } from 'express';

import { documentRoutes } from './document';
import { knowledgeRoutes } from './knowledge';
import { segmentRoutes } from './segment';

export function createMiddleware({ path }: { path: string }) {
  const router = Router();

  router.use(compression());

  router.use('/aigne-knowledge', knowledgeRoutes(router, path));
  router.use('/aigne-knowledge/documents', documentRoutes(router, path));
  router.use('/aigne-knowledge/segments', segmentRoutes(router, path));

  return router;
}
