import { getAgentSecretInputs } from '@api/libs/runtime';
import { PROJECT_FILE_PATH, ProjectRepo, getEntryFromRepository, getRepository } from '@api/store/repository';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { Assistant, ProjectSettings } from '@blocklet/ai-runtime/types';
import { Agent } from '@blocklet/aigne-sdk/api/agent';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { NextFunction, Request, Response, Router } from 'express';
import Joi from 'joi';
import pick from 'lodash/pick';

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

const searchByCategoryIdSchema = Joi.object({
  categoryId: Joi.string().required(),
});

const recommendSchema = paginationSchema.concat(
  Joi.object({
    categoryId: Joi.string().optional(),
    access: Joi.string().valid('private', 'public').optional(),
  })
);

const updateSchema = Joi.object({
  access: Joi.string().valid('private', 'public').required(),
  categories: Joi.array().items(Joi.string()).optional(),
  productHuntUrl: Joi.string().allow('').empty([null, '']).optional(),
  productHuntBannerUrl: Joi.string().allow('').empty([null, '']).optional(),
});

const getByIdSchema = Joi.object({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
});

const deploymentIdSchema = Joi.object({ id: Joi.string().required() });

router.get('/byProjectId', user(), auth(), async (req, res) => {
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

router.get('/', async (req, res) => {
  const { page, pageSize } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });
  const offset = (page - 1) * pageSize;

  const { count, rows } = await Deployment.findAndCountAll({
    limit: pageSize,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: Category,
        as: 'categories',
        through: { attributes: [] },
        attributes: ['id', 'name'],
        required: false,
      },
    ],
    distinct: true,
  });

  res.json({
    list: rows,
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
    ],
    limit: pageSize,
    offset,
    order: [['updatedAt', 'DESC']],
    distinct: true,
  };

  if (access) {
    query.where = { access };
  }

  if (categoryId) {
    query.include[0].where = { id: categoryId };
  }

  const { count, rows } = await Deployment.findAndCountAll(query);

  const enhancedDeployments = await Promise.all(
    rows.map(async (deployment) => {
      const repository = await getRepository({ projectId: deployment.projectId });
      const working = await repository.working({ ref: deployment.projectRef });
      const projectSetting = working.syncedStore.files[PROJECT_FILE_PATH] as ProjectSettings | undefined;

      return {
        ...deployment.get({ plain: true }),
        project: projectSetting,
      };
    })
  );

  res.json({
    list: enhancedDeployments,
    totalCount: count,
  });
});

router.get('/categories/:categoryId', async (req, res) => {
  const { categoryId } = await searchByCategoryIdSchema.validateAsync(req.params, { stripUnknown: true });
  const { page, pageSize } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });

  const offset = (page - 1) * pageSize;

  const { count, rows } = await Deployment.findAndCountAll({
    include: [
      {
        model: Category,
        as: 'categories',
        where: { id: categoryId },
        through: { attributes: [] },
      },
    ],
    limit: pageSize,
    offset,
    order: [['createdAt', 'DESC']],
    distinct: true,
  });

  res.json({
    list: rows,
    totalCount: count,
  });
});

router.post('/', user(), auth(), async (req, res) => {
  const { did: userId } = req.user!;
  const { projectId, projectRef, access } = await deploymentSchema.validateAsync(req.body, {
    stripUnknown: true,
  });

  if (access === 'private') {
    checkUserAuth(req, res)(userId);
  }

  const deployment = await Deployment.create({ projectId, projectRef, access, createdBy: userId, updatedBy: userId });
  res.json(deployment);
});

router.get('/:deploymentId', user(), async (req, res) => {
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
    if (userId !== deployment.createdBy || !['admin', 'owner'].includes(role)) {
      res.status(404).json({ message: 'Not Found' });
      return;
    }
  }

  const { projectId, projectRef } = deployment;
  const repo = await ProjectRepo.load({ projectId });
  const agent = await getEntryFromRepository({ projectId, ref: projectRef, working: true });

  if (!agent) {
    res.status(404).json({ message: 'No such agent' });
    return;
  }

  res.json({
    deployment,
    ...respondAgentFields({
      ...agent,
      identity: { projectId, projectRef, agentId: agent.id },
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
  });
});

router.put('/:id', user(), auth(), async (req, res) => {
  const { did: userId } = req.user!;

  const found = await Deployment.findByPk(req.params.id!);
  if (!found) {
    res.status(404).json({ code: 'not_found', error: 'deployment not found' });
    return;
  }

  checkUserAuth(req, res)(found.createdBy);

  const { access, categories, productHuntUrl, productHuntBannerUrl } = await updateSchema.validateAsync(req.body, {
    stripUnknown: true,
  });

  await Deployment.update({ access, productHuntUrl, productHuntBannerUrl }, { where: { id: req.params.id! } });

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

  res.json(await Deployment.findByPk(req.params.id!));
});

router.delete('/:id', user(), auth(), async (req, res) => {
  const { id } = await deploymentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const deployment = await Deployment.findByPk(id);
  if (!deployment) {
    res.status(404).json({ code: 'not_found', error: 'deployment not found' });
    return;
  }

  checkUserAuth(req, res)(deployment.createdBy);

  await Deployment.destroy({ where: { id } });
  res.json({});
});

export default router;

export const respondAgentFields = (
  agent: Assistant & {
    identity: Omit<Agent['identity'], 'aid'>;
    project: ProjectSettings;
  }
): Agent => ({
  ...pick(agent, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt', 'createdBy', 'identity'),
  access: pick(agent.access, 'noLoginRequired'),
  outputVariables: (agent.outputVariables ?? []).filter((i) => !i.hidden),
  project: pick(
    agent.project,
    'id',
    'name',
    'description',
    'createdBy',
    'createdAt',
    'updatedAt',
    'appearance',
    'iconVersion'
  ),
  identity: {
    ...agent.identity,
    aid: stringifyIdentity(agent.identity),
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
        res.status(404).json({ error: 'No such deployment' });
        throw new Error('No such deployment');
      }

      if (deployment.access === 'private') {
        const { did: userId } = req.user!;
        checkUserAuth(req, res)(userId);
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
};
