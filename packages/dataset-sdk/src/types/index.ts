import { ParameterObject } from 'openapi3-ts/oas31';

export interface PathItemObject {
  path: string;
  method: string;
  type: string;
  summary?: string;
  description?: string;
  parameters: ParameterObject[];
}

export interface PathItemWithUrlObject extends PathItemObject {
  url: string;
  href: string;
}
