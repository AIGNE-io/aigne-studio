import { Router } from 'express';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { getUsers } from '../libs/user';
import { defaultRepository } from '../store/templates';

const router = Router();

router.get('/:ref/:path(*)?', ensureComponentCallOrAdmin(), async (req, res) => {
  const { ref, path: filepath } = req.params;
  if (!ref) throw new Error('Missing required params `ref`');

  const commits = await defaultRepository.log({ ref, path: filepath });

  const dids = [...new Set(commits.map((i) => i.commit.author.email))];
  const users = await getUsers(dids);

  commits.forEach((i) => {
    const user = users[i.commit.author.email];
    if (user) Object.assign(i.commit.author, user);
  });

  res.json({ commits });
});

export default router;
