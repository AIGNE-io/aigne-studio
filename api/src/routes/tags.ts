import { Request, Response, Router } from 'express';
import Joi from 'joi';

import { ensureAdmin } from '../libs/security';
import { templates } from '../store/templates';

const router = Router();

const paginationSchema = Joi.object<{ offset: number; limit: number; sort?: string; search?: string; type?: 'image' }>({
  search: Joi.string().empty(''),
  type: Joi.string().valid('image').empty(''),
});

export async function getTags(req: Request, res: Response) {
  const { search, type } = await paginationSchema.validateAsync(req.query, { stripUnknown: true });

  const filter = type ? { type } : undefined;
  const list = await templates.cursor(filter).projection({ tags: 1 }).exec();
  let tags = [...new Set(list.flatMap<string>((i) => i.tags ?? []))];
  if (search) {
    const regex = new RegExp(search, 'i');
    tags = tags.filter((i) => regex.test(i));
  }

  res.json({ tags: tags.map((name) => ({ name })) });
}

router.get('/', ensureAdmin, getTags);

export default router;
