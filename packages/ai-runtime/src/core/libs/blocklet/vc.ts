import { ResponseRole, UserInfo } from '@abtnode/client';

import { authService } from '../../../lib/auth';

export async function issueVC({
  userDid,
  name,
  title,
  description,
  reissue = false,
  displayUrl,
  notify = true,
}: {
  userDid: string;
  name: string;
  title: string;
  description: string;
  reissue?: boolean;
  displayUrl?: string;
  notify?: boolean;
}): Promise<{ user: UserInfo; vc: object }> {
  await createPassportIfNotExist({ name, title, description });

  const userResult = await authService.getUser(userDid, { includeTags: true });
  if (!userResult.user) throw new Error(`User not found ${userDid}`);

  if (!reissue) {
    const vc = userResult.user.passports.find((p) => p.role === name);
    if (vc) return { user: userResult.user, vc };
  }

  const issueResult = await authService.issuePassportToUser({
    userDid,
    role: name,
    display: displayUrl ? { type: 'url', content: displayUrl } : undefined,
    notify,
  });

  if (issueResult.code !== ('ok' as any)) throw new Error(`Issue VC failed got ${issueResult.code}`);

  const vc = issueResult.user.passports.findLast((p) => p.role === name);
  if (!vc) throw new Error('Issue VC got empty result');

  return { user: issueResult.user, vc };
}

const CREATE_PASSPORT_TASKS: { [name: string]: Promise<ResponseRole> } = {};

async function createPassportIfNotExist({
  name,
  title,
  description,
}: {
  name: string;
  title: string;
  description: string;
}) {
  CREATE_PASSPORT_TASKS[name] ??= (async () => {
    try {
      let result = await authService.getRole(name);

      if (!result.role) {
        // Create a role for custom display
        result = await authService.createRole({
          title,
          name,
          description,
          permissions: [],
          extra: JSON.stringify({
            display: 'custom',
            types: [name],
          }),
        });
      }

      return result;
    } catch (error) {
      // NOTE: reset task if failed
      delete CREATE_PASSPORT_TASKS[name];
      throw error;
    }
  })();

  return CREATE_PASSPORT_TASKS[name]!;
}
