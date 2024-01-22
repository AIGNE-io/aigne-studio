import path from 'path';

import SwaggerParser from '@apidevtools/swagger-parser';
import { Router } from 'express';
import Joi from 'joi';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import VectorStore from '../../store/vector-store';

const router = Router();

const datasetSchema = Joi.object<{ vectorId: string; messageString: string }>({
  vectorId: Joi.string().required(),
  messageString: Joi.string().required(),
});

router.get('/search', async (req, res) => {
  const input = await datasetSchema.validateAsync(req.query);
  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(input.vectorId, embeddings);
  const docs = await store.similaritySearch(input.messageString, 4);

  const context = docs.map((i) => i.pageContent).join('\n');
  const contextTemplate = context
    ? `Use the following pieces of context to answer the users question.
  If you don't know the answer, just say that you don't know, don't try to make up an answer.
  ----------------
  ${context}`
    : '';

  res.json({ role: 'system', content: contextTemplate });
});

router.get('/data-protocol', async (_req, res) => {
  const yamlPath = path.join(__dirname, '/dataset.yaml');
  const api = await SwaggerParser.dereference(yamlPath);

  const list: any[] = [];

  Object.keys(api.paths).forEach((path) => {
    const pathItem = api.paths[path];

    Object.keys(pathItem).forEach((method) => {
      const info = pathItem[method];
      const { type = '', summary = '', description = '', parameters = '' } = info || {};

      list.push({ path, method, type, summary, description, parameters });
    });
  });

  res.json({ list, api });
});

export default router;
