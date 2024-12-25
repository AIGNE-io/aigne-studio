import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { Memory } from '../core';

const getRequestSchema = Joi.object({
  id: Joi.string().required(),
});

const postRequestSchema = Joi.object({
  data: Joi.string().required(),
  metadata: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
});

const searchRequestSchema = Joi.object({
  query: Joi.string().required(),
  k: Joi.number().optional(),
});

export function vectorRoutes(router: Router, path: string) {
  const loadMemory = Memory.load({ path });

  router.get('/list', compression(), async (req, res) => {
    const memory = await loadMemory;
    const result = await memory.vectorStoreProvider?.list(req.query || {}, 100);
    res.json(result);
  });

  router.get('/search', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { query, k } = await searchRequestSchema.validateAsync(req.query, { stripUnknown: true });
    const result = await memory.vectorStoreProvider?.search(query, k);
    res.json(result);
  });

  router.get('/:id', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { id } = await getRequestSchema.validateAsync(req.params, { stripUnknown: true });
    const result = await memory.vectorStoreProvider?.get(id);
    res.json(result);
  });

  router.post('/:id', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { id } = await getRequestSchema.validateAsync(req.params, { stripUnknown: true });
    const { data, metadata } = await postRequestSchema.validateAsync(req.body, { stripUnknown: true });
    const result = await memory.vectorStoreProvider?.insert(data, id, metadata);
    res.json(result);
  });

  router.put('/:id', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { id } = await getRequestSchema.validateAsync(req.params, { stripUnknown: true });
    const { data, metadata } = await postRequestSchema.validateAsync(req.body, { stripUnknown: true });
    const result = await memory.vectorStoreProvider?.update(id, data, metadata);
    res.json(result);
  });

  router.delete('/:id', compression(), async (req, res) => {
    const memory = await loadMemory;

    const { id } = await getRequestSchema.validateAsync(req.params, { stripUnknown: true });
    const result = await memory.vectorStoreProvider?.delete(id);
    res.json(result);
  });

  return router;
}
