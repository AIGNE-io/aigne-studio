import { OperationObject, ParameterObject, RequestBodyObject } from 'openapi3-ts/oas31';

export * from 'openapi3-ts/oas31';

export interface PathItemObject extends OperationObject {
  path: string;
  method: string;
  type: string;
  summary?: string;
  description?: string;
  parameters: ParameterObject[];
  requestBody?: RequestBodyObject;
}

export interface PathItemWithUrlObject extends PathItemObject {
  url: string;
  href: string;
}
