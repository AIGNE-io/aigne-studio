import path from 'path';

import { Router } from 'express';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { getUsers } from '../libs/user';
import { getRepository } from '../store/projects';

export function logRoutes(router: Router) {
  router.get('/projects/:projectId/logs/:ref/:path(*)?', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId, ref, path: p } = req.params;
    if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

    const repository = getRepository(projectId);

    const filepath = p && (await repository.findFile(path.parse(p).name, { ref }));
    if (p && !filepath) {
      res.json({ commits: [] });
      return;
    }

    const commits = await repository.log({ ref, path: filepath });

    const dids = [...new Set(commits.map((i) => i.commit.author.email))];
    const users = await getUsers(dids);

    commits.forEach((i) => {
      const user = users[i.commit.author.email];
      if (user) Object.assign(i.commit.author, user);
    });

    res.json({ commits });
  });
}
