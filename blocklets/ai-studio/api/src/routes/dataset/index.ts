import path from 'path';

import SwaggerParser from '@apidevtools/swagger-parser';
import { getDatasetProtocols } from '@blocklet/dataset-sdk';
import { env } from '@blocklet/sdk/lib/config';
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

  const paths = Object.keys(api.paths);
  const list: any[] = [];

  paths.forEach((path) => {
    const pathItem = api.paths[path];
    const methods = Object.keys(pathItem);

    methods.forEach((method) => {
      const info = pathItem[method];

      list.push({
        url: path,
        method,
        type: info?.type,
        summary: info?.summary,
        description: info?.description,
        parameters: info?.parameters ? info?.parameters : [],
      });
    });
  });

  res.json({ list, api });
});

router.get('/list', async (_req, res) => {
  const list = await getDatasetProtocols(env.appUrl);

  res.json({ list });
});

export default router;
