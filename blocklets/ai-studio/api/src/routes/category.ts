import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import checkUserAuth from '../libs/user-auth';
import Category from '../store/models/category';
import DeploymentCategory from '../store/models/deployment-category';

const router = Router();

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(10),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().required(),
  icon: Joi.string().optional().allow('').default(''),
});

router.get('/', async (req, res) => {
  const { page, pageSize } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });

  const offset = (page - 1) * pageSize;
  const { count, rows } = await Category.findAndCountAll({
    where: {},
    limit: pageSize,
    offset,
    order: [['createdAt', 'DESC']],
  });

  res.json({ list: rows, totalCount: count, currentPage: page });
});

router.post('/', user(), auth(), async (req, res) => {
  const { did } = req.user!;
  const { name, icon } = await updateCategorySchema.validateAsync(req.body, { stripUnknown: true });

  checkUserAuth(req, res)(did);

  const category = await Category.create({
    name,
    icon,
    createdBy: did,
    updatedBy: did,
  });

  res.json(category);
});

router.put('/:id', user(), auth(), async (req, res) => {
  const { did } = req.user!;
  const { id } = req.params;
  const { name, icon } = await updateCategorySchema.validateAsync(req.body, { stripUnknown: true });

  const category = await Category.findByPk(id);
  if (!category) {
    res.status(404).json({ code: 'not_found', error: 'Category not found' });
    return;
  }

  checkUserAuth(req, res)(category.createdBy);

  await category.update({ name, icon, updatedBy: did });

  res.json(category);
});

router.delete('/:id', user(), auth(), async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    res.status(404).json({ code: 'not_found', error: 'Category not found' });
    return;
  }

  checkUserAuth(req, res)(category.createdBy);

  await Category.destroy({ where: { id } });
  await DeploymentCategory.destroy({ where: { categoryId: id } });

  res.json({});
});

export default router;
