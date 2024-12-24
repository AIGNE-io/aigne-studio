import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { AIGNERuntime, Agent } from './runtime';

export function createMiddleware({ path }: { path: string }): Router {
  const router = Router();

  const runtime = AIGNERuntime.load({ path });

  const runAgentPayloadSchema = Joi.object<{
    inputs?: { [key: string]: any };
    options?: {
      stream?: boolean;
    };
  }>({
    inputs: Joi.object(),
    options: Joi.object({
      stream: Joi.boolean(),
    }),
  });

  router.post('/aigne/:projectId/agents/:agentId/run', compression(), async (req, res) => {
    const { projectId, agentId } = req.params;
    if (!projectId || !agentId) throw new Error('projectId and agentId are required');

    const payload = await runAgentPayloadSchema.validateAsync(req.body, { stripUnknown: true });

    const r = await runtime;
    if (r.id !== projectId) throw new Error('projectId does not match runtime');

    const agent = new Agent(r.project, req.params.agentId);

    if (!payload.options?.stream) {
      const result = await agent.run(payload.inputs ?? {}, payload.options);
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

    const stream = await agent.run(payload.inputs ?? {}, { ...payload.options, stream: true });

    for await (const chunk of stream) {
      emit(chunk);
    }

    res.end();
  });

  return router;
}
