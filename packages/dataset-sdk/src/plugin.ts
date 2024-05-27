import { writeFile } from 'fs/promises';

import swaggerJSDoc from 'swagger-jsdoc';
import { stringify } from 'yaml';

function buildOpenAPIPlugin(openapiOptions?: swaggerJSDoc.Options): any {
  return {
    name: 'generate-openapi',
    apply: 'build',
    async buildStart() {
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
      const swaggerSpec = swaggerJSDoc(options) as { paths: any };
      await writeFile('dataset.yml', stringify(swaggerSpec?.paths || []));
      // eslint-disable-next-line no-console
      console.log('OpenAPI Vite builds completed');
    },
  };
}

export default buildOpenAPIPlugin;
