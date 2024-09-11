import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import Category from '../store/models/category';
import DeploymentCategory from '../store/models/deployment-category';

const router = Router();

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(1000).default(10),
});

router.get('/', user(), async (req, res) => {
  try {
    const { page, pageSize } = await paginationSchema.validateAsync(req.query, {
      stripUnknown: true,
    });

    const offset = (page - 1) * pageSize;

    const { count, rows } = await Category.findAndCountAll({
      where: {},
      limit: pageSize,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      list: rows,
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
  const { name, icon } = await Joi.object({
    name: Joi.string().required(),
    icon: Joi.string().optional().allow('').default('tabler:settings'),
  }).validateAsync(req.body, { stripUnknown: true });

  const category = await Category.create({
    name,
    icon,
  });

  res.json({ category });
});

router.put('/:id', user(), async (req, res) => {
  const { id } = req.params;
  const { name, icon } = await Joi.object({
    name: Joi.string().required(),
    icon: Joi.string().optional().allow('').default('tabler:settings'),
  }).validateAsync(req.body, { stripUnknown: true });

  const category = await Category.findByPk(id);
  if (!category) {
    res.status(404).json({ code: 'not_found', error: 'Category not found' });
    return;
  }

  await category.update({ name, icon });

  res.json({ category });
});

router.delete('/:id', user(), async (req, res) => {
  const { id } = req.params;

  const category = await Category.findByPk(id);
  if (!category) {
    res.status(404).json({ code: 'not_found', error: 'Category not found' });
    return;
  }

  await category.destroy();
  await DeploymentCategory.destroy({ where: { categoryId: id } });

  res.json({ category });
});

export default router;
