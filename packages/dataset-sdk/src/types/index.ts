import { ParameterObject, RequestBodyObject, ResponsesObject } from 'openapi3-ts/oas31';

export * from 'openapi3-ts/oas31';

export interface PathItemObject {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: ResponsesObject;
}

export interface DatasetObject extends PathItemObject {
  id: string;
  type: string;
  url?: string;
  name?: string;
}
