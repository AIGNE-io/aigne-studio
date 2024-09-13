import { getAssistantsOfRepository } from '@api/store/repository';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { Op } from 'sequelize';

import checkUserAuth from '../libs/user-auth';
import Deployment from '../store/models/deployment';
import DeploymentCategory from '../store/models/deployment-category';

const router = Router();

const deploymentSchema = Joi.object({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
  agentId: Joi.string().required(),
  access: Joi.string().valid('private', 'public').required(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
});

const searchProjectSchema = paginationSchema.concat(
  Joi.object({
    projectId: Joi.string().required(),
    projectRef: Joi.string().required(),
  })
);

const searchByCategoryIdSchema = paginationSchema.concat(
  Joi.object({
    categoryId: Joi.string().required(),
  })
);

const recommendSchema = paginationSchema.concat(
  Joi.object({
    categoryId: Joi.string().optional(),
  })
);

const updateSchema = Joi.object({
  access: Joi.string().valid('private', 'public').required(),
  categories: Joi.array().items(Joi.string()).optional(),
  banner: Joi.string().allow('').empty(['', null]).optional(),
});

const getByIdSchema = Joi.object({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
  agentId: Joi.string().required(),
});

const deploymentIdSchema = Joi.object({ id: Joi.string().required() });

router.get('/byAgentId', user(), auth(), async (req, res) => {
  const { projectId, projectRef, agentId } = await getByIdSchema.validateAsync(req.query, { stripUnknown: true });
  const deployment = await Deployment.findOne({ where: { projectId, projectRef, agentId } });

  if (deployment) {
    const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
    deployment.categories = categories.map((category) => category.categoryId);
  }

  res.json(deployment ? { ...deployment?.dataValues, categories: deployment?.categories } : null);
});

router.get('/', user(), auth(), async (req, res) => {
  const { projectId, projectRef, page, pageSize } = await searchProjectSchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const offset = (page - 1) * pageSize;

  const { count, rows } = await Deployment.findAndCountAll({
    where: { projectId, projectRef },
    limit: pageSize,
    offset,
    order: [['createdAt', 'DESC']],
  });

  res.json({
    list: await Promise.all(
      rows.map(async (deployment) => {
        const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
        return { ...deployment?.dataValues, categories: categories.map((category) => category.categoryId) };
      })
    ),
    totalCount: count,
    currentPage: page,
  });
});

const getAgent = async (projectId: string, projectRef: string, agentId: string) => {
  const agents = await getAssistantsOfRepository({
    projectId,
    ref: projectRef,
    working: true,
  });

  return agents.find((agent) => agent.id === agentId);
};

router.get('/list', user(), auth(), async (req, res) => {
  const { page, pageSize } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });
  const offset = (page - 1) * pageSize;

  const { count, rows } = await Deployment.findAndCountAll({
    limit: pageSize,
    offset,
    order: [['createdAt', 'DESC']],
  });

  res.json({
    list: await Promise.all(
      rows.map(async (deployment) => {
        const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
        return { ...deployment.dataValues, categories: categories.map((category) => category.categoryId) };
      })
    ),
    totalCount: count,
    currentPage: page,
  });
});

router.get('/recommend-list', user(), auth(), async (req, res) => {
  const { page, pageSize, categoryId } = await recommendSchema.validateAsync(req.query, { stripUnknown: true });
  const offset = (page - 1) * pageSize;

  if (categoryId) {
    const rows = await DeploymentCategory.findAll({
      where: { categoryId },
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const ids = rows.map((item) => item.deploymentId);
    const deployments = await Deployment.findAll({ where: { id: { [Op.in]: ids } } });

    return res.json({
      list: await Promise.all(
        deployments.map(async (deployment) => {
          const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
          return {
            ...deployment.dataValues,
            agent: await getAgent(deployment.projectId, deployment.projectRef, deployment.agentId),
            categories: categories.map((category) => category.categoryId),
          };
        })
      ),
      totalCount: deployments.length,
      currentPage: page,
    });
  }

  const { count, rows } = await Deployment.findAndCountAll({
    limit: pageSize,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return res.json({
    list: await Promise.all(
      rows.map(async (deployment) => {
        const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
        return {
          ...deployment.dataValues,
          agent: await getAgent(deployment.projectId, deployment.projectRef, deployment.agentId).catch(() => null),
          categories: categories.map((category) => category.categoryId),
        };
      })
    ),
    totalCount: count,
    currentPage: page,
  });
});

router.get('/categories/:categoryId', user(), auth(), async (req, res) => {
  const { categoryId, page, pageSize } = await searchByCategoryIdSchema.validateAsync(req.params, {
    stripUnknown: true,
  });

  const offset = (page - 1) * pageSize;

  const { count, rows } = await DeploymentCategory.findAndCountAll({
    where: { categoryId },
    limit: pageSize,
    offset,
    order: [['createdAt', 'DESC']],
  });

  res.json({
    list: (
      await Promise.all(
        rows.map(async (item) => {
          const deployment = await Deployment.findOne({ where: { id: item.deploymentId } });
          return deployment;
        })
      )
    ).filter((deployment) => deployment !== null),
    totalCount: count,
    currentPage: page,
  });
});

router.post('/', user(), auth(), async (req, res) => {
  const { did: userId } = req.user!;
  const { projectId, projectRef, agentId, access } = await deploymentSchema.validateAsync(req.body, {
    stripUnknown: true,
  });

  if (access === 'private') {
    checkUserAuth(req, res)();
  }

  let deployment = await Deployment.findOne({
    where: { projectId, projectRef, agentId },
  });

  if (deployment) {
    deployment = await deployment.update({
      access,
      updatedBy: userId,
    });
  } else {
    deployment = await Deployment.create({
      projectId,
      projectRef,
      agentId,
      access,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  res.json(deployment.dataValues);
});

router.get('/:id', user(), auth(), async (req, res) => {
  const { id } = await deploymentIdSchema.validateAsync(req.params, { stripUnknown: true });

  const deployment = await Deployment.findOne({ where: { id } });
  const categories = await DeploymentCategory.findAll({ where: { deploymentId: id } });

  res.json(
    deployment ? { ...deployment?.dataValues, categories: categories.map((category) => category.categoryId) } : null
  );
});

router.put('/:id', user(), auth(), async (req, res) => {
  const { did: userId } = req.user!;

  const found = await Deployment.findByPk(req.params.id!);
  if (!found) {
    res.status(404).json({ code: 'not_found', error: 'deployment not found' });
    return;
  }

  checkUserAuth(req, res)(found.createdBy);

  const { access, categories, banner } = await updateSchema.validateAsync(req.body, { stripUnknown: true });
  const value = {
    access,
    ...(banner ? { banner } : {}),
  };
  const deployment = await Deployment.update(value, { where: { id: req.params.id! } });

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

  res.json(deployment);
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
