import isEmpty from 'lodash/isEmpty';
import { joinURL, withQuery } from 'ufo';

import api from './api';

export function didSpaceReady(user: any) {
  if (!user?.didSpace?.endpoint) {
    return false;
  }

  if (!window.blocklet) {
    return false;
  }

  const { componentMountPoints } = window.blocklet;
  // @ts-expect-error 暂时还没有这个属性,升级之后就有了
  return componentMountPoints.some((c) => c?.capabilities?.didSpace === 'requiredOnConnect');
}

export function getDidConnectStr(userDid: string) {
  return Buffer.from(
    JSON.stringify({
      forceConnected: userDid,
      switchBehavior: 'auto',
      showClose: false,
    }),
    'utf8'
  ).toString('base64');
}

export async function getProjectDataUrlInSpace(endpoint: string, projectId: string): Promise<string> {
  if (isEmpty(endpoint)) {
    return '';
  }

  const spaceInfo = await getSpaceInfo(endpoint);
  const { spaceOwnerDid } = spaceInfo;
  const baseUrl = endpoint.replace(/\/api\/space\/.+/, '');
  const strArray = endpoint.replace(/\/$/, '').split('/');
  const spaceDid = strArray.at(-4) as string;
  const appDid = strArray.at(-2);
  const [, componentDid]: string[] = window.blocklet.componentId.split('/');

  return withQuery(joinURL(baseUrl, `space/${spaceDid}/apps/${appDid}/explorer`), {
    key: joinURL(`/apps/${appDid}/.components/${componentDid}/repositories/${projectId}/`),
    // 携带 space 用户信息
    '__did-connect__': getDidConnectStr(spaceOwnerDid),
  });
}

export interface SpaceEndpointContext {
  baseUrl: string;

  spaceDid: string;

  appDid: string;
}

function getSpaceEndpointContext(endpoint: string): SpaceEndpointContext {
  const baseUrl = endpoint.replace(/\/api\/space.*/, '');

  const strArray = endpoint.replace(/\/$/, '').split('/');
  const spaceDid = strArray.at(-4) as string;
  const appDid = strArray.at(-2) as string;

  return {
    baseUrl,
    spaceDid,
    appDid,
  };
}

/**
 * @description 获取空间信息
 * @export
 * @param {string} endpoint
 * @return {*}  {Promise<{ ownerDid: string }>}
 */
export async function getSpaceInfo(endpoint: string) {
  const { headers } = await api.head(`${endpoint}`, {
    timeout: 1000 * 120,
  });

  return {
    spaceOwnerDid: headers['x-space-owner-did'],
  };
}

/**
 * @description 获取 DID Spaces 的导入链接
 * @export
 * @param {string} endpoint
 * @param {{ redirectUrl: string }} options
 * @return {*}  {Promise<string>}
 */
export async function getImportUrl(endpoint: string, options: { redirectUrl: string }): Promise<string> {
  if (isEmpty(endpoint)) {
    return '';
  }
  const { spaceOwnerDid } = await getSpaceInfo(endpoint);
  const [, componentDid]: string[] = window.blocklet.componentId.split('/');
  const { spaceDid, appDid, baseUrl }: SpaceEndpointContext = getSpaceEndpointContext(endpoint);
  const importUrl = withQuery(joinURL(baseUrl, 'import'), {
    spaceDid,
    appDid,
    componentDid,
    // 携带 space 用户信息
    '__did-connect__': getDidConnectStr(spaceOwnerDid),
    ...options,
  });

  return importUrl;
}
