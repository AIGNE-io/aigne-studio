export function flattenApiStructure(apiStructure: {
  paths: {
    [key: string]: {
      [key: string]: any;
    };
  };
}) {
  const flattened: {
    id: string;
    type: string;
    url?: string;
    name?: string;
    did?: string;
    path: string;
    method: string;
    summary: string;
    description: string;
  }[] = [];

  const paths = apiStructure?.paths || {};
  for (const path in paths) {
    for (const method in paths[path]) {
      const endpoint = (paths[path] as any)?.[method];

      flattened.push({
        id: endpoint['x-id'],
        name: endpoint['x-did'],
        path: endpoint['x-path'],
        method: endpoint['x-method'],
        did: endpoint['x-did'],
        ...endpoint,
      });
    }
  }

  return flattened;
}
