import path from 'path';

import { validate } from '@blocklet/dataset-sdk';
import { OpenAPIObject } from '@blocklet/dataset-sdk/types';
import { Router } from 'express';
import { sha3_256 } from 'js-sha3';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const router = Router();

const options = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: { title: 'AI Studio Dataset Protocol', version: '1.0.0' },
  },
  apis: [path.join(__dirname, './**/*.*')],
};
const swaggerSpec = swaggerJSDoc(options) as OpenAPIObject;

router.get('/openapi.json', async (_req, res) => {
  await validate(swaggerSpec);

  const list = Object.entries(swaggerSpec.paths || {}).flatMap(([path, pathItem]) =>
    Object.entries(pathItem).map(([method, info]) => {
      const { type = '', summary = '', description = '', parameters = '' } = info || {};
      return { id: sha3_256(`${path}-${method}`), path, method, type, summary, description, parameters };
    })
  );

  res.json({ list });
});

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
