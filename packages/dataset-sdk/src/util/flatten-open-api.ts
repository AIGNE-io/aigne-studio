/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import { OpenAPIObject } from '../types';

function flattenApiStructure(apiStructure: OpenAPIObject) {
  const flattened = [];

  const paths = apiStructure?.paths || {};
  for (const path in paths) {
    for (const method in paths[path]) {
      const endpoint = (paths[path] as any)?.[method];
      flattened.push({ 'x-url': path, 'x-method': method, id: endpoint['x-id'], path, method, ...endpoint });
    }
  }

  return flattened;
}

export default flattenApiStructure;
