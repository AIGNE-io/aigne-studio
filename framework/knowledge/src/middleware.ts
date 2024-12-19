import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

export function createMiddleware({ path }: { path: string }) {
  const router = Router();

  router.post('/aigne/:projectId/agents/:agentId/run', compression(), async (req, res) => {});

  return router;
}
