import path from 'path';

import { PathItemObject } from '@blocklet/dataset-sdk/types';
import { Router } from 'express';
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
const swaggerSpec = swaggerJSDoc(options) as any;

router.get('/openapi.json', async (_req, res) => {
  const list: PathItemObject[] = [];

  Object.keys(swaggerSpec.paths).forEach((path) => {
    const pathItem = swaggerSpec.paths[path];

    Object.keys(pathItem).forEach((method) => {
      const info = pathItem[method];
      const { type = '', summary = '', description = '', parameters = '' } = info || {};

      list.push({ path, method, type, summary, description, parameters });
    });
  });

  res.json({ list });
});

router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerSpec, { explorer: true }));

router.get('/openapi', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
