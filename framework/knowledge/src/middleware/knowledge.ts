import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';
import { omitBy } from 'lodash';

import { KnowledgeBase } from '../core';

const knowledgeSchema = Joi.object<{
  id?: string;
  name?: string;
  description?: string;
  projectId?: string;
  copyFromProjectId?: string;
  resourceBlockletDid?: string;
  knowledgeId?: string;
  icon?: string;
}>({
  id: Joi.string().allow('').empty(null).default('').optional(),
  name: Joi.string().allow('').empty(null).default('').optional(),
  description: Joi.string().allow('').empty(null).default('').optional(),
  projectId: Joi.string().allow('').empty(null).default('').optional(),
  copyFromProjectId: Joi.string().allow('').empty(null).default('').optional(),
  resourceBlockletDid: Joi.string().allow('').empty(null).default('').optional(),
  knowledgeId: Joi.string().allow('').empty(null).default('').optional(),
  icon: Joi.string().allow('').empty(null).default('').optional(),
});

export function knowledgeRoutes(router: Router, path: string) {
  const loadKnowledge = KnowledgeBase.load(path);

  router.get('/', compression(), async (_req, res) => {
    const knowledge = await loadKnowledge;
    res.json(await knowledge.getInfo());
  });

  router.put('/', compression(), async (req, res) => {
    const knowledge = await loadKnowledge;

    const { name, description, projectId, icon } = await knowledgeSchema.validateAsync(req.body, {
      stripUnknown: true,
    });
    const params = omitBy({ name, description, projectId, icon }, (i) => !i);

    await knowledge.update(params);

    res.json(await knowledge.getInfo());
  });

  router.delete('/', compression(), async (req, res) => {
    const knowledge = await loadKnowledge;
    await knowledge.delete();
    res.json({});
  });

  return router;
}
