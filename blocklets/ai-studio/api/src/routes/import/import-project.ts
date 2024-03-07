import { authClient } from '@api/libs/auth';
import { env } from '@blocklet/sdk/lib/config';
import { SpaceClient, SpaceEndpointContext } from '@did-space/client';
import { Request, Response } from 'express';
import { joinURL } from 'ufo';

export async function ImportProject(req: Request, res: Response) {
  const { did } = req.user!;
  const { user } = await authClient.getUser(did);
  const endpoint = user?.didSpace?.endpoint;
  const context: SpaceEndpointContext = await SpaceClient.getSpaceEndpointContext(endpoint);

  const querystring = `spaceDid=${context.spaceDid}&appDid=${context.appDid}&componentDid=${env.componentDid}&redirectUrl=${encodeURI(req.headers.referer as string)}`;

  return res.redirect(joinURL(context.baseUrl, `import?${querystring}`));
}
