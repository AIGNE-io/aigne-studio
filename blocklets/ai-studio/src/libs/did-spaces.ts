import { joinURL, withQuery } from 'ufo';

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

export function getProjectDataUrlInSpace(endpoint: string, projectId: string): string {
  const baseUrl = endpoint.replace(/\/api\/space\/.+/, '');
  const strArray = endpoint.replace(/\/$/, '').split('/');
  const spaceDid = strArray.at(-4) as string;
  const appDid = strArray.at(-2);
  const [, componentDid] = window.blocklet.componentId.split('/');

  return withQuery(joinURL(baseUrl, `space/${spaceDid}/apps/${appDid}/explorer`), {
    key: joinURL(`/apps/${appDid}/.components/${componentDid}/repositories/${projectId}/`),
  });
}
