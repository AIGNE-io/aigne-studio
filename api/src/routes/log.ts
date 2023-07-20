import { Router } from 'express';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { getUsers } from '../libs/user';
import { getRepository } from '../store/projects';

export function logRoutes(router: Router) {
  router.get('/projects/:projectId/logs/:ref/:path(*)?', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId, ref, path: filepath } = req.params;
    if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

    const commits = await getRepository(projectId).log({ ref, path: filepath });

    const dids = [...new Set(commits.map((i) => i.commit.author.email))];
    const users = await getUsers(dids);

    commits.forEach((i) => {
      const user = users[i.commit.author.email];
      if (user) Object.assign(i.commit.author, user);
    });

    res.json({ commits });
  });
}
