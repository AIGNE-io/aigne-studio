import type { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { getUsers } from '../libs/user';
import { getRepository } from '../store/repository';

export const getCommits = async ({
  projectId,
  ref,
  filepath,
}: {
  projectId: string;
  ref: string;
  filepath?: string;
}) => {
  const repository = await getRepository({ projectId });
  const commits = await repository.log({ ref, filepath });

  const dids = [...new Set(commits.map((i) => i.commit.author.email))];
  const users = await getUsers(dids);

  return commits.map((i) => {
    const user = users[i.commit.author.email];
    return { ...i, commit: { ...i.commit, author: { ...i.commit.author, ...user } } };
  });
};

export function logRoutes(router: Router) {
  router.get('/projects/:projectId/logs/:ref/:filepath(*)?', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId, ref, filepath } = req.params;
    if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

    const commits = await getCommits({ projectId, ref, filepath });

    res.json({ commits });
  });
}
