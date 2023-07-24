import { join } from 'path';

import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { uniqBy } from 'lodash';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { getRepository } from '../store/projects';
import { getTemplate } from '../store/templates';

export function templateTagRoutes(router: Router) {
  const getTagsQuerySchema = Joi.object<{ projectId: string; search?: string; type?: 'image' }>({
    projectId: Joi.string(),
    search: Joi.string().empty(''),
    type: Joi.string().valid('image').empty(''),
  });

  router.get('/tags', ensureComponentCallOrAdmin(), async (req: Request, res: Response) => {
    const { projectId, search, type } = await getTagsQuerySchema.validateAsync(req.query, { stripUnknown: true });
    const repository = getRepository(projectId);

    let tags = uniqBy(
      (
        await Promise.all(
          (await repository.getFiles())
            .filter((i): i is typeof i & { type: 'file' } => i.type === 'file')
            .map((i) =>
              getTemplate({ repository, path: join(...i.parent, i.name) }).then((template) =>
                template.tags?.map((tag) => ({ tag, type: template.type }))
              )
            )
        )
      ).flatMap((i) => i ?? []),
      'tag'
    );

    if (search) {
      const regex = new RegExp(search, 'i');
      tags = tags.filter((i) => regex.test(i.tag));
    }

    if (type) {
      tags = tags.filter((i) => i.type === type);
    }

    res.json({ tags: tags.map((i) => ({ name: i.tag })) });
  });
}
