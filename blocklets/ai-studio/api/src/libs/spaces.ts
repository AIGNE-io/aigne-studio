import { authClient, wallet } from '@api/libs/auth';
import { SpaceClient } from '@blocklet/did-space-js';
import { isEmpty } from 'lodash';

export async function getSpaceClient(userDid: string): Promise<SpaceClient | null> {
  if (isEmpty(userDid)) {
    return null;
  }

  const { user } = await authClient.getUser(userDid);
  const endpoint = user?.didSpace?.endpoint;
  if (isEmpty(endpoint)) {
    return null;
  }

  const spaceClient = new SpaceClient({
    endpoint,
    wallet,
  });
  return spaceClient;
}
