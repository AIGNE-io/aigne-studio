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
    const uniqueProjectIds = [...new Set(projectIds)];
    const [users, runs] = await Promise.all([
      Session.countUniqueUsersPerProject(uniqueProjectIds),
      History.countRunsPerProject(uniqueProjectIds),
    ]);
    const result = projectIds.map((projectId) => ({
      projectId,
      totalRuns: runs[projectId] || 0,
      totalUsers: users[projectId] || 0,
    }));
    res.json(result);
  });
}
