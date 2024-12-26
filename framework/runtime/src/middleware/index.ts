import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { Runtime } from '../runtime';

export function createMiddleware(runtime: Runtime): Router {
  const router = Router();

  const runAgentPayloadSchema = Joi.object<{
    input?: { [key: string]: any };
    options?: {
      stream?: boolean;
    };
  }>({
    input: Joi.object(),
    options: Joi.object({
      stream: Joi.boolean(),
    }),
  });

  router.post('/api/aigne/:projectId/agents/:agentId/run', compression(), async (req, res) => {
    const { projectId, agentId } = req.params;
    if (!projectId || !agentId) throw new Error('projectId and agentId are required');
    if (runtime.id !== projectId) throw new Error('projectId does not match runtime');

    const payload = await runAgentPayloadSchema.validateAsync(req.body, { stripUnknown: true });

    const agent = await runtime.resolve(agentId);

    if (!payload.options?.stream) {
      const result = await agent.run(payload.input ?? {}, payload.options);
      res.json(result);
      return;
    }

    const emit = (data: object) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
      }

      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.flush();
    };

    const stream = await agent.run(payload.input ?? {}, { ...payload.options, stream: true });

    for await (const chunk of stream) {
      emit(chunk);
    }

    res.end();
  });

  router.get('/api/aigne/:projectId/agents/:agentId/definition', async (req, res) => {
    const { projectId, agentId } = req.params;
    if (!projectId || !agentId) throw new Error('projectId and agentId are required');
    if (runtime.id !== projectId) throw new Error('projectId does not match runtime');

    const agent = await runtime.resolve(agentId);

    res.json(agent.definition);
  });

  return router;
}
