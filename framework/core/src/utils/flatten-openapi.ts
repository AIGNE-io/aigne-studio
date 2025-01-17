export function flattenApiStructure(apiStructure: {
  paths: {
    [key: string]: {
      [key: string]: {
        'x-id': string;
        'x-did': string;
        'x-path': string;
        'x-method': string;
        type: string;
        summary?: string;
        description?: string;
      };
    };
  };
}): {
  id: string;
  type: string;
  url?: string;
  name?: string;
  did?: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
}[] {
  const paths = apiStructure?.paths || {};

  return Object.entries(paths).flatMap(([, methods]) =>
    Object.entries(methods).map(([, endpoint]) => ({
      id: endpoint['x-id'],
      name: endpoint['x-did'],
      path: endpoint['x-path'],
      method: endpoint['x-method'],
      did: endpoint['x-did'],
      ...endpoint,
    }))
  );
}
