import { join } from 'path';

import { Request, Response, Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { defaultRepository, getTemplate } from '../store/templates';

const router = Router();

const getTagsQuerySchema = Joi.object<{ search?: string; type?: 'image' }>({
  search: Joi.string().empty(''),
  type: Joi.string().valid('image').empty(''),
});

router.get('/', ensureComponentCallOrAdmin(), async (req: Request, res: Response) => {
  const { search, type } = await getTagsQuerySchema.validateAsync(req.query, { stripUnknown: true });

  let tags = (
    await Promise.all(
      (await defaultRepository.getFiles())
        .filter((i): i is typeof i & { type: 'file' } => i.type === 'file')
        .map((i) =>
          getTemplate({ path: join(...i.parent, i.name) }).then((template) =>
            template.tags?.map((tag) => ({ tag, type: template.type }))
          )
        )
    )
  ).flatMap((i) => i ?? []);

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
