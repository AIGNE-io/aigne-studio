import { NoSuchEntryAgentError, NotFoundError } from '@api/libs/error';
import { getAgentSecretInputs, getProjectStatsFromRuntime } from '@api/libs/runtime';
import { ensurePromptsAdmin } from '@api/libs/security';
import { getUser, getUsers } from '@api/libs/user';
import Project from '@api/store/models/project';
import { PROJECT_FILE_PATH, ProjectRepo, getEntryFromRepository, getRepository } from '@api/store/repository';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { Assistant, ProjectSettings } from '@blocklet/ai-runtime/types';
import { Agent } from '@blocklet/aigne-sdk/api/agent';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { NextFunction, Request, Response, Router } from 'express';
import Joi from 'joi';
import pick from 'lodash/pick';

import { ensureAdmin } from '../libs/security';
import checkUserAuth from '../libs/user-auth';
import Category from '../store/models/category';
import Deployment from '../store/models/deployment';
import DeploymentCategory from '../store/models/deployment-category';

const router = Router();

const deploymentSchema = Joi.object({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
  access: Joi.string().valid('private', 'public').required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
});

const searchByCategorySlugSchema = Joi.object({
  categorySlug: Joi.string().required(),
});

const recommendSchema = paginationSchema.concat(
  Joi.object({
    categoryId: Joi.string().optional(),
    access: Joi.string().valid('private', 'public').optional(),
  })
);

const updateSchema = Joi.object({
  access: Joi.string().valid('private', 'public').optional(),
  orderIndex: Joi.number().integer().empty(null).optional(),
  productHuntUrl: Joi.string().allow('').empty([null, '']).optional(),
  productHuntBannerUrl: Joi.string().allow('').empty([null, '']).optional(),
}).min(1);

const getByIdSchema = Joi.object({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
});

const deploymentIdSchema = Joi.object({ id: Joi.string().required() });

router.get('/byProjectId', middlewares.session(), middlewares.auth(), async (req, res) => {
  const { projectId, projectRef } = await getByIdSchema.validateAsync(req.query, { stripUnknown: true });
  const deployment = await Deployment.findOne({
    where: { projectId, projectRef },
    include: [
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
      },
    ],
  });

  if (!deployment) {
    res.json(null);
    return;
  }

  res.json(deployment);
});

router.get('/', middlewares.session(), ensureAdmin, async (req, res) => {
  const { page, pageSize } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });
  const offset = (page - 1) * pageSize;

  const { count, rows } = await Deployment.findAndCountAll({
    limit: pageSize,
    offset,
    order: [
      ['orderIndex', 'ASC'],
      ['updatedAt', 'DESC'],
    ],
    include: [
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
        attributes: ['id', 'name', 'slug'],
        required: false,
      },
      {
        model: Project,
        attributes: [],
        required: true,
      },
    ],
    distinct: true,
  });

  const enhancedDeployments = await Promise.all(
    rows.map(async (deployment) => {
      const repository = await getRepository({ projectId: deployment.projectId });
      const project = await repository.readAndParseFile<ProjectSettings>({
        ref: deployment.projectRef,
        filepath: PROJECT_FILE_PATH,
        readBlobFromGitIfWorkingNotInitialized: true,
      });

      return {
        ...deployment.dataValues,
        project,
      };
    })
  );

  res.json({
    list: enhancedDeployments,
    totalCount: count,
  });
});

router.get('/recommend-list', async (req, res) => {
  const { page, pageSize, categoryId, access } = await recommendSchema.validateAsync(req.query, { stripUnknown: true });
  const offset = (page - 1) * pageSize;

  const query: { [key: string]: any } = {
    include: [
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
      },
      {
        model: Project,
        attributes: [],
        required: true,
      },
    ],
    limit: pageSize,
    offset,
    order: [
      ['orderIndex', 'ASC'],
      ['updatedAt', 'DESC'],
    ],
    distinct: true,
  };

  if (access) {
    query.where = { access };
  }

  if (categoryId) {
    query.include[0].where = { id: categoryId };
  }

  const { count, rows } = await Deployment.findAndCountAll(query);
  const [stats, users] = await Promise.all([
    getProjectStatsFromRuntime({ projectIds: rows.map((d) => d.projectId) }),
    getUsers(rows.map((d) => d.createdBy)),
  ]);
  const statsMap = new Map(stats.map((s) => [s.projectId, s]));

  const enhancedDeployments = await Promise.all(
    rows.map(async (deployment) => {
      const repository = await getRepository({ projectId: deployment.projectId });
      const project = await repository.readAndParseFile<ProjectSettings>({
        ref: deployment.projectRef,
        filepath: PROJECT_FILE_PATH,
        readBlobFromGitIfWorkingNotInitialized: true,
      });

      return {
        ...deployment.dataValues,
        project,
        stats: statsMap.get(deployment.projectId),
        createdByInfo: users[deployment.createdBy],
      };
    })
  );

  res.json({
    list: enhancedDeployments,
    totalCount: count,
  });
});

router.get('/categories/:categorySlug', async (req, res) => {
  const { categorySlug } = await searchByCategorySlugSchema.validateAsync(req.params, { stripUnknown: true });
  const { page, pageSize } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });

  const offset = (page - 1) * pageSize;

  const { count, rows } = await Deployment.findAndCountAll({
    include: [
      {
        model: Category,
        as: 'categories',
        where: { slug: categorySlug },
        through: { attributes: [] },
      },
      {
        model: Project,
        attributes: [],
        required: true,
      },
    ],
    limit: pageSize,
    offset,
    order: [
      ['orderIndex', 'ASC'],
      ['updatedAt', 'DESC'],
    ],
    distinct: true,
  });

  const [stats, users] = await Promise.all([
    getProjectStatsFromRuntime({ projectIds: rows.map((d) => d.projectId) }),
    getUsers(rows.map((d) => d.createdBy)),
  ]);
  const statsMap = new Map(stats.map((s) => [s.projectId, s]));
  const enhancedDeployments = await Promise.all(
    rows.map(async (deployment) => {
      const repository = await getRepository({ projectId: deployment.projectId });
      const project = await repository.readAndParseFile<ProjectSettings>({
        ref: deployment.projectRef,
        filepath: PROJECT_FILE_PATH,
        readBlobFromGitIfWorkingNotInitialized: true,
      });

      return {
        ...deployment.dataValues,
        project,
        stats: statsMap.get(deployment.projectId),
        createdByInfo: users[deployment.createdBy],
      };
    })
  );

  res.json({
    list: enhancedDeployments,
    totalCount: count,
  });
});

router.post('/', middlewares.session(), middlewares.auth(), async (req, res) => {
  const { did: userId } = req.user!;
  const { projectId, projectRef, access } = await deploymentSchema.validateAsync(req.body, {
    stripUnknown: true,
  });

  const project = await Project.findByPk(projectId, {
    rejectOnEmpty: new NotFoundError(`No such project ${projectId}`),
  });

  if (access === 'private') {
    checkUserAuth(req, res)({ userId: project.createdBy });
  }

  const deployment = await Deployment.create({
    projectId,
    projectRef,
    access,
    createdBy: userId,
    updatedBy: userId,
  });

  res.json(deployment);
});

router.get('/:deploymentId', middlewares.session(), async (req, res) => {
  const { deploymentId } = req.params;
  if (!deploymentId) throw new Error('Missing required param `deploymentId`');

  const { did: userId, role } = req.user! || {};

  const deployment = await Deployment.findOne({
    where: { id: deploymentId },
    include: [{ model: Category, as: 'categories', through: { attributes: [] } }],
  });

  if (!deployment) {
    res.status(404).json({ message: 'current agent application not published' });
    return;
  }

  if (deployment.access === 'private') {
    if (userId !== deployment.createdBy || !['admin', 'owner'].includes(role!)) {
      res.status(404).json({ message: 'Not Found' });
      return;
    }
  }

  const { projectId, projectRef } = deployment;
  const repo = await ProjectRepo.load({ projectId });
  const agent = await getEntryFromRepository({ projectId, ref: projectRef, working: true });

  if (!agent) {
    throw new NoSuchEntryAgentError('No such agent');
  }

  const [stats, user] = await Promise.all([
    getProjectStatsFromRuntime({ projectIds: [projectId] }),
    getUser(deployment.createdBy),
  ]);

  res.json({
    deployment,
    ...respondAgentFields({
      agent,
      identity: { aid: stringifyIdentity({ projectId, projectRef, agentId: agent.id }) },
      project: await repo.readAndParseFile({
        ref: projectRef,
        filepath: PROJECT_FILE_PATH,
        readBlobFromGitIfWorkingNotInitialized: true,
        rejectOnEmpty: true,
      }),
    }),
    config: {
      secrets: (await getAgentSecretInputs({ aid: stringifyIdentity({ projectId, projectRef, agentId: agent.id }) }))
        .secrets,
    },
    createdByInfo: user,
    stats: stats[0],
  });
});

router.patch('/:id', middlewares.session(), middlewares.auth(), async (req, res) => {
  const found = await Deployment.findByPk(req.params.id!);
  if (!found) {
    res.status(404).json({ message: 'deployment not found' });
    return;
  }

  checkUserAuth(req, res)({ userId: found.createdBy });

  const input = await updateSchema.validateAsync(req.body, { stripUnknown: true });
  const updated = await found.update(input, { where: { id: req.params.id! } });
  res.json(updated);
});

router.delete('/:id', middlewares.session(), middlewares.auth(), async (req, res) => {
  const { id } = await deploymentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const deployment = await Deployment.findByPk(id);
  if (!deployment) {
    res.status(404).json({ message: 'deployment not found' });
    return;
  }

  checkUserAuth(req, res)({ userId: deployment.createdBy });

  await Deployment.destroy({ where: { id } });
  res.json({});
});

export default router;

export const respondAgentFields = ({
  agent,
  identity,
  project,
}: {
  agent: Assistant;
  project: ProjectSettings;
  identity: {
    aid: string;
    working?: boolean;
  };
}): Agent => ({
  ...pick(agent, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy'),
  access: pick(agent.access, 'noLoginRequired'),
  outputVariables: (agent.outputVariables ?? []).filter((i) => !i.hidden),
  project: pick(
    project,
    'id',
    'name',
    'description',
    'createdBy',
    'createdAt',
    'updatedAt',
    'appearance',
    'iconVersion',
    'readme'
  ),

  identity: {
    ...parseIdentity(identity.aid, { rejectWhenError: true }),
    ...identity,
  },
});

const checkDeploymentSchema = Joi.object<{ deploymentId?: string }>({
  deploymentId: Joi.string().empty([null, '']).optional(),
});

export const checkDeployment = async (req: Request, res: Response, next: NextFunction) => {
  const { deploymentId } = await checkDeploymentSchema.validateAsync(req.body, { stripUnknown: true });

  if (deploymentId) {
    try {
      const deployment = await Deployment.findOne({ where: { id: deploymentId } });
      if (!deployment) {
        res.status(404).json({ message: 'No such deployment' });
        throw new NotFoundError('No such deployment');
      }

      if (deployment.access === 'private') {
        const { did: userId } = req.user!;
        checkUserAuth(req, res)({ userId });
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
};

export function adminDeploymentRouter(router: Router) {
  const updateSchema = Joi.object({
    categories: Joi.array().items(Joi.string()).optional(),
    orderIndex: Joi.number().integer().empty(null).optional(),
    productHuntUrl: Joi.string().allow('').empty([null, '']).optional(),
    productHuntBannerUrl: Joi.string().allow('').empty([null, '']).optional(),
  }).min(1);

  router.patch('/:id', middlewares.session(), ensurePromptsAdmin, async (req, res) => {
    const { did: userId } = req.user!;

    const found = await Deployment.findByPk(req.params.id!);
    if (!found) {
      res.status(404).json({ message: 'deployment not found' });
      return;
    }

    const { categories, productHuntUrl, productHuntBannerUrl, orderIndex } = await updateSchema.validateAsync(
      req.body,
      { stripUnknown: true }
    );

    const updated = await found.update(
      { productHuntUrl, productHuntBannerUrl, orderIndex },
      { where: { id: req.params.id! } }
    );

    if (categories) {
      await DeploymentCategory.destroy({ where: { deploymentId: req.params.id! } });

      if (categories.length) {
        await DeploymentCategory.bulkCreate(
          categories.map((categoryId: string) => ({
            deploymentId: req.params.id!,
            categoryId,
            createdBy: userId,
            updatedBy: userId,
          }))
        );
      }
    }

    res.json(updated);
  });

  return router;
}
