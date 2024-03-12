import { readFile, writeFile } from 'fs/promises';

import { Router } from 'express';
import Enforcer from 'openapi-enforcer';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { parse, stringify } from 'yaml';

import { COLLECTION, DOCS_API, OPENAPI_API } from './const';
import { DatasetObject, OpenAPIObject, PathItemObject } from './types';
import { getBuildInDatasets } from '.';

export async function validate(document: OpenAPIObject) {
  const result = await Enforcer(document, { fullResult: true, componentOptions: { exceptionSkipCodes: ['EDEV001'] } });

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.warning) {
    throw new Error(result.warning);
  }

  return result.value;
}

export const createSwaggerRouter = (blockletName: string, openapiOptions?: swaggerJSDoc.Options) => {
  const router = Router();

  if (!blockletName) {
    throw new Error('blockletName must be provided to createSwaggerRouter');
  }

  const options = Object.assign(
    { failOnErrors: true, definition: { openapi: '3.0.0', info: { title: 'Dataset Protocol', version: '1.0.0' } } },
    openapiOptions || {}
  );
  const swaggerSpec = swaggerJSDoc(options) as OpenAPIObject;

  router.get(`/${OPENAPI_API}`, async (_req, res) => {
    await validate(swaggerSpec);

    const list: DatasetObject[] = Object.entries(swaggerSpec.paths || {}).flatMap(([path, pathItem]) =>
      Object.entries(pathItem).map(([method, info]) => {
        const id = `${blockletName}:${path}:${method}`;
        return { id, path, method, ...(info || {}) };
      })
    );

    res.json({ list });
  });

  router.use('/docs', swaggerUi.serve);
  router.get('/docs', swaggerUi.setup(swaggerSpec, { explorer: true }));

  router.get('/download-dataset', async (req, res) => {
    const result = stringify(swaggerSpec.paths);
    await writeFile(req.query.path as string, result);
    res.json(result);
  });

  router.get(`/${DOCS_API}`, async (_req, res) => {
    try {
      await validate(swaggerSpec);
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    } catch (error) {
      res.status(500).json({ error: { message: error.message } });
    }
  });

  router.get(`/${COLLECTION}`, async (_req, res) => {
    res.json(await getBuildInDatasets());
  });

  return router;
};

export const createDatasetAPIRouter = (blockletName: string, filePath: string) => {
  const router = Router();

  if (!blockletName) {
    throw new Error('blockletName must be provided to createSwaggerRouter');
  }

  router.get(`/${OPENAPI_API}`, async (_req, res) => {
    const json: { [keyof: string]: PathItemObject } = parse(await readFile(filePath).toString());

    const list: DatasetObject[] = Object.entries(json || {}).flatMap(([path, pathItem]) =>
      Object.entries(pathItem).map(([method, info]) => {
        const id = `${blockletName}:${path}:${method}`;
        return { id, path, method, ...(info || {}) };
      })
    );

    res.json({ list });
  });

  router.get(`/${COLLECTION}`, async (_req, res) => {
    res.json(await getBuildInDatasets());
  });

  return router;
};
