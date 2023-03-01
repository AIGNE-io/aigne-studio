import { Request, Response, Router } from 'express';
import Joi from 'joi';

import { ensureAdmin } from '../libs/security';
import { tags } from '../store/tags';

const router = Router();

const paginationSchema = Joi.object<{ offset: number; limit: number; sort?: string; search?: string }>({
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().empty(''),
});

export async function getTags(req: Request, res: Response) {
  const { offset, limit, ...query } = await paginationSchema.validateAsync(req.query);
  const regex = query.search ? new RegExp(query.search, 'i') : undefined;
  const filter = regex ? { $or: [{ name: { $regex: regex } }, { description: { $regex: regex } }] } : undefined;

  const list = await tags.cursor(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).exec();

  res.json({ tags: list });
}

router.get('/', ensureAdmin, getTags);

export default router;
