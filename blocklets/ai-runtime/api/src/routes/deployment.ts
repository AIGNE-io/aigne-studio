import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import Deployment from '../store/models/deployment';

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
      deployments: rows,
      totalCount: count,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    res.status(400).json({ code: 'bad_request', error: error.message });
  }
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
    const result = await found.update({ access, updatedBy: userId });

    res.json({ deployment: result });
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
  res.json({ deployment });
});

router.put('/:id', user(), async (req, res) => {
  const schema = Joi.object({ access: Joi.string().valid('private', 'public').required() });
  const { access } = await schema.validateAsync(req.body, { stripUnknown: true });

  const deployment = await Deployment.update({ access }, { where: { id: req.params.id! } });
  res.json({ deployment });
});

export default router;
