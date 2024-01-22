import { components } from '@blocklet/sdk/lib/config';
import Ajv from 'ajv';
import { ParameterObject } from 'openapi3-ts/oas31';
import { joinURL } from 'ufo';

import DataServiceSDK from './sdk';

const ajv = new Ajv();

export default {};

export const getDatasetProtocols = async (origin: string) => {
  const componentsWithUrl = components.map((component: any) => joinURL(origin, component.mountPoint));

  const sdk = new DataServiceSDK(componentsWithUrl);
  const list = await sdk.mergeFindServicesResult();

  return list;
};

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

export const getRequestConfig = (
  pathItem: {
    url: string;
    href: string;
    path: string;
    method: string;
    parameters: ParameterObject[];
  },
  parametersData: { [key: string]: any }
) => {
  let url = pathItem.href;
  for (const parameter of pathItem.parameters) {
    if (parameter.in === 'path') {
      url = url.replace(`{${parameter.name}}`, parametersData[parameter.name]);
    }
  }

  const config: {
    url: string;
    method: string;
    headers: { [key: string]: any };
    params: { [key: string]: any };
    data: { [key: string]: any };
  } = {
    method: pathItem.method,
    url,
    headers: {},
    params: {},
    data: {},
  };

  // 根据参数位置（query, header, body）添加到请求配置
  for (const parameter of pathItem.parameters) {
    if (parameter.in === 'query') {
      config.params[parameter.name] = parametersData[parameter.name];
    } else if (parameter.in === 'header') {
      config.headers[parameter.name] = parametersData[parameter.name];
      // @ts-ignore
    } else if (parameter.in === 'body') {
      // 自定义扩展，OPENAPI 中没有
      config.data = parametersData[parameter.name];
    }
  }

  return config;
};
