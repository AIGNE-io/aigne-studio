import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { KnowledgeBase } from '../core';

const documentIdSchema = Joi.object<{ documentId: string }>({
  documentId: Joi.string().required(),
});

export function segmentRoutes(router: Router, path: string) {
  const loadKnowledge = KnowledgeBase.load(path);

  router.get('/:documentId', compression(), async (req, res) => {
    const { documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

    const knowledge = await loadKnowledge;
    const segments = await knowledge.getSegments(documentId);
    res.json(segments);
  });

  router.get('/:documentId', compression(), async (req, res) => {
    const { documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });

    const knowledge = await loadKnowledge;
    await knowledge.removeSegments(documentId);

    res.json({});
  });

  return router;
}
