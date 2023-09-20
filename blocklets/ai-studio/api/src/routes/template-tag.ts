import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { uniqBy } from 'lodash';

import { ensureComponentCallOrPromptsEditor } from '../libs/security';
import { defaultBranch, getTemplatesFromRepository } from '../store/projects';

export function templateTagRoutes(router: Router) {
  const getTagsQuerySchema = Joi.object<{ projectId: string; search?: string; type?: 'image' }>({
    projectId: Joi.string(),
    search: Joi.string().empty(''),
    type: Joi.string().valid('image').empty(''),
  });

  router.get('/tags', ensureComponentCallOrPromptsEditor(), async (req: Request, res: Response) => {
    const { projectId, search, type } = await getTagsQuerySchema.validateAsync(req.query, { stripUnknown: true });

    let tags = uniqBy(
      (await getTemplatesFromRepository({ projectId, ref: defaultBranch }))
        .map((i) => i.tags?.map((tag) => ({ tag, type: i.type })))
        .flatMap((i) => i ?? []),
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
