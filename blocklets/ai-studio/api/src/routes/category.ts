import { generateSlug } from '@api/libs/utils';
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

const updateCategorySchema = Joi.object<{
  name: string;
  icon: string;
  slug: string;
  orderIndex?: number;
}>({
  name: Joi.string().required(),
  icon: Joi.string().optional().allow('').default(''),
  slug: Joi.string().optional().allow('').default('').optional(),
  orderIndex: Joi.number().integer().empty(null).optional(),
});

router.get('/', async (req, res) => {
  const { page, pageSize } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });

  const offset = (page - 1) * pageSize;
  const { count, rows } = await Category.findAndCountAll({
    where: {},
    limit: pageSize,
    offset,
    order: [
      ['orderIndex', 'ASC'],
      ['id', 'DESC'],
    ],
  });

  res.json({ list: rows, totalCount: count });
});

router.post('/', user(), auth(), async (req, res) => {
  const { did } = req.user!;
  const { name, icon, slug, orderIndex } = await updateCategorySchema.validateAsync(req.body, { stripUnknown: true });

  checkUserAuth(req, res)(did);

  const currentSlug = slug || generateSlug(name);

  const newCategory = await Category.create({
    name,
    icon,
    slug: currentSlug,
    orderIndex,
    createdBy: did,
    updatedBy: did,
  });

  res.json(newCategory);
});

router.put('/:id', user(), auth(), async (req, res) => {
  const { did } = req.user!;
  const { id } = req.params;
  const { name, icon, slug, orderIndex } = await updateCategorySchema.validateAsync(req.body, { stripUnknown: true });

  const category = await Category.findByPk(id);
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  const currentSlug = slug || generateSlug(name);

  checkUserAuth(req, res)(category.createdBy);

  await category.update({ name, icon, slug: currentSlug, updatedBy: did, orderIndex });
  res.json(category);
});

router.delete('/:id', user(), auth(), async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    res.status(404).json({ message: 'Category not found' });
    return;
  }

  checkUserAuth(req, res)(category.createdBy);

  await Category.destroy({ where: { id } });
  await DeploymentCategory.destroy({ where: { categoryId: id } });

  res.json({});
});

export default router;
