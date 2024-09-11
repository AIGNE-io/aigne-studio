import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import Deployment from '../store/models/deployment';
import DeploymentCategory from '../store/models/deployment-category';

const router = Router();

const schema = Joi.object({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
  agentId: Joi.string().required(),
  access: Joi.string().valid('private', 'public').required(),
});

const paginationSchema = Joi.object({
  projectId: Joi.string().required(),
  projectRef: Joi.string().required(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
});

router.get('/byId', user(), async (req, res) => {
  const schema = Joi.object({
    projectId: Joi.string().required(),
    projectRef: Joi.string().required(),
    agentId: Joi.string().required(),
  });
  const { projectId, projectRef, agentId } = await schema.validateAsync(req.query, { stripUnknown: true });

  const deployment = await Deployment.findOne({ where: { projectId, projectRef, agentId } });

  if (deployment) {
    const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
    deployment.categories = categories.map((category) => category.categoryId);
  }

  res.json({ deployment });
});

router.get('/', user(), async (req, res) => {
  try {
    const { projectId, projectRef, page, pageSize } = await paginationSchema.validateAsync(req.query, {
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
      deployments: await Promise.all(
        rows.map(async (deployment) => {
          const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
          return { ...deployment?.dataValues, categories: categories.map((category) => category.categoryId) };
        })
      ),
      totalCount: count,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    res.status(400).json({ code: 'bad_request', error: error.message });
  }
});

router.get('/list', user(), async (req, res) => {
  try {
    const { page, pageSize } = await Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(10),
    }).validateAsync(req.query, { stripUnknown: true });
    const offset = (page - 1) * pageSize;

    const { count, rows } = await Deployment.findAndCountAll({
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      deployments: await Promise.all(
        rows.map(async (deployment) => {
          const categories = await DeploymentCategory.findAll({ where: { deploymentId: deployment.id } });
          return { ...deployment.dataValues, categories: categories.map((category) => category.categoryId) };
        })
      ),
      totalCount: count,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    res.status(400).json({ code: 'bad_request', error: error.message });
  }
});

router.get('/categories/:categoryId', user(), async (req, res) => {
  const schema = Joi.object({
    categoryId: Joi.string().required(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(10),
  });
  const { categoryId, page, pageSize } = await schema.validateAsync(req.params, { stripUnknown: true });

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
    pageSize,
    totalPages: Math.ceil(count / pageSize),
  });
});

router.post('/', user(), async (req, res) => {
  const { did: userId, role } = req.user!;
  const { projectId, projectRef, agentId, access } = await schema.validateAsync(req.body, { stripUnknown: true });

  if (access === 'private') {
    const list = ['admin', 'owner'];

    if (!list.includes(role)) {
      res.status(403).json({
        code: 'forbidden',
        error: 'Only an administrator or owner can create a private publication.',
      });
      return;
    }
  }

  const found = await Deployment.findOne({ where: { projectId, projectRef, agentId } });

  if (found) {
    await found.update({ access, updatedBy: userId });
    res.json({ deployment: { ...found.dataValues, access, updatedBy: userId } });
    return;
  }

  const deployment = await Deployment.create({
    createdBy: userId,
    updatedBy: userId,
    projectId,
    projectRef,
    agentId,
    access,
  });

  res.json({ deployment });
});

router.get('/:id', user(), async (req, res) => {
  const schema = Joi.object({ id: Joi.string().required() });
  const { id } = await schema.validateAsync(req.params, { stripUnknown: true });

  const deployment = await Deployment.findOne({ where: { id } });
  const categories = await DeploymentCategory.findAll({ where: { deploymentId: id } });

  res.json({ ...deployment?.dataValues, categories: categories.map((category) => category.categoryId) });
});

router.put('/:id', user(), async (req, res) => {
  const schema = Joi.object({
    access: Joi.string().valid('private', 'public').required(),
    categories: Joi.array().items(Joi.string()).required(),
  });
  const { access, categories } = await schema.validateAsync(req.body, { stripUnknown: true });

  const deployment = await Deployment.update({ access }, { where: { id: req.params.id! } });

  if (categories.length) {
    await DeploymentCategory.destroy({ where: { deploymentId: req.params.id! } });
    await DeploymentCategory.bulkCreate(
      categories.map((categoryId: string) => ({ deploymentId: req.params.id!, categoryId }))
    );
  }

  res.json(deployment);
});

router.delete('/:id', user(), async (req, res) => {
  const schema = Joi.object({ id: Joi.string().required() });
  const { id } = await schema.validateAsync(req.params, { stripUnknown: true });

  const deployment = await Deployment.destroy({ where: { id } });
  res.json(deployment);
});

export default router;
