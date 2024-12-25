import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { Memory } from '../core';

const messageSchema = Joi.object({
  role: Joi.string().required(),
  content: Joi.string().required(),
});

const optionsSchema = Joi.object({
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  metadata: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  filters: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
});

const requestSchema = Joi.object({
  messages: Joi.array().items(messageSchema).required(),
  options: optionsSchema.optional(),
});

const searchOptionsSchema = Joi.object({
  k: Joi.number().integer().min(1).optional(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  filters: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
});

const searchRequestSchema = Joi.object({
  query: Joi.string().required(),
  options: searchOptionsSchema.optional(),
});

export function memoryRoutes(router: Router, path: string) {
  const loadMemory = Memory.load({ path });

  router.post('/add', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { messages, options } = await requestSchema.validateAsync(req.body, { stripUnknown: true });
    const result = await memory.add(messages, options);
    res.json(result);
  });

  router.post('/search', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { query, options } = await searchRequestSchema.validateAsync(req.body, { stripUnknown: true });
    const result = await memory.search(query, options);
    res.json(result);
  });

  return router;
}
