import path from 'path';

import { validate } from '@blocklet/dataset-sdk';
import { DatasetObject, OpenAPIObject } from '@blocklet/dataset-sdk/types';
import { Router } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = Router();
const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

const options = {
  failOnErrors: true,
  definition: { openapi: '3.0.0', info: { title: 'AI Studio Dataset Protocol', version: '1.0.0' } },
  apis: [path.join(__dirname, './**/*.*')],
};
const swaggerSpec = swaggerJSDoc(options) as OpenAPIObject;

router.get('/openapi.json', async (_req, res) => {
  await validate(swaggerSpec);

  const list: DatasetObject[] = Object.entries(swaggerSpec.paths || {}).flatMap(([path, pathItem]) =>
    Object.entries(pathItem).map(([method, info]) => {
      const { type = '', summary = '', description = '', parameters = '' } = info || {};
      return { id: `${AI_STUDIO_DID}:${path}:${method}`, path, method, type, summary, description, parameters };
    })
  );

  res.json({ list });
});

// FIXME: 单独启动可以，但是挂载访问失败
router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerSpec, { explorer: true }));

router.get('/openapi', async (_req, res) => {
  try {
    await validate(swaggerSpec);
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

export default router;
