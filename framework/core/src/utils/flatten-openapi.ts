export function flattenApiStructure(apiStructure: {
  paths: {
    [key: string]: {
      [key: string]: any;
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
  summary: string;
  description: string;
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
