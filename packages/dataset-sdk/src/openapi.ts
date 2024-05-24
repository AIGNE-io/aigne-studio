import { readFile, writeFile } from 'fs/promises';

import { Router } from 'express';
import Enforcer from 'openapi-enforcer';
import swaggerJSDoc from 'swagger-jsdoc';
// import swaggerUi from 'swagger-ui-express';
import { parse, stringify } from 'yaml';

import { COLLECTION, DOWNLOAD, OPENAPI_API } from './const';
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

export const createDatasetAPIRouter = (
  blockletName: string,
  filePath: string,
  openapiOptions?: swaggerJSDoc.Options
) => {
  const router = Router();

  if (!blockletName) {
    throw new Error('blockletName must be provided to createSwaggerRouter');
  }

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'API Find Protocol',
        version: '1.0.0',
      },
    },
    failOnErrors: true,
    ...(openapiOptions || {}),
  };

  const swaggerSpec = swaggerJSDoc(options) as OpenAPIObject;

  router.get(DOWNLOAD, async (_req, res) => {
    const result = stringify(swaggerSpec.paths);
    await writeFile(filePath, result);
    res.json({ apis: swaggerSpec.paths });
  });

  router.get(`/${OPENAPI_API}`, async (_req, res) => {
    const json: { [keyof: string]: PathItemObject } = parse((await readFile(filePath)).toString());

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
