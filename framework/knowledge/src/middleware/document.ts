import { CreateDiscussionItem } from '@aigne/core';
import compression from 'compression';
import { Router } from 'express';
import Joi from 'joi';

import { KnowledgeBase } from '../core';

const documentIdSchema = Joi.object<{ documentId: string }>({
  documentId: Joi.string().required(),
});

const idsSchema = Joi.object<{ ids: string[] }>({
  ids: Joi.array().items(Joi.string()).required(),
});

const getDocumentsSchema = Joi.object<{ page: number; size: number }>({
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(100).default(20),
});

const fileSchema = Joi.object<{
  filename: string;
  name: string;
  size: number;
}>({
  filename: Joi.string().required(),
  name: Joi.string().allow('').default(''),
  size: Joi.number().required(),
});

const customDocumentSchema = Joi.object<{ title: string; content: string }>({
  title: Joi.string().required(),
  content: Joi.string().required(),
});

const createItemsSchema = Joi.object<{ name: string; data: CreateDiscussionItem['data'] }>({
  name: Joi.string().empty(['', null]),
  data: Joi.object({
    from: Joi.string().valid('discussion', 'board', 'discussionType').required(),
    type: Joi.string().valid('discussion', 'blog', 'doc').optional(),
    title: Joi.string().allow('', null).required(),
    id: Joi.string().required(),
    boardId: Joi.string().allow('', null).default(''),
  }).required(),
});

const crawlSchema = Joi.object<{ provider: 'jina' | 'firecrawl'; url: string }>({
  provider: Joi.string().valid('jina', 'firecrawl').required(),
  url: Joi.string().required(),
});

const combinedSchema = Joi.alternatives().try(
  fileSchema.description('file'),
  customDocumentSchema.description('document'),
  createItemsSchema.description('items'),
  crawlSchema.description('crawl')
);

const searchQuerySchema = Joi.object<{ message: string; n: number }>({
  message: Joi.string().empty(['', null]),
  n: Joi.number().empty(['', null]).min(1).default(4),
});

export function documentRoutes(router: Router, path: string) {
  const loadKnowledge = KnowledgeBase.load(path);

  router.get('/', compression(), async (req, res) => {
    const { page, size } = await getDocumentsSchema.validateAsync(req.query, { stripUnknown: true });
    const knowledge = await loadKnowledge;

    const documents = await knowledge.getDocuments({}, page, size);
    res.json(documents);
  });

  router.get('/:documentId', compression(), async (req, res) => {
    const { documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });
    const knowledge = await loadKnowledge;

    const document = await knowledge.getDocument(documentId);
    res.json(document);
  });

  router.post('/', compression(), async (req, res) => {
    const input = await combinedSchema.validateAsync(req.body, { stripUnknown: true });

    const knowledge = await loadKnowledge;

    const document = await knowledge.addDocuments(input);

    res.json(document);
  });

  router.delete('/:documentId', compression(), async (req, res) => {
    const { documentId } = await documentIdSchema.validateAsync(req.params, { stripUnknown: true });
    const knowledge = await loadKnowledge;

    await knowledge.removeDocument(documentId);

    res.json({});
  });

  router.delete('/', compression(), async (req, res) => {
    const { ids } = await idsSchema.validateAsync(req.body, { stripUnknown: true });
    const knowledge = await loadKnowledge;

    await knowledge.removeDocuments(ids);

    res.json({});
  });

  router.get('/search', compression(), async (req, res) => {
    const { message, n } = await searchQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const knowledge = await loadKnowledge;

    const documents = await knowledge.search({ query: message, k: n });

    res.json(documents);
  });

  router.post('/run', compression(), async (req, res) => {
    const { message, n } = await searchQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const knowledge = await loadKnowledge;

    const result = await knowledge.run({ query: message, k: n }, { stream: false });
    res.json(result);
  });

  return router;
}
