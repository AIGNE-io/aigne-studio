import { Router } from 'express';
import Enforcer from 'openapi-enforcer';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { COLLECTION, DOCS_API, OPENAPI_API } from './const';
import { DatasetObject, OpenAPIObject } from './types';
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

const createSwaggerRouter = (blockletName: string, openapiOptions?: swaggerJSDoc.Options) => {
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
        const { type = '', summary = '', description = '', parameters = '', requestBody } = info || {};

        return { id, path, method, type, summary, description, parameters, requestBody };
      })
    );

    res.json({ list });
  });

  router.use('/docs', swaggerUi.serve);
  router.get('/docs', swaggerUi.setup(swaggerSpec, { explorer: true }));

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

export default createSwaggerRouter;
