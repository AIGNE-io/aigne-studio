import { components } from '@blocklet/sdk/lib/config';
import Ajv from 'ajv';
import Enforcer from 'openapi-enforcer';
import { ParameterObject } from 'openapi3-ts/oas31';
import { joinURL } from 'ufo';

import DataServiceSDK from './sdk';
import { OpenAPIObject } from './types';
import schema from './types/check-protocol';

const ajv = new Ajv();

export * from './request';

export const getBuildInDatasets = async (origin: string) => {
  const componentsWithUrl = components.map((component: any) => joinURL(origin, component.mountPoint));

  const sdk = new DataServiceSDK(componentsWithUrl);
  const list = await sdk.mergeFindServicesResult();

  return list.filter((data) => {
    const { error } = schema.validate(data, { stripUnknown: true });

    if (error) {
      console.error(error);
    }

    return !error;
  });
};

// TODO check 正确性
export const checkParameters = (parameters: ParameterObject[], parametersData: { [key: string]: any }) => {
  const properties: { [key: string]: any } = {};
  const required: string[] = [];
  parameters.forEach((paramSpec) => {
    properties[paramSpec.name] = paramSpec.schema;
    if (paramSpec.required) required.push(paramSpec.name);
  });

  const schema = {
    type: 'object',
    properties,
    required,
  };

  const validate = ajv.compile(schema);
  const valid = validate(parametersData);
  if (!valid) {
    return { isValid: false, message: `Parameter validation failed: ${ajv.errorsText(validate.errors)}.` };
  }

  return { isValid: true, message: 'All parameters are valid.' };
};

export async function validate(document: OpenAPIObject) {
  const result = await Enforcer(document, { fullResult: true, componentOptions: { exceptionSkipCodes: ['EDEV001'] } });

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.warning) {
    throw new Error(result.warning);
  }

  return result.value;
}
