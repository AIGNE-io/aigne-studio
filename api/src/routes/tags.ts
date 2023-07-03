import { Request, Response, Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAdmin } from '../libs/security';
import Templates from '../store/time-machine';

const router = Router();

const getTagsQuerySchema = Joi.object<{ search?: string; type?: 'image' }>({
  search: Joi.string().empty(''),
  type: Joi.string().valid('image').empty(''),
});

router.get('/', ensureComponentCallOrAdmin(), async (req: Request, res: Response) => {
  const { search, type } = await getTagsQuerySchema.validateAsync(req.query, { stripUnknown: true });

  let tags = (await Templates.root.getTemplates())
    .flatMap((i) => i.files)
    .flatMap((i) => i.tags?.map((tag) => ({ type: i.type, tag })) ?? []);

  if (search) {
    const regex = new RegExp(search, 'i');
    tags = tags.filter((i) => regex.test(i.tag));
  }

  if (type) {
    tags = tags.filter((i) => i.type === type);
  }

  res.json({ tags: tags.map((i) => ({ name: i.tag })) });
});

export default router;
