import { OperationObject, ParameterObject, RequestBodyObject, ResponsesObject } from 'openapi3-ts/oas31';

export * from 'openapi3-ts/oas31';

export interface PathItemObject extends Omit<OperationObject, 'responses'> {
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
}
