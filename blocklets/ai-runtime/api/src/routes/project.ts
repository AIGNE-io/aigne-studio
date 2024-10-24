import { ensureComponentCallOrAdmin } from '@api/libs/security';
import History from '@api/store/models/history';
import Session from '@api/store/models/session';
import { Router } from 'express';
import Joi from 'joi';

const getProjectStatsSchema = Joi.object<{ projectIds: string[] }>({
  projectIds: Joi.array().items(Joi.string()).required(),
});

export function projectRoutes(router: Router) {
  router.post('/projects/stats', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectIds } = await getProjectStatsSchema.validateAsync(req.body, { stripUnknown: true });
    const users = await Session.countUniqueUsersPerProject(projectIds);
    const runs = await History.countRunsPerProject(projectIds);
    const result = projectIds.map((id) => ({
      id,
      totalRuns: runs[id] || 0,
      totalUsers: users[id] || 0,
    }));
    res.json(result);
  });
}
